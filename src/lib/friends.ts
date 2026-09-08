import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Profile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

type FriendshipRow = Tables<'friendships'> & { low: Profile | null; high: Profile | null };

export type Friendships = {
  friends: Profile[];
  /** They asked you. */
  incoming: Profile[];
  /** You asked them. */
  outgoing: Profile[];
};

const EMPTY: Friendships = { friends: [], incoming: [], outgoing: [] };

export function useFriendships() {
  return useQuery({
    queryKey: ['friendships'],
    queryFn: async (): Promise<Friendships> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const me = session?.user.id;
      if (!me) return EMPTY;

      const { data, error } = await supabase
        .from('friendships')
        .select(
          '*, low:profiles!friendships_user_low_fkey(*), high:profiles!friendships_user_high_fkey(*)'
        )
        .order('created_at', { ascending: false });
      if (error) throw error;

      const result: Friendships = { friends: [], incoming: [], outgoing: [] };
      for (const row of data as FriendshipRow[]) {
        const other = row.user_low === me ? row.high : row.low;
        if (!other) continue;
        if (row.status === 'accepted') result.friends.push(other);
        else if (row.requested_by === me) result.outgoing.push(other);
        else result.incoming.push(other);
      }
      result.friends.sort((a, b) => a.display_name.localeCompare(b.display_name));
      return result;
    },
  });
}

function useInvalidateFriends() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['friendships'] });
    // Friendship changes what you are allowed to see everywhere else.
    void queryClient.invalidateQueries({ queryKey: ['map-pubs'] });
    void queryClient.invalidateQueries({ queryKey: ['pub-visits'] });
  };
}

export function useRequestFriend() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: async (username: string) => {
      const { data, error } = await supabase.rpc('request_friendship', {
        target_username: username.trim().toLowerCase().replace(/^@/, ''),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useAcceptFriend() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: async (other: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const me = session!.user.id;
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .match({ user_low: me < other ? me : other, user_high: me < other ? other : me });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Decline, withdraw or unfriend: they are all the same delete. */
export function useRemoveFriend() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: async (other: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const me = session!.user.id;
      const { error } = await supabase
        .from('friendships')
        .delete()
        .match({ user_low: me < other ? me : other, user_high: me < other ? other : me });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useProfileById(id: string | undefined) {
  return useQuery({
    queryKey: ['profile', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
