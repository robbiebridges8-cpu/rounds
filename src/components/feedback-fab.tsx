import { usePathname, useRouter, useSegments } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import { useProfile } from '@/lib/auth';
import { colors } from '@/theme';

/** Early days: the feedback button lives in every screen's corner. Flip this off later. */
export const SHOW_FEEDBACK_FAB = true;

const TAB_BAR = 49;

/**
 * A small speech bubble in the bottom-left corner, above the tab bar, on
 * every signed-in screen. Native modals cover it, which is right.
 */
export function FeedbackFab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const pathname = usePathname();
  const profile = useProfile();

  if (!SHOW_FEEDBACK_FAB || !profile.data || segments[0] === '(auth)') return null;
  const onTabs = segments[0] === '(tabs)';

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/feedback', params: { from: pathname } })}
      accessibilityRole="button"
      accessibilityLabel="Send feedback"
      hitSlop={6}
      className="absolute h-10 w-10 items-center justify-center rounded-full active:opacity-80"
      style={{
        left: 16,
        bottom: insets.bottom + (onTabs ? TAB_BAR + 44 : 20),
        backgroundColor: colors.ink,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      }}>
      <Icon name="bubble.left.fill" size={16} color={colors.canvas} />
    </Pressable>
  );
}
