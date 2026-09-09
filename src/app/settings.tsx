import { Stack, useRouter } from 'expo-router';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';

import { Card, ListRow, SectionTitle } from '@/components/ui';
import { useIsAdmin } from '@/lib/admin';
import { deleteAccount, signOut, useProfile } from '@/lib/auth';
import { useTheme } from '@/lib/theme-provider';
import { colors } from '@/theme';

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
            <View className="min-h-[52px] flex-row items-center justify-between px-4 py-2">
              <Text className="text-ink text-[17px] font-semibold">Dark mode</Text>
              <Switch value={scheme === 'dark'} onValueChange={(v) => setScheme(v ? 'dark' : 'light')} trackColor={{ true: colors.you }} />
            </View>
          </Card>
        </View>

        <View>
          <SectionTitle>About</SectionTitle>
          <Card>
            <ListRow title="Privacy policy" onPress={() => router.push('/privacy')} />
            <ListRow title="Report a problem" subtitle="Long press anything that is wrong" chevron={false} last />
          </Card>
        </View>

        {isAdmin.data ? (
          <View>
            <SectionTitle>Admin</SectionTitle>
            <Card>
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
