import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Avatar, Body, Button, Heading, Icon, Screen } from '@/components/ui';
import { useProfile, useSession } from '@/lib/auth';
import { savePendingInvite, useAcceptInvite } from '@/lib/invites';
import { colors } from '@/theme';

type Done = { name: string; avatar: string | null };

/**
 * rounds://invite/CODE. Signed in with a profile: accept on the spot. Anything
 * else: remember the code, let the auth redirect do its thing, and apply it
 * once onboarding finishes.
 */
export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { session, initialising } = useSession();
  const profile = useProfile();
  const accept = useAcceptInvite();
  const started = useRef(false);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || initialising || started.current) return;

    if (!session) {
      started.current = true;
      void savePendingInvite(code).then(() => router.replace('/welcome'));
      return;
    }
    if (profile.isPending) return;
    if (!profile.data) {
      started.current = true;
      void savePendingInvite(code).then(() => router.replace('/onboarding'));
      return;
    }

    started.current = true;
    accept.mutate(code, {
      onSuccess: (inviter) => setDone({ name: inviter.display_name, avatar: inviter.avatar_url }),
      onError: (e) => setError(e.message),
    });
  }, [code, initialising, session, profile.isPending, profile.data, accept, router]);

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-4 px-8">
        {done ? (
          <>
            <Avatar url={done.avatar} name={done.name} size={96} />
            <Heading>You and {done.name} are now friends</Heading>
            <Body>Their pubs are green on your map from now on.</Body>
            <View className="w-full pt-4">
              <Button label="See your friends" onPress={() => router.replace('/friends')} />
            </View>
          </>
        ) : error ? (
          <>
            <Icon name="link.badge.plus" size={44} color={colors.slate} weight="regular" />
            <Heading>That invite did not work</Heading>
            <Body>{error}</Body>
            <View className="w-full pt-4">
              <Button label="Back to the map" variant="quiet" onPress={() => router.replace('/')} />
            </View>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.ale} />
            <Text className="text-ink-soft text-[15px]">Opening your invite</Text>
          </>
        )}
      </View>
    </Screen>
  );
}
