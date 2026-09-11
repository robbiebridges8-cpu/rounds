/**
 * Finds a front photo for each pub on Wikimedia Commons and stores a resized
 * copy in the `pub-photos` bucket with its credit.
 *
 *   pnpm seed:photos              # every pub without a photo
 *   pnpm seed:photos --limit 50   # a taste
 *   pnpm seed:photos --dry        # match, print, store nothing
 *
 * Idempotent: pubs that already have a pub_photos row are skipped. Matches are
 * cached in scripts/data/commons-photos.json so a re-run after a crash does not
 * hit Commons again.
 *
 * Licence: only CC BY, CC BY-SA, CC0 and public domain files are taken. The
 * author, licence and file page are stored on the row and shown in the app.
 * See LICENSING.md.
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import 'dotenv/config';
import type { Database } from '../src/types/database';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(HERE, 'data');
const CACHE_FILE = join(CACHE_DIR, 'commons-photos.json');

const API = 'https://commons.wikimedia.org/w/api.php';
// Commons asks every client to identify itself. Keep this honest.
const USER_AGENT = 'Rounds/0.1 (https://github.com/robbiebridges8-cpu/rounds; pub front photos) node';

const GEO_RADIUS_M = 70;
const TEXT_RADIUS_M = 250;
const THUMB_WIDTH = 1280;
// Six is what Wikimedia tolerates from one client without 429s on the image downloads.
const CONCURRENCY = Number(process.env.SEED_CONCURRENCY ?? 6);

type Args = { limit: number; dry: boolean };

type Candidate = {
  title: string;
  pageUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  mime: string;
  author: string | null;
  licence: string;
  licenceUrl: string | null;
  description: string;
  distance: number | null;
  score: number;
};

type CacheEntry = { title: string; pageUrl: string } | { none: true };

function parseArgs(): Args {
  const limitIndex = process.argv.indexOf('--limit');
  return {
    limit: limitIndex === -1 ? Infinity : Number(process.argv[limitIndex + 1]),
    dry: process.argv.includes('--dry'),
  };
}

// --- text helpers ----------------------------------------------------------

const STOP = new Set(['the', 'pub', 'inn', 'tavern', 'bar', 'hotel', 'and', 'of', 'ye', 'olde', 'old', 'public', 'house']);

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return normalise(s)
    .split(' ')
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

const ALLOWED_LICENCE = /^(cc by(-sa)?( \d(\.\d)?)?|cc0|public domain|pd)/i;
const FORBIDDEN_LICENCE = /nc|nd|gfdl|fal|attribution only|no restrictions unknown/i;

function licenceAllowed(name: string): boolean {
  return ALLOWED_LICENCE.test(name.trim()) && !FORBIDDEN_LICENCE.test(name);
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

// --- Commons ---------------------------------------------------------------

async function commons(params: Record<string, string>): Promise<any> {
  const url = new URL(API);
  url.search = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', ...params }).toString();
  const res = await fetchWithBackoff(url.toString());
  return res.json();
}

/** Wikimedia answers 429 when it wants a breather. Wait, then try again. */
async function fetchWithBackoff(url: string): Promise<Response> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      await new Promise((r) => setTimeout(r, Math.max(retryAfter * 1000, 3000 * (attempt + 1))));
      continue;
    }
    throw new Error(`${res.status} for ${url}`);
  }
  throw new Error(`kept failing: ${url}`);
}

const IMAGEINFO = {
  prop: 'imageinfo|coordinates',
  iiprop: 'url|size|mime|extmetadata',
  iiurlwidth: String(THUMB_WIDTH),
  iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|ImageDescription|ObjectName',
};

type Page = {
  title: string;
  imageinfo?: {
    thumburl?: string;
    url: string;
    thumbwidth?: number;
    thumbheight?: number;
    width: number;
    height: number;
    mime: string;
    extmetadata?: Record<string, { value: string }>;
  }[];
  coordinates?: { lat: number; lon: number }[];
};

function toCandidate(page: Page, pub: { name: string; lat: number; lng: number }): Candidate | null {
  const info = page.imageinfo?.[0];
  if (!info) return null;
  if (info.mime !== 'image/jpeg' && info.mime !== 'image/png') return null;
  if (info.width < 640) return null;
  const em = info.extmetadata ?? {};
  const licence = em.LicenseShortName?.value ?? '';
  if (!licenceAllowed(licence)) return null;

  const coord = page.coordinates?.[0];
  const distance = coord ? haversine(pub.lat, pub.lng, coord.lat, coord.lon) : null;
  const title = page.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '');
  const description = stripHtml(em.ImageDescription?.value ?? '') + ' ' + stripHtml(em.ObjectName?.value ?? '');

  const name = normalise(pub.name);
  const nameTokens = tokens(pub.name);
  const titleN = normalise(title);
  const descN = normalise(description);
  const hitsIn = (hay: string) => nameTokens.filter((t) => hay.includes(t)).length;

  // A full-name hit in the title is trusted anywhere in the search radius. A
  // hit in the description, or a words-only hit, needs the camera to have
  // been close: "on The Grove" describes a street as often as a pub.
  const wholeName = (hay: string) => name.length > 0 && new RegExp(`(^|\\s)${name}(\\s|$)`).test(hay);
  let score = 0;
  if (wholeName(titleN)) score += 4;
  else if (wholeName(descN) && distance != null && distance <= 120) score += 3;
  else if (nameTokens.length > 0 && distance != null && distance <= 60) {
    const ratio = Math.max(hitsIn(titleN), hitsIn(descN)) / nameTokens.length;
    if (ratio < 1) return null; // every distinctive word must appear
    score += 2;
  } else {
    return null;
  }
  if (/\bpub\b|public house|tavern|inn\b/i.test(title + ' ' + description)) score += 0.5;
  if (/interior|inside|\bsign\b|plaque|bar counter|menu|beer|pint|toilet|ceiling|carpet|\bdoor\b|window|detail|lamp|mural|carving/i.test(titleN + ' ' + descN)) score -= 2;
  if (distance != null) score += distance < 40 ? 1 : distance < 120 ? 0.5 : distance > TEXT_RADIUS_M ? -3 : 0;
  // Landscape photos crop better into the hero.
  if (info.width > info.height) score += 0.5;

  return {
    title,
    pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    thumbUrl: (info.thumburl ?? info.url).split('?')[0],
    width: info.thumbwidth ?? info.width,
    height: info.thumbheight ?? info.height,
    mime: info.mime,
    author: em.Artist ? stripHtml(em.Artist.value).slice(0, 120) || null : null,
    licence: licence.trim(),
    licenceUrl: em.LicenseUrl?.value ?? null,
    description,
    distance,
    score,
  };
}

