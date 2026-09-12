import { Stack, useRouter } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';

import { Card, ListRow, SectionTitle } from '@/components/ui';
import { useIsAdmin } from '@/lib/admin';
import { deleteAccount, signOut, useProfile } from '@/lib/auth';

export default function SettingsScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const isAdmin = useIsAdmin();

  const confirmSignOut = () =>
    Alert.alert('Sign out?', undefined, [
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
          <SectionTitle>About</SectionTitle>
          <Card>
            <ListRow title="Tell us" subtitle="Bugs, ideas, anything you would change" onPress={() => router.push({ pathname: '/feedback', params: { from: 'settings' } })} />
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
            <ListRow title="Delete account" subtitle="Permanent" onPress={confirmDelete} chevron={false} last />
          </Card>
        </View>
      </ScrollView>
    </>
  );
}
