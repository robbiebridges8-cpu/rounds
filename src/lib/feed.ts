import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Profile } from '@/lib/auth';
import { compress, uploadImage, type PickedImage } from '@/lib/images';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Cheer = Tables<'cheers'> & { profiles: Profile | null };
export type Comment = Tables<'checkin_comments'> & { profiles: Profile | null };

export type FeedPost = Tables<'checkins'> & {
  profiles: Profile | null;
  pubs: Pick<Tables<'pubs'>, 'id' | 'name' | 'borough' | 'lat' | 'lng'> | null;
  checkin_photos: Tables<'checkin_photos'>[];
  cheers: Cheer[];
  checkin_comments: Comment[];
};

const SELECT =
  '*, profiles(*), pubs(id, name, borough, lat, lng), checkin_photos(*), cheers(*, profiles(*)), checkin_comments(*, profiles(*))';
const PAGE = 20;

/**
 * Everyone's check-ins you are allowed to see, newest first. RLS does the
 * scoping, so this is just "select from checkins" with the trimmings.
 */
export function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<FeedPost[]> => {
      let query = supabase
        .from('checkins')
        .select(SELECT)
        .order('created_at', { ascending: false })
        .limit(PAGE);
      if (pageParam) query = query.lt('created_at', pageParam);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as FeedPost[];
    },
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1].created_at : undefined),
  });
}

export function usePost(id: string | undefined) {
  return useQuery({
    queryKey: ['post', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<FeedPost | null> => {
      const { data, error } = await supabase.from('checkins').select(SELECT).eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as unknown as FeedPost | null;
    },
  });
}

function useInvalidatePost() {
  const queryClient = useQueryClient();
  return (checkinId: string) => {
    void queryClient.invalidateQueries({ queryKey: ['feed'] });
    void queryClient.invalidateQueries({ queryKey: ['post', checkinId] });
    void queryClient.invalidateQueries({ queryKey: ['pub-visits'] });
  };
}

/**
 * Cheers: a photo back. One per person per check-in, and the database only
 * accepts it on a check-in that has a photo of its own.
 */
export function useCheers() {
  const invalidate = useInvalidatePost();
  return useMutation({
    mutationFn: async ({ checkinId, photo }: { checkinId: string; photo: PickedImage }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const me = session!.user.id;
      const compressed = await compress(photo, 1080);
      const path = `${me}/cheers/${checkinId}.jpg`;
      await uploadImage('checkin-photos', path, compressed);
      const { error } = await supabase
        .from('cheers')
        .upsert({ checkin_id: checkinId, user_id: me, photo_path: path }, { onConflict: 'checkin_id,user_id' });
      if (error) throw error;
    },
    onSuccess: (_, { checkinId }) => invalidate(checkinId),
  });
}

export function useRemoveCheers() {
  const invalidate = useInvalidatePost();
  return useMutation({
    mutationFn: async (checkinId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { error } = await supabase
        .from('cheers')
        .delete()
        .match({ checkin_id: checkinId, user_id: session!.user.id });
      if (error) throw error;
    },
    onSuccess: (_, checkinId) => invalidate(checkinId),
  });
}

export function useReply() {
  const invalidate = useInvalidatePost();
  return useMutation({
    mutationFn: async ({ checkinId, body }: { checkinId: string; body: string }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { error } = await supabase
        .from('checkin_comments')
        .insert({ checkin_id: checkinId, user_id: session!.user.id, body: body.trim() });
      if (error) throw error;
    },
    onSuccess: (_, { checkinId }) => invalidate(checkinId),
  });
}

export function useDeleteReply() {
  const invalidate = useInvalidatePost();
  return useMutation({
    mutationFn: async ({ id }: { id: string; checkinId: string }) => {
      const { error } = await supabase.from('checkin_comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { checkinId }) => invalidate(checkinId),
  });
}
