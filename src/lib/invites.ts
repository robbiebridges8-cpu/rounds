import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Share } from 'react-native';

import { supabase } from '@/lib/supabase';

const PENDING_KEY = 'rounds.pending-invite';

/** Your own code. RLS returns exactly one row: yours. */
export function useInviteCode() {
  return useQuery({
    queryKey: ['invite-code'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from('invite_codes').select('code').maybeSingle();
      if (error) throw error;
      return data?.code ?? null;
    },
  });
}

/**
 * In Expo Go this is an exp:// link to the dev server; in a real build it is
 * rounds://invite/CODE. Universal https links need the Apple account and an
 * App Store listing, so the message always carries the code as well.
 */
export function inviteLink(code: string): string {
  return Linking.createURL(`/invite/${code}`);
}

export async function shareInvite(code: string, displayName: string) {
  const link = inviteLink(code);
  await Share.share({
    message: `${displayName} wants you on Rounds, the pub map for you and your mates.\n\nTap ${link} or open the app and enter code ${code}.`,
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('accept_invite', { invite: code });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      for (const key of [['friendships'], ['leaderboard'], ['weekly-summary'], ['map-pubs'], ['pub-visits']]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

/** A link opened before sign-in is remembered and applied after onboarding. */
export async function savePendingInvite(code: string) {
  try {
    await AsyncStorage.setItem(PENDING_KEY, code.toUpperCase());
  } catch {
    // storage unavailable: the code is still in the share message
  }
}

export async function takePendingInvite(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(PENDING_KEY);
    if (code) await AsyncStorage.removeItem(PENDING_KEY);
    return code;
  } catch {
    return null;
  }
}
