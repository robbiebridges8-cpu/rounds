import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type AdminStats = {
  users: number;
  new_users_7d: number;
  active_7d: number;
  active_30d: number;
  checkins_7d: number;
  checkins_total: number;
  photos_total: number;
  friendships: number;
  weekly: { week: string; checkins: number; users: number }[];
  boroughs: { borough: string; checkins: number }[];
  top_pubs: { id: string; name: string; borough: string | null; checkins: number; visitors: number }[];
};

/** Am I on the admins table? RLS returns only your own row. */
export function useIsAdmin() {
  return useQuery({
    queryKey: ['is-admin'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from('admins').select('user_id').maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });
}

/** The numbers an advertiser or a buyer asks for. Admins only. */
export function useAdminStats(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-stats'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_stats');
      if (error) throw error;
      return data as unknown as AdminStats;
    },
  });
}