async function findCandidates(pub: { name: string; lat: number; lng: number; borough: string | null }): Promise<Candidate[]> {
  const near = await commons({
    generator: 'geosearch',
    ggscoord: `${pub.lat}|${pub.lng}`,
    ggsradius: String(GEO_RADIUS_M),
    ggsnamespace: '6',
    ggslimit: '50',
    ...IMAGEINFO,
  });
  const pages: Page[] = near.query?.pages ?? [];
  let candidates = pages.map((p) => toCandidate(p, pub)).filter((c): c is Candidate => c != null);
  if (candidates.length > 0) return candidates;

  // Nothing tagged nearby with the name. Try a text search, but only trust a
  // hit that either sits within 250 m or names the borough alongside the pub.
  const search = await commons({
    generator: 'search',
    gsrsearch: `"${pub.name}" London`,
    gsrnamespace: '6',
    gsrlimit: '10',
    ...IMAGEINFO,
  });
  const found: Page[] = search.query?.pages ?? [];
  candidates = found
    .map((p) => toCandidate(p, pub))
    .filter((c): c is Candidate => c != null)
    .filter((c) => {
      if (c.distance != null) return c.distance <= TEXT_RADIUS_M;
      const text = normalise(c.title + ' ' + c.description);
      return tokens(pub.name).length >= 2 && pub.borough != null && text.includes(normalise(pub.borough));
    });
  return candidates;
}

// --- main ------------------------------------------------------------------

async function main() {
  const args = parseArgs();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');

  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });

  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const cache: Record<string, CacheEntry> = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {};
  const saveCache = () => writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));

  const { data: done, error: doneError } = await supabase.from('pub_photos').select('pub_id');
  if (doneError) throw doneError;
  const have = new Set(done.map((d) => d.pub_id));

  const pubs: { id: string; name: string; lat: number; lng: number; borough: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('pubs').select('id, name, lat, lng, borough').order('id').range(from, from + 999);
    if (error) throw error;
    pubs.push(...data);
    if (data.length < 1000) break;
  }
  const todo = pubs.filter((p) => !have.has(p.id) && !(cache[p.id] && 'none' in cache[p.id])).slice(0, args.limit);
  console.log(`${pubs.length} pubs, ${have.size} already have a photo, ${todo.length} to try${args.dry ? ' (dry run)' : ''}`);

  let matched = 0;
  let stored = 0;
  let failed = 0;
  let index = 0;

  async function worker() {
    while (index < todo.length) {
      const pub = todo[index++];
      try {
        const candidates = await findCandidates(pub);
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];
        if (!best) {
          cache[pub.id] = { none: true };
          continue;
        }
        matched++;
        console.log(`  ${pub.name} (${pub.borough ?? '?'}) <- ${best.title} [${best.licence}${best.distance != null ? `, ${Math.round(best.distance)} m` : ''}] ${best.score.toFixed(1)}`);
        if (args.dry) continue;

        const res = await fetchWithBackoff(best.thumbUrl);
        const bytes = Buffer.from(await res.arrayBuffer());
        const path = `${pub.id}.jpg`;
        const upload = await supabase.storage.from('pub-photos').upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
        if (upload.error) throw upload.error;

        const { error } = await supabase.from('pub_photos').upsert(
          {
            pub_id: pub.id,
            storage_path: path,
            source: 'commons',
            source_url: best.pageUrl,
            source_title: best.title,
            author: best.author,
            licence: best.licence,
            licence_url: best.licenceUrl,
            width: best.width,
            height: best.height,
          },
          { onConflict: 'pub_id' },
        );
        if (error) throw error;
        cache[pub.id] = { title: best.title, pageUrl: best.pageUrl };
        stored++;
      } catch (e) {
        failed++;
        console.warn(`  ! ${pub.name}: ${(e as Error).message}`);
      }
      if ((matched + failed) % 25 === 0) saveCache();
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  saveCache();
  console.log(`\nmatched ${matched} of ${todo.length}, stored ${stored}, failed ${failed}. ${pubs.length - have.size - stored} pubs still without a photo.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
