import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { FnReturns } from '@/types/database';

export type LeaderboardRow = FnReturns<'friends_leaderboard'>[number];
export type WeeklySummary = FnReturns<'weekly_summary'>[number];
export type MyWeek = FnReturns<'my_week'>[number];
export type MyMonth = FnReturns<'my_month'>[number];

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('friends_leaderboard');
      if (error) throw error;
      return data;
    },
  });
}

export function useWeeklySummary() {
  return useQuery({
    queryKey: ['weekly-summary'],
    queryFn: async (): Promise<WeeklySummary | null> => {
      const { data, error } = await supabase.rpc('weekly_summary');
      if (error) throw error;
      return data[0] ?? null;
    },
  });
}

export function useMyWeek() {
  return useQuery({
    queryKey: ['my-week'],
    queryFn: async (): Promise<MyWeek | null> => {
      const { data, error } = await supabase.rpc('my_week');
      if (error) throw error;
      return data[0] ?? null;
    },
  });
}

export function useMyMonth() {
  return useQuery({
    queryKey: ['my-month'],
    queryFn: async (): Promise<MyMonth | null> => {
      const { data, error } = await supabase.rpc('my_month');
      if (error) throw error;
      return data[0] ?? null;
    },
  });
}

/** Simple name search, for finding a pub the map is not showing you. */
export function usePubSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ['pub-search', q.toLowerCase()],
    enabled: q.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pubs')
        .select('id, name, address, borough, lat, lng')
        .neq('status', 'closed')
        .ilike('name', `%${q.replace(/[%_]/g, '')}%`)
        .order('name')
        .limit(25);
      if (error) throw error;
      return data;
    },
  });
}
