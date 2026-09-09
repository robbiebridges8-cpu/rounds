import { Stack } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { ProfileView } from '@/components/profile-view';
import { Icon } from '@/components/ui';
import { signOut, useProfile } from '@/lib/auth';
import { useTheme } from '@/lib/theme-provider';
import { colors } from '@/theme';

export default function YouScreen() {
  const { data: profile } = useProfile();
  const { scheme, setScheme } = useTheme();

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
            <View className="flex-row items-center gap-5">
              <Pressable
                onPress={() => setScheme(scheme === 'dark' ? 'light' : 'dark')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                <Icon name={scheme === 'dark' ? 'sun.max.fill' : 'moon.fill'} size={20} color={colors.ink} />
              </Pressable>
              <Pressable
                onPress={confirmSignOut}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Sign out">
                <Icon name="rectangle.portrait.and.arrow.right" size={20} color={colors.ale} />
              </Pressable>
            </View>
          ),
        }}
      />
      {profile ? <ProfileView profile={profile} isMe /> : null}
    </>
  );
}
