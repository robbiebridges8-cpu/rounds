import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SFSymbol } from 'expo-symbols';

import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import type { FnReturns } from '@/types/database';

export type Challenge = FnReturns<'challenge_list'>[number];
export type ChallengePub = FnReturns<'challenge_pub_status'>[number];
export type Badge = FnReturns<'user_badges'>[number];

export type ChallengeColor = 'ale' | 'gold' | 'mate' | 'stout' | 'danger';

export const CHALLENGE_COLORS: Record<ChallengeColor, string> = {
  ale: colors.ale,
  gold: '#E8A400',
  mate: '#1DB874',
  stout: colors.stout,
  danger: colors.danger,
};

export const CHALLENGE_ICONS: SFSymbol[] = [
  'flag.fill',
  'star.fill',
  'crown.fill',
  'trophy.fill',
  'tram.fill',
  'building.columns.fill',
  'leaf.fill',
  'flame.fill',
  'map.fill',
  'mug.fill',
];

export const challengeColor = (key: string) =>
  CHALLENGE_COLORS[key as ChallengeColor] ?? colors.ale;

export function useChallenges() {
  return useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('challenge_list');
      if (error) throw error;
      return data;
    },
  });
}

export function useChallengePubs(id: string | undefined) {
  return useQuery({
    queryKey: ['challenge-pubs', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('challenge_pub_status', { challenge: id! });
      if (error) throw error;
      return data;
    },
  });
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

function useInvalidateChallenges() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['challenges'] });
    void queryClient.invalidateQueries({ queryKey: ['badges'] });
    void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    if (id) void queryClient.invalidateQueries({ queryKey: ['challenge-pubs', id] });
  };
}

async function me() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session!.user.id;
}

export function useJoinChallenge() {
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('challenge_members')
        .insert({ challenge_id: id, user_id: await me() });
      if (error && error.code !== '23505') throw error;
    },
    onSuccess: (_, id) => invalidate(id),
  });
}

export function useLeaveChallenge() {
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('challenge_members')
        .delete()
        .match({ challenge_id: id, user_id: await me() });
      if (error) throw error;
    },
    onSuccess: (_, id) => invalidate(id),
  });
}

export function useCreateChallenge() {
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      icon: SFSymbol;
      color: ChallengeColor;
    }) => {
      const userId = await me();
      const { data, error } = await supabase
        .from('challenges')
        .insert({
          title: input.title.trim(),
          description: input.description.trim() || null,
          icon: input.icon,
          color: input.color,
          creator_id: userId,
        })
        .select()
        .single();
      if (error) throw error;
      // The creator is doing it too. Obviously.
      await supabase.from('challenge_members').insert({ challenge_id: data.id, user_id: userId });
      return data;
    },
    onSuccess: () => invalidate(),
  });
}

export function useAddChallengePubs() {
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn: async ({ id, pubIds }: { id: string; pubIds: string[] }) => {
      const userId = await me();
      const { error } = await supabase
        .from('challenge_pubs')
        .upsert(
          pubIds.map((pub_id) => ({ challenge_id: id, pub_id, added_by: userId })),
          { onConflict: 'challenge_id,pub_id', ignoreDuplicates: true }
        );
      if (error) throw error;
    },
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useRemoveChallengePub() {
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn: async ({ id, pubId }: { id: string; pubId: string }) => {
      const { error } = await supabase
        .from('challenge_pubs')
        .delete()
        .match({ challenge_id: id, pub_id: pubId });
      if (error) throw error;
    },
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useDeleteChallenge() {
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('challenges').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}
