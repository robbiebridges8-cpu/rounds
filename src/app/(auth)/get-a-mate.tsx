import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Body, Button, Heading, Icon, Screen } from '@/components/ui';
import { useProfile } from '@/lib/auth';
import { shareInvite, useInviteCode } from '@/lib/invites';
import { colors } from '@/theme';

/**
 * The last step. The feed is nothing without a mate on it, so before the
 * app opens, one ask: send someone your link. Skippable.
 */
export default function GetAMateScreen() {
  const router = useRouter();
  const profile = useProfile();
  const invite = useInviteCode();

  const share = async () => {
    if (invite.data && profile.data) await shareInvite(invite.data, profile.data.display_name);
    router.replace('/');
  };

  return (
    <Screen>
      <View className="flex-1 justify-between px-6 pb-4 pt-10">
        <View className="gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: colors.ale }}>
            <Icon name="person.2.fill" size={28} color="#fff" />
          </View>
          <Heading>Get a mate on it</Heading>
          <Body>Their pubs show up on your map, their nights on your feed, and the borough race starts. Send one person your link.</Body>
          {invite.data ? (
            <View className="self-start rounded-full bg-surface px-4 py-2">
              <Text className="text-ink text-[15px] font-bold" style={{ letterSpacing: 2 }}>{invite.data}</Text>
            </View>
          ) : null}
        </View>
        <View className="gap-3">
          <Button label="Send my link" icon="square.and.arrow.up" onPress={() => void share()} disabled={!invite.data} />
          <Button label="Later" variant="quiet" onPress={() => router.replace('/')} />
        </View>
      </View>
    </Screen>
  );
}
