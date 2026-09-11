import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { ProfileView } from '@/components/profile-view';
import { EmptyState } from '@/components/ui';
import { useSession } from '@/lib/auth';
import { useProfileById } from '@/lib/friends';
import { colors } from '@/theme';

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const profile = useProfileById(id);

  if (profile.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.ale} />
      </View>
    );
  }

  if (!profile.data) {
    return <EmptyState icon="person.slash" title="No such person" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: '', headerTransparent: true, headerTintColor: colors.ink }} />
      <ProfileView profile={profile.data} isMe={profile.data.id === session?.user.id} />
    </>
  );
}
