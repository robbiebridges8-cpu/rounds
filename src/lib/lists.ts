import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import type { FnReturns } from '@/types/database';

export type ListSummary = FnReturns<'list_index'>[number];
export type ListPub = FnReturns<'list_pub_status'>[number];
export type PubList = FnReturns<'pub_lists'>[number];
export type Badge = FnReturns<'user_badges'>[number];
export type ListKind = 'list' | 'crawl';

const LIST_COLORS: Record<string, string> = { ale: colors.ale, gold: '#E8A400', mate: '#1DB874', stout: colors.stout, danger: colors.danger };
export const listColor = (key: string) => LIST_COLORS[key] ?? colors.ale;

/** Straight-line distance in metres. */
export function metresBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

/** Walking minutes between two pubs: streets are not straight, so a third more than the crow. */
export function walkMinutes(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return Math.max(1, Math.round((metresBetween(a, b) * 1.3) / 80));
}

export function useBadges(userId: string | undefined) {
  return useQuery({
    queryKey: ['badges', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('user_badges', { target: userId! });
      if (error) throw error;
      return data;
    },
  });
}

export function useLists() {
  return useQuery({
    queryKey: ['lists'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_index');
      if (error) throw error;
      return data;
    },
  });
}

export function useListPubs(id: string | undefined) {
  return useQuery({
    queryKey: ['list-pubs', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_pub_status', { list: id! });
      if (error) throw error;
      return data;
    },
  });
}

/** The lists a pub sits on. "On 3 lists" is the pub page's social proof. */
export function usePubLists(pubId: string | undefined) {
  return useQuery({
    queryKey: ['pub-lists', pubId],
    enabled: Boolean(pubId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('pub_lists', { pub: pubId! });
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidateLists() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['lists'] });
    void queryClient.invalidateQueries({ queryKey: ['pub-lists'] });
    if (id) void queryClient.invalidateQueries({ queryKey: ['list-pubs', id] });
  };
}

async function me() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session!.user.id;
}

export function useCreateList() {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: async (input: { title: string; description: string; kind: ListKind }) => {
      const { data, error } = await supabase
        .from('lists')
        .insert({ title: input.title.trim(), description: input.description.trim() || null, creator_id: await me(), kind: input.kind, icon: input.kind === 'crawl' ? 'figure.walk' : 'list.bullet' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(),
  });
}

export function useDeleteList() {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

export function useFollowList() {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: async ({ id, follow }: { id: string; follow: boolean }) => {
      const userId = await me();
      const { error } = follow
        ? await supabase.from('list_follows').insert({ list_id: id, user_id: userId })
        : await supabase.from('list_follows').delete().match({ list_id: id, user_id: userId });
      if (error && error.code !== '23505') throw error;
    },
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useAddListPubs() {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: async ({ id, pubIds }: { id: string; pubIds: string[] }) => {
      const { count } = await supabase.from('list_pubs').select('*', { count: 'exact', head: true }).eq('list_id', id);
      const start = count ?? 0;
      const { error } = await supabase
        .from('list_pubs')
        .upsert(
          pubIds.map((pub_id, i) => ({ list_id: id, pub_id, position: start + i })),
          { onConflict: 'list_id,pub_id', ignoreDuplicates: true }
        );
      if (error) throw error;
    },
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useSetListNote() {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: async ({ id, pubId, note }: { id: string; pubId: string; note: string }) => {
      const { error } = await supabase
        .from('list_pubs')
        .update({ note: note.trim() || null })
        .match({ list_id: id, pub_id: pubId });
      if (error) throw error;
    },
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useRemoveListPub() {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: async ({ id, pubId }: { id: string; pubId: string }) => {
      const { error } = await supabase.from('list_pubs').delete().match({ list_id: id, pub_id: pubId });
      if (error) throw error;
    },
    onSuccess: (_, { id }) => invalidate(id),
  });
}
