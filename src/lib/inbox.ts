import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Profile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type InboxItem = Tables<'notifications'> & { actor: Profile | null };

/** Your notifications, newest first. The push is a copy of this row. */
export function useInbox() {
  return useQuery({
    queryKey: ['inbox'],
    refetchInterval: 60_000,
    queryFn: async (): Promise<InboxItem[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, actor:profiles!notifications_actor_id_fkey(*)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as InboxItem[];
    },
  });
}

export function useUnreadCount() {
  const inbox = useInbox();
  return inbox.data?.filter((n) => !n.read_at).length ?? 0;
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['inbox'] }),
  });
}

/**
 * Register this device for push. Needs an Expo project id, which comes with
 * the EAS setup that the Apple account unlocks; until then this quietly
 * does nothing and the in-app inbox is the whole feature.
 */
export async function registerForPush(): Promise<boolean> {
  try {
    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return false;

    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return false;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return false;

    const { error } = await supabase
      .from('push_tokens')
      .upsert({ token, user_id: session.user.id, platform: Platform.OS, updated_at: new Date().toISOString() });
    return !error;
  } catch {
    return false;
  }
}
