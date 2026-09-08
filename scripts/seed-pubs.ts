/**
 * Seeds pubs_osm from OpenStreetMap and creates a public.pubs row for anything new.
 *
 *   pnpm seed:pubs --bbox london
 *   pnpm seed:pubs --bbox 51.28,-0.51,51.70,0.34
 *
 * Idempotent: re-running upserts OSM rows, adds pubs rows only for OSM ids we do
 * not have yet, and backfills any borough we could not work out last time.
 *
 * Licence: OSM data is ODbL. It lands in pubs_osm and stays there. See LICENSING.md.
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import 'dotenv/config';
import type { Database } from '../src/types/database';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, 'data');

// Overpass instances go down or rate-limit constantly. Try them in order.
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.osm.jp/api/interpreter',
];

// ONS Open Geography Portal, Local Authority Districts (December 2024), generalised
// and clipped to the coastline. E09 is the code range for the London boroughs.
const ONS_BOROUGHS =
  'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/' +
  'Local_Authority_Districts_December_2024_Boundaries_UK_BGC/FeatureServer/0/query' +
  "?where=LAD24CD%20LIKE%20'E09%25'&outFields=LAD24CD,LAD24NM&f=geojson&resultRecordCount=100";

type BBox = { south: number; west: number; north: number; east: number };

const NAMED_BBOXES: Record<string, BBox> = {
  london: { south: 51.2868, west: -0.5103, north: 51.6919, east: 0.334 },
  uk: { south: 49.85, west: -8.65, north: 60.9, east: 1.77 },
};

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type Ring = [number, number][];
type Borough = { name: string; polygons: Ring[][] };

function parseArgs(): BBox {
  const index = process.argv.indexOf('--bbox');
  const value = index === -1 ? 'london' : process.argv[index + 1];

  if (value in NAMED_BBOXES) return NAMED_BBOXES[value];

  const parts = value.split(',').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    throw new Error(`--bbox must be one of ${Object.keys(NAMED_BBOXES).join(', ')} or south,west,north,east`);
  }
  return { south: parts[0], west: parts[1], north: parts[2], east: parts[3] };
}

async function fetchOverpass(bbox: BBox): Promise<OverpassElement[]> {
  const area = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const query = `[out:json][timeout:300];
(
  node["amenity"="pub"](${area});
  way["amenity"="pub"](${area});
  relation["amenity"="pub"](${area});
);
out center tags;`;

  let lastError: unknown;
  for (const mirror of OVERPASS_MIRRORS) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        process.stdout.write(`  querying ${new URL(mirror).host} (attempt ${attempt})... `);
        const response = await fetch(mirror, {
          method: 'POST',
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(300_000),
        });
        const text = await response.text();
        if (!response.ok || !text.startsWith('{')) {
          throw new Error(`${response.status}: ${text.slice(0, 120).replace(/\s+/g, ' ')}`);
        }
        const parsed = JSON.parse(text) as { elements: OverpassElement[] };
        console.log(`${parsed.elements.length} elements`);
        return parsed.elements;
      } catch (error) {
        console.log('failed');
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
      }
    }
  }
  throw new Error(`every Overpass mirror failed: ${String(lastError)}`);
}

async function loadBoroughs(): Promise<Borough[]> {
  mkdirSync(CACHE, { recursive: true });
  const path = join(CACHE, 'london-boroughs.geojson');

  if (!existsSync(path)) {
    console.log('  downloading borough boundaries from ONS Open Geography Portal');
    const response = await fetch(ONS_BOROUGHS, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`ONS boundaries: ${response.status}`);
    writeFileSync(path, await response.text());
  }

  const collection = JSON.parse(readFileSync(path, 'utf8')) as {
    features: {
      properties: { LAD24NM: string };
      geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
    }[];
  };

  return collection.features.map((feature) => ({
    name: feature.properties.LAD24NM,
    polygons: (feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates as number[][][]]
      : (feature.geometry.coordinates as number[][][][])) as Ring[][],
  }));
}

/** Ray casting. Rings after the first are holes. */
function inRing(ring: Ring, lng: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function boroughFor(boroughs: Borough[], lng: number, lat: number): string | null {
  for (const borough of boroughs) {
    for (const polygon of borough.polygons) {
      if (inRing(polygon[0], lng, lat) && !polygon.slice(1).some((hole) => inRing(hole, lng, lat))) {
        return borough.name;
      }
    }
  }
  return null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function addressOf(tags: Record<string, string>): string | null {
  const line = [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:city'],
    tags['addr:postcode'],
  ]
    .filter(Boolean)
    .join(', ');
  return line || null;
}

async function main() {
  const bbox = parseArgs();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  }

  const supabase = createClient<Database>(url, serviceKey, { auth: { persistSession: false } });

  console.log(`\nRounds pub seed  bbox ${bbox.south},${bbox.west},${bbox.north},${bbox.east}\n`);

  const elements = await fetchOverpass(bbox);
  const boroughs = await loadBoroughs();
  console.log(`  ${boroughs.length} borough boundaries loaded\n`);

  let unnamed = 0;
  const osmRows = elements.flatMap((element) => {
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    const tags = element.tags ?? {};
    if (lat === undefined || lng === undefined) return [];
    // A pub with no name is not something we can put on a map.
    if (!tags.name) {
      unnamed += 1;
      return [];
    }
    return [
      {
        osm_type: element.type,
        osm_id: element.id,
        name: tags.name,
        lat,
        lng,
        addr_housenumber: tags['addr:housenumber'] ?? null,
        addr_street: tags['addr:street'] ?? null,
        addr_city: tags['addr:city'] ?? null,
        addr_postcode: tags['addr:postcode'] ?? null,
        opening_hours: tags.opening_hours ?? null,
        website: tags.website ?? tags['contact:website'] ?? null,
        tags,
        imported_at: new Date().toISOString(),
      },
    ];
  });

  for (const batch of chunk(osmRows, 500)) {
    const { error } = await supabase
      .from('pubs_osm')
      .upsert(batch, { onConflict: 'osm_type,osm_id' });
    if (error) throw error;
    process.stdout.write(`\r  pubs_osm upserted: ${batch.length} of ${osmRows.length}`);
  }
  console.log(`\r  pubs_osm upserted: ${osmRows.length}${' '.repeat(20)}`);

  // Which OSM pubs already have one of our own rows?
  const existing = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('pubs')
      .select('osm_type,osm_id')
      .not('osm_id', 'is', null)
      .range(from, from + 999);
    if (error) throw error;
    data.forEach((row) => existing.add(`${row.osm_type}/${row.osm_id}`));
    if (data.length < 1000) break;
  }

  const newPubs = osmRows
    .filter((row) => !existing.has(`${row.osm_type}/${row.osm_id}`))
    .map((row) => ({
      osm_type: row.osm_type,
      osm_id: row.osm_id,
      name: row.name,
      lat: row.lat,
      lng: row.lng,
      address: addressOf(row.tags),
      borough: boroughFor(boroughs, row.lng, row.lat),
      status: 'unverified' as const,
    }));

  for (const batch of chunk(newPubs, 500)) {
    const { error } = await supabase.from('pubs').insert(batch);
    if (error) throw error;
    process.stdout.write(`\r  pubs created: ${batch.length} of ${newPubs.length}`);
  }
  console.log(`\r  pubs created: ${newPubs.length}${' '.repeat(20)}`);

  // Backfill boroughs we could not resolve on an earlier run.
  const { data: missingBorough, error: missingError } = await supabase
    .from('pubs')
    .select('id,lat,lng')
    .is('borough', null);
  if (missingError) throw missingError;

  let backfilled = 0;
  for (const pub of missingBorough) {
    const borough = boroughFor(boroughs, pub.lng, pub.lat);
    if (!borough) continue;
    const { error } = await supabase.from('pubs').update({ borough }).eq('id', pub.id);
    if (error) throw error;
    backfilled += 1;
  }

  const { count } = await supabase.from('pubs').select('*', { count: 'exact', head: true });

  console.log(`  boroughs backfilled: ${backfilled}`);
  console.log(`  skipped, no name in OSM: ${unnamed}`);
  console.log(`\n  total pubs in database: ${count}\n`);
}

main().catch((error) => {
  console.error('\nseed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
