import { Stack } from 'expo-router';
import { Alert, Pressable } from 'react-native';

import { ProfileView } from '@/components/profile-view';
import { Icon } from '@/components/ui';
import { signOut, useProfile } from '@/lib/auth';
import { colors } from '@/theme';

export default function YouScreen() {
  const { data: profile } = useProfile();

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'Your check-ins stay put. You will need a new code to get back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'You',
          headerRight: () => (
            <Pressable
              onPress={confirmSignOut}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Sign out">
              <Icon name="rectangle.portrait.and.arrow.right" size={20} color={colors.ale} />
            </Pressable>
          ),
        }}
      />
      {profile ? <ProfileView profile={profile} isMe /> : null}
    </>
  );
}
