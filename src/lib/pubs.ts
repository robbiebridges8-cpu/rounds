import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Coords } from '@/lib/location';
import { photoUrl } from '@/lib/checkins';
import { supabase } from '@/lib/supabase';
import type { FnReturns, Tables } from '@/types/database';

export type Pub = Tables<'pubs'>;
export type PubStats = Tables<'pub_stats'>;
export type PubTag = Tables<'pub_tags'>;
export type PubTagStat = Tables<'pub_tag_stats'>;
export type MapPub = FnReturns<'map_pubs'>[number];
export type NearbyPub = FnReturns<'nearby_pubs'>[number];

export type Bounds = { minLat: number; minLng: number; maxLat: number; maxLng: number };

export type Visit = Tables<'checkins'> & {
  profiles: Tables<'profiles'> | null;
  checkin_photos: Tables<'checkin_photos'>[];
};

/** Three decimal places is ~100 m: enough to skip refetches for tiny nudges. */
const roundBounds = (b: Bounds) =>
  [b.minLat, b.minLng, b.maxLat, b.maxLng].map((n) => Math.round(n * 1000) / 1000);

export function useMapPubs(bounds: Bounds | null, activeOnly = false) {
  return useQuery({
    queryKey: ['map-pubs', bounds ? roundBounds(bounds) : null, activeOnly],
    enabled: Boolean(bounds),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('map_pubs', {
        min_lat: bounds!.minLat,
        min_lng: bounds!.minLng,
        max_lat: bounds!.maxLat,
        max_lng: bounds!.maxLng,
        max_rows: 400,
        only_active: activeOnly,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useNearbyPubs(coords: Coords | null, radius = 1500) {
  return useQuery({
    queryKey: ['nearby-pubs', coords, radius],
    enabled: Boolean(coords),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('nearby_pubs', {
        in_lat: coords!.latitude,
        in_lng: coords!.longitude,
        radius_m: radius,
        max_rows: 50,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function usePub(id: string | undefined) {
  return useQuery({
    queryKey: ['pub', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const [pub, stats] = await Promise.all([
        supabase.from('pubs').select('*').eq('id', id!).single(),
        supabase.from('pub_stats').select('*').eq('pub_id', id!).maybeSingle(),
      ]);
      if (pub.error) throw pub.error;
      if (stats.error) throw stats.error;
      return { pub: pub.data, stats: stats.data };
    },
  });
}

/** Fixed vocabulary, so cache it for the life of the app. */
export function usePubTags() {
  return useQuery({
    queryKey: ['pub-tags'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from('pub_tags').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function usePubTagStats(pubId: string | undefined) {
  return useQuery({
    queryKey: ['pub-tag-stats', pubId],
    enabled: Boolean(pubId),
    queryFn: async () => {
      const { data, error } = await supabase.from('pub_tag_stats').select('*').eq('pub_id', pubId!);
      if (error) throw error;
      return data;
    },
  });
}

/** RLS only returns your own votes, so no user filter is needed. */
export function useMyTagVotes(pubId: string | undefined) {
  return useQuery({
    queryKey: ['my-tag-votes', pubId],
    enabled: Boolean(pubId),
    queryFn: async () => {
      const { data, error } = await supabase.from('pub_tag_votes').select('*').eq('pub_id', pubId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useVoteTag(pubId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tag, value }: { tag: string; value: 1 | -1 | 0 }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session!.user.id;

      if (value === 0) {
        const { error } = await supabase
          .from('pub_tag_votes')
          .delete()
          .match({ user_id: userId, pub_id: pubId, tag });
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from('pub_tag_votes')
        .upsert(
          { user_id: userId, pub_id: pubId, tag, value, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,pub_id,tag' }
        );
      if (error) throw error;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['pub-tag-stats', pubId] });
      void queryClient.invalidateQueries({ queryKey: ['my-tag-votes', pubId] });
    },
  });
}

/** Your check-ins and your friends'. Anyone else's never leave the database. */
export function usePubVisits(pubId: string | undefined) {
  return useQuery({
    queryKey: ['pub-visits', pubId],
    enabled: Boolean(pubId),
    queryFn: async (): Promise<Visit[]> => {
      const { data, error } = await supabase
        .from('checkins')
        .select('*, profiles(*), checkin_photos(*)')
        .eq('pub_id', pubId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Visit[];
    },
  });
}

/** Up to five photos from check-ins you can see at this pub. */
export type PubPhoto = {
  /** Public URL, ready for an Image. */
  uri: string;
  /** Present on a seeded front photo: who took it and under what licence. */
  credit: { author: string | null; licence: string; sourceUrl: string } | null;
};

export function frontPhotoUrl(storagePath: string): string {
  return supabase.storage.from('pub-photos').getPublicUrl(storagePath).data.publicUrl;
}

function creditFor(row: Pick<Tables<'pub_photos'>, 'author' | 'licence' | 'source_url'>): PubPhoto['credit'] {
  return { author: row.author, licence: row.licence, sourceUrl: row.source_url };
}

/**
 * Photos for a pub page or map card: the pub's own front photo first, then
 * your and your mates' check-in photos, newest first. The pub is the pub;
 * a night out there is a visit, and shows as one.
 */
export function usePubPhotos(pubId: string | undefined) {
  return useQuery({
    queryKey: ['pub-photos', pubId],
    enabled: Boolean(pubId),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<PubPhoto[]> => {
      const [mine, front] = await Promise.all([
        supabase
          .from('checkin_photos')
          .select('storage_path, checkins!inner(pub_id)')
          .eq('checkins.pub_id', pubId!)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('pub_photos').select('storage_path, author, licence, source_url').eq('pub_id', pubId!).maybeSingle(),
      ]);
      if (mine.error) throw mine.error;
      if (front.error) throw front.error;
      const photos: PubPhoto[] = front.data ? [{ uri: frontPhotoUrl(front.data.storage_path), credit: creditFor(front.data) }] : [];
      for (const row of mine.data) photos.push({ uri: photoUrl(row.storage_path), credit: null });
      return photos;
    },
  });
}

/** Front photos for a handful of pubs at once, keyed by pub id. Profile tiles. */
export function useFrontPhotos(pubIds: string[]) {
  const key = [...pubIds].sort();
  return useQuery({
    queryKey: ['front-photos', key],
    enabled: key.length > 0,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('pub_photos').select('pub_id, storage_path').in('pub_id', key);
      if (error) throw error;
      return new Map(data.map((row) => [row.pub_id, frontPhotoUrl(row.storage_path)]));
    },
  });
}

export function usePubRatingHistogram(pubId: string | undefined) {
  return useQuery({
    queryKey: ['pub-histogram', pubId],
    enabled: Boolean(pubId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('pub_rating_histogram', { pub: pubId! });
      if (error) throw error;
      return data;
    },
  });
}

/** Confirm several tags at once, from the check-in flow. */
export function useConfirmTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pubId, slugs }: { pubId: string; slugs: string[] }) => {
      if (slugs.length === 0) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session!.user.id;
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('pub_tag_votes')
        .upsert(slugs.map((tag) => ({ user_id: userId, pub_id: pubId, tag, value: 1, updated_at: now })), { onConflict: 'user_id,pub_id,tag' });
      if (error) throw error;
    },
    onSettled: (_, __, { pubId }) => {
      void queryClient.invalidateQueries({ queryKey: ['pub-tag-stats', pubId] });
      void queryClient.invalidateQueries({ queryKey: ['my-tag-votes', pubId] });
    },
  });
}

export type CorrectionType = Tables<'pub_corrections'>['type'];

export function useReportPub(pubId: string) {
  return useMutation({
    mutationFn: async ({ type, detail }: { type: CorrectionType; detail?: string }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { error } = await supabase.from('pub_corrections').insert({
        pub_id: pubId,
        user_id: session!.user.id,
        type,
        detail: detail ?? null,
      });
      if (error) throw error;
    },
  });
}

/** Adding a pub the import missed. Unverified until someone checks in. */
export function useCreatePub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; lat: number; lng: number; address?: string }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('pubs')
        .insert({
          name: input.name.trim(),
          lat: input.lat,
          lng: input.lng,
          address: input.address?.trim() || null,
          created_by: session!.user.id,
          status: 'unverified',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['map-pubs'] });
      void queryClient.invalidateQueries({ queryKey: ['nearby-pubs'] });
    },
  });
}
