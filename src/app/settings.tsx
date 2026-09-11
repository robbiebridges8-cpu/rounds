import { Stack, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Card, ListRow, SectionTitle } from '@/components/ui';
import { useIsAdmin } from '@/lib/admin';
import { deleteAccount, signOut, useProfile } from '@/lib/auth';
import { useTheme, type Scheme } from '@/lib/theme-provider';

export default function SettingsScreen() {
  const router = useRouter();
  const { scheme, setScheme } = useTheme();
  const { data: profile } = useProfile();
  const isAdmin = useIsAdmin();

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'Your check-ins stay put.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);

  const confirmDelete = () =>
    Alert.alert('Delete your account?', 'Every check-in, photo, reply and friendship goes, immediately and permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete everything',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Last chance', 'This cannot be undone.', [
            { text: 'Keep my account', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => deleteAccount().catch((e: Error) => Alert.alert('Could not delete', e.message)),
            },
          ]),
      },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-4 pb-10 pt-2">
        <View>
          <SectionTitle>Look</SectionTitle>
          <Card>
            <View className="flex-row gap-2 p-3">
              {(
                [
                  ['light', 'Light'],
                  ['dark', 'Dark'],
                  ['pub', 'Pub'],
                ] as [Scheme, string][]
              ).map(([key, label]) => {
                const on = scheme === key;
                return (
                  <Pressable key={key} onPress={() => setScheme(key)} accessibilityRole="radio" accessibilityState={{ selected: on }} className={`h-10 flex-1 items-center justify-center rounded-full ${on ? 'bg-ink' : 'bg-raised'}`}>
                    <Text className={`text-[14px] font-bold ${on ? 'text-canvas' : 'text-ink'}`}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>

        <View>
          <SectionTitle>About</SectionTitle>
          <Card>
            <ListRow title="Tell us" subtitle="Broken, confusing, or an idea. A human reads every one." onPress={() => router.push({ pathname: '/feedback', params: { from: 'settings' } })} />
            <ListRow title="Privacy policy" onPress={() => router.push('/privacy')} last />
          </Card>
        </View>

        {isAdmin.data ? (
          <View>
            <SectionTitle>Admin</SectionTitle>
            <Card>
              <ListRow title="Inbox" subtitle="Feedback, pub fixes, reports" onPress={() => router.push('/admin/inbox')} />
              <ListRow title="Numbers" subtitle="Actives, check-ins, top pubs" onPress={() => router.push('/admin')} last />
            </Card>
          </View>
        ) : null}

        <View>
          <SectionTitle>Account</SectionTitle>
          <Card>
            <ListRow title="Signed in as" subtitle={profile ? `@${profile.username}` : ''} chevron={false} />
            <ListRow title="Sign out" onPress={confirmSignOut} chevron={false} />
            <ListRow title="Delete account" subtitle="Permanent. Apple insists we offer it, and so do we." onPress={confirmDelete} chevron={false} last />
          </Card>
        </View>
      </ScrollView>
    </>
  );
}
