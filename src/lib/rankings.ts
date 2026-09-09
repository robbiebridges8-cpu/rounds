import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Profile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Sentiment = 'loved' | 'fine' | 'meh';

export const SENTIMENTS: { key: Sentiment; label: string; icon: 'heart.fill' | 'hand.thumbsup.fill' | 'hand.thumbsdown.fill' }[] = [
  { key: 'loved', label: 'Loved it', icon: 'heart.fill' },
  { key: 'fine', label: 'Decent', icon: 'hand.thumbsup.fill' },
  { key: 'meh', label: 'Not for me', icon: 'hand.thumbsdown.fill' },
];

export type Ranking = Tables<'pub_rankings'> & {
  pubs: Pick<Tables<'pubs'>, 'id' | 'name' | 'borough'> | null;
};

export type PubRanking = Tables<'pub_rankings'> & { profiles: Profile | null };

/** A person's whole ranked list, best first. Empty for a non-friend. */
export function useRankings(userId: string | undefined) {
  return useQuery({
    queryKey: ['rankings', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Ranking[]> => {
      const { data, error } = await supabase
        .from('pub_rankings')
        .select('*, pubs(id, name, borough)')
        .eq('user_id', userId!)
        .order('position');
      if (error) throw error;
      return data as unknown as Ranking[];
    },
  });
}

/** Everyone you can see who has ranked this pub, with their score. */
export function usePubRankings(pubId: string | undefined) {
  return useQuery({
    queryKey: ['pub-rankings', pubId],
    enabled: Boolean(pubId),
    queryFn: async (): Promise<PubRanking[]> => {
      const { data, error } = await supabase
        .from('pub_rankings')
        .select('*, profiles(*)')
        .eq('pub_id', pubId!)
        .order('score', { ascending: false });
      if (error) throw error;
      return data as unknown as PubRanking[];
    },
  });
}

/** The pubs to compare against: your own, same sentiment, best first. */
export async function fetchBucket(sentiment: Sentiment, excludePub: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { data, error } = await supabase
    .from('pub_rankings')
    .select('pub_id, position, pubs(id, name, borough)')
    .eq('user_id', session!.user.id)
    .eq('sentiment', sentiment)
    .neq('pub_id', excludePub)
    .order('position');
  if (error) throw error;
  return data as unknown as { pub_id: string; position: number; pubs: { id: string; name: string; borough: string | null } | null }[];
}

function useInvalidateRankings() {
  const queryClient = useQueryClient();
  return (pubId: string) => {
    for (const key of [
      ['rankings'],
      ['pub-rankings', pubId],
      ['feed'],
      ['post'],
      ['pub', pubId],
      ['pub-visits', pubId],
      ['map-pubs'],
      ['user-checkins'],
      ['user-pubs'],
      ['user-stats'],
    ]) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  };
}

export function useRankPub() {
  const invalidate = useInvalidateRankings();
  return useMutation({
    mutationFn: async ({ pubId, sentiment, index }: { pubId: string; sentiment: Sentiment; index: number }) => {
      const { data, error } = await supabase.rpc('rank_pub', {
        p_pub: pubId,
        p_sentiment: sentiment,
        p_index: index,
      });
      if (error) throw error;
      return data[0];
    },
    onSuccess: (_, { pubId }) => invalidate(pubId),
  });
}

export function useUnrankPub() {
  const invalidate = useInvalidateRankings();
  return useMutation({
    mutationFn: async (pubId: string) => {
      const { error } = await supabase.rpc('unrank_pub', { p_pub: pubId });
      if (error) throw error;
    },
    onSuccess: (_, pubId) => invalidate(pubId),
  });
}
