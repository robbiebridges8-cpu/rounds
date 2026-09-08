import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import {
  Fraunces_600SemiBold_Italic,
  Fraunces_700Bold,
  Fraunces_900Black,
  useFonts,
} from '@expo-google-fonts/fraunces';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useAuthRedirect } from '@/lib/auth';
import '@/lib/notifications';
import { queryClient } from '@/lib/query-client';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </SafeAreaProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const authReady = useAuthRedirect();
  const [fontsReady] = useFonts({ Fraunces_700Bold, Fraunces_900Black, Fraunces_600SemiBold_Italic });
  const ready = authReady && fontsReady;
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as Href);
    });
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.ale,
        headerTitleStyle: { color: colors.ink },
        headerLargeTitleStyle: { color: colors.ink },
        headerStyle: { backgroundColor: colors.cream },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.cream },
      }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="pub/[id]" options={{ title: '' }} />
      <Stack.Screen name="user/[id]" options={{ title: '' }} />
      <Stack.Screen name="invite/[code]" options={{ headerShown: false }} />
      <Stack.Screen
        name="checkin/[pubId]"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.9, 1],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="nearby"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.55, 1],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
    </Stack>
  );
}
