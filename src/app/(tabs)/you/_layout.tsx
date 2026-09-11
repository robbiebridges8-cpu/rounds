import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function YouLayout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerTintColor: colors.ink,
        headerTitle: '',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    />
  );
}
