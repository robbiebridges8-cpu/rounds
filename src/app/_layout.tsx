import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useAuthRedirect } from '@/lib/auth';
import '@/lib/notifications';
import { queryClient } from '@/lib/query-client';
import { ThemeProvider, useTheme } from '@/lib/theme-provider';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SafeAreaProvider>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </SafeAreaProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const authReady = useAuthRedirect();
  const [fontsReady] = useFonts({ BricolageGrotesque_800ExtraBold, BricolageGrotesque_600SemiBold });
  const theme = useTheme();
  const ready = authReady && fontsReady && theme.ready;
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
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
    <Stack
      screenOptions={{
        headerTintColor: colors.ale,
        headerTitleStyle: { color: colors.ink },
        headerLargeTitleStyle: { color: colors.ink },
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.canvas },
      }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="pub/[id]" options={{ title: '' }} />
      <Stack.Screen name="user/[id]" options={{ title: '' }} />
      <Stack.Screen name="invite/[code]" options={{ headerShown: false }} />
      <Stack.Screen name="post/[id]" options={{ title: '' }} />
      <Stack.Screen name="search" options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="challenge/[id]/index" options={{ title: '' }} />
      <Stack.Screen
        name="challenge/new"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.92, 1],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="challenge/[id]/add"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.92, 1],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
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
    </>
  );
}
