import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Coords } from '@/lib/location';
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

export function useMapPubs(bounds: Bounds | null) {
  return useQuery({
    queryKey: ['map-pubs', bounds ? roundBounds(bounds) : null],
    enabled: Boolean(bounds),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('map_pubs', {
        min_lat: bounds!.minLat,
        min_lng: bounds!.minLng,
        max_lat: bounds!.maxLat,
        max_lng: bounds!.maxLng,
        max_rows: 400,
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
export function usePubPhotos(pubId: string | undefined) {
  return useQuery({
    queryKey: ['pub-photos', pubId],
    enabled: Boolean(pubId),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('checkin_photos')
        .select('storage_path, checkins!inner(pub_id)')
        .eq('checkins.pub_id', pubId!)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data.map((row) => row.storage_path);
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
