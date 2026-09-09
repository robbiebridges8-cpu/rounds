import { Stack, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ProfileView } from '@/components/profile-view';
import { Icon } from '@/components/ui';
import { useProfile } from '@/lib/auth';
import { colors } from '@/theme';

export default function YouScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'You',
          headerRight: () => (
            <View className="flex-row items-center gap-5">
              <Pressable onPress={() => router.push('/search')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Search pubs">
                <Icon name="magnifyingglass" size={20} color={colors.ink} weight="semibold" />
              </Pressable>
              <Pressable onPress={() => router.push('/settings')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Settings">
                <Icon name="gearshape.fill" size={20} color={colors.ink} />
              </Pressable>
            </View>
          ),
        }}
      />
      {profile ? <ProfileView profile={profile} isMe /> : null}
    </>
  );
}
