import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';

import { compress, uploadImage, type PickedImage } from '@/lib/images';
import { distanceMetres, getPosition, type Coords } from '@/lib/location';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type NewCheckin = {
  pubId: string;
  pubCoords: Coords;
  rating: number | null;
  note: string;
  photos: PickedImage[];
  /** Friends who were there. */
  tagIds: string[];
  /** People who were there but are not on Rounds. */
  guests: string[];
};

export type UserCheckin = Tables<'checkins'> & {
  pubs: Pick<Tables<'pubs'>, 'id' | 'name' | 'borough'> | null;
  checkin_photos: Tables<'checkin_photos'>[];
};

export function photoUrl(storagePath: string): string {
  return supabase.storage.from('checkin-photos').getPublicUrl(storagePath).data.publicUrl;
}

export function useCreateCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewCheckin) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session!.user.id;

      // Location is optional: without it the check-in still counts, it just
      // is not "verified". The trigger decides that from distance_m.
      const position = await getPosition();
      const distance = position ? Math.round(distanceMetres(position, input.pubCoords)) : null;

      const { data: checkin, error } = await supabase
        .from('checkins')
        .insert({
          user_id: userId,
          pub_id: input.pubId,
          client_id: Crypto.randomUUID(),
          rating: input.rating,
          note: input.note.trim() || null,
          lat: position?.latitude ?? null,
          lng: position?.longitude ?? null,
          distance_m: distance,
        })
        .select()
        .single();
      if (error) throw error;

      if (input.tagIds.length) {
        await supabase.from('checkin_tags').insert(input.tagIds.map((user_id) => ({ checkin_id: checkin.id, user_id })));
      }
      if (input.guests.length) {
        await supabase
          .from('checkin_guests')
          .insert(input.guests.map((name) => ({ checkin_id: checkin.id, name, invited_by: userId })));
      }

      // Photos go up after the row exists, and a failed upload never undoes
      // the check-in: the row is already saved, so report the photo problem
      // separately and let the user carry on.
      let photoError: string | null = null;
      for (const [index, photo] of input.photos.entries()) {
        try {
          const compressed = await compress(photo);
          const path = `${userId}/${checkin.id}/${index}.jpg`;
          await uploadImage('checkin-photos', path, compressed);
          const { error: photoInsertError } = await supabase.from('checkin_photos').insert({
            checkin_id: checkin.id,
            storage_path: path,
            width: compressed.width,
            height: compressed.height,
          });
          if (photoInsertError) throw photoInsertError;
        } catch (error) {
          photoError = error instanceof Error ? error.message : String(error);
          break;
        }
      }

      return { checkin, photoError };
    },
    onSuccess: ({ checkin }) => {
      for (const key of [
        ['map-pubs'],
        ['nearby-pubs'],
        ['pub', checkin.pub_id],
        ['pub-visits', checkin.pub_id],
        ['user-stats'],
        ['user-pubs'],
        ['user-checkins'],
        ['feed'],
        ['badges'],
        ['leaderboard'],
        ['my-week'],
        ['my-month'],
      ]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export function useUserCheckins(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-checkins', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<UserCheckin[]> => {
      const { data, error } = await supabase
        .from('checkins')
        .select('*, pubs(id, name, borough), checkin_photos(*)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as UserCheckin[];
    },
  });
}

export function useUserPubs(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-pubs', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('user_pub_map', { target: userId! });
      if (error) throw error;
      return [...data].sort((a, b) => b.last_visit.localeCompare(a.last_visit));
    },
  });
}

export function useUserStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-stats', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('user_stats', { target: userId! });
      if (error) throw error;
      return (
        data[0] ?? { pub_count: 0, checkin_count: 0, borough_count: 0, rated_count: 0, avg_rating: null }
      );
    },
  });
}
