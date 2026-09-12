import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Wordmark } from '@/components/ui';
import { colors } from '@/theme';
import { savePendingInvite } from '@/lib/invites';

/**
 * The first thing you see. Four big colour shapes in the top third, the
 * wordmark with its pint apostrophe under them, one line, one button. The
 * shapes drift very slowly so the screen feels alive without doing anything.
 */
export default function Welcome() {
  const router = useRouter();

  // The eight characters from a mate's invite. Kept until the account exists,
  // then applied, the same way a tapped invite link is.
  const enterCode = () =>
    Alert.prompt('Invite code', 'The eight characters from your mate’s invite.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        onPress: (value?: string) => {
          const code = (value ?? '').trim().toUpperCase();
          if (code.length !== 8) {
            Alert.alert('That does not look right', 'Invite codes are eight characters.');
            return;
          }
          void savePendingInvite(code).then(() => router.push('/sign-in'));
        },
      },
    ]);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t]);

  const drift = (dx: number, dy: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({ transform: [{ translateX: t.value * dx }, { translateY: t.value * dy }] }));
  const a = drift(10, 14);
  const b = drift(-12, 8);
  const c = drift(8, -10);
  const d = drift(-6, -12);

  const s = Math.min(width / 390, height / 844);
  const top = insets.top;

  return (
    <View className="flex-1" style={{ backgroundColor: '#FFFFFF' }}>
      {/* The four Signal shapes live in the top third and never reach the words. */}
      <View style={{ height: 340 * s + top, position: 'relative' }}>
        <Animated.View style={[shape(-70 * s, 30 * s + top, 250 * s, colors.you), a]} />
        <Animated.View style={[shape(190 * s, 50 * s + top, 210 * s, colors.butter), b]} />
        <Animated.View style={[shape(40 * s, 196 * s + top, 260 * s, colors.ale, 90 * s, '-12deg'), c]} />
        <Animated.View style={[shape(270 * s, 200 * s + top, 120 * s, colors.mint), d]} />
      </View>

      <View style={{ paddingHorizontal: 26 * s, paddingTop: 8 * s }}>
        <Wordmark size={96 * s} />
      </View>

      <View className="flex-1 justify-end gap-6 px-6" style={{ paddingBottom: insets.bottom + 20 }}>
        <Text className="text-[17px] leading-6" style={{ color: '#6E6E78', fontWeight: '500' }}>
          The pub map for you and your mates.
        </Text>
        <Button label="Get started" onPress={() => router.push('/sign-in')} />
        <Text className="text-center text-[14px]" style={{ color: '#6E6E78' }}>
          Got an invite code?{' '}
          <Text style={{ color: colors.you, fontWeight: '700' }} onPress={enterCode} accessibilityRole="button">
            Enter it
          </Text>
        </Text>
      </View>
    </View>
  );
}

function shape(left: number, top: number, size: number, color: string, height?: number, rotate?: string) {
  return {
    position: 'absolute' as const,
    left,
    top,
    width: size,
    height: height ?? size,
    borderRadius: (height ?? size) / 2,
    backgroundColor: color,
    transform: rotate ? [{ rotate }] : undefined,
  };
}
