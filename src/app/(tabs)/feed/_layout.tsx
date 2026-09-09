import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function FeedLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTintColor: colors.ale,
        headerTitleStyle: { color: colors.ink },
        headerLargeTitleStyle: { color: colors.ink },
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    />
  );
}
