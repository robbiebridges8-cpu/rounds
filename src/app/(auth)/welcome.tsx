import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { colors, fonts } from '@/theme';
import { APP_NAME } from '@/lib/brand';

/**
 * The first thing you see. Four big colour shapes, the wordmark in an ink
 * disc, one line of copy, one button. The shapes drift very slowly so the
 * screen feels alive without doing anything.
 */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
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

  const s = width / 390;

  return (
    <View className="flex-1" style={{ backgroundColor: palettesLight.surface }}>
      <View style={{ height: 500 * s, position: 'relative' }}>
        <Animated.View style={[shape(-60 * s, 40 * s + insets.top, 300 * s, colors.you), a]} />
        <Animated.View style={[shape(150 * s, 120 * s + insets.top, 260 * s, colors.butter), b]} />
        <Animated.View style={[shape(40 * s, 300 * s + insets.top, 320 * s, colors.ale, 120 * s, '-12deg'), c]} />
        <Animated.View style={[shape(250 * s, 330 * s + insets.top, 150 * s, colors.mint), d]} />
        <View
          style={{
            position: 'absolute',
            left: 96 * s,
            top: 186 * s + insets.top,
            width: 180 * s,
            height: 180 * s,
            borderRadius: 90 * s,
            backgroundColor: '#101014',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 30 * s, color: '#FFFFFF', letterSpacing: -1 }}>{APP_NAME.toLowerCase()}</Text>
          <Text style={{ fontSize: 11, color: colors.butter, fontWeight: '800', letterSpacing: 2 }}>LONDON</Text>
        </View>
      </View>

      <View className="flex-1 justify-end gap-6 px-6" style={{ paddingBottom: insets.bottom + 20 }}>
        <View className="gap-3">
          <Text style={{ fontFamily: fonts.display, fontSize: 38, lineHeight: 40, letterSpacing: -1.4, color: '#101014' }}>
            Pubs.{'\n'}Mates.{'\n'}
            <Text style={{ color: colors.you }}>London.</Text>
          </Text>
          <Text className="text-[16px] leading-6" style={{ color: '#6E6E78' }}>
            Check in, fill in the boroughs, see where your mates have been.
          </Text>
        </View>
        <Button label="Get started" onPress={() => router.push('/sign-in')} />
        <Text className="text-center text-[14px]" style={{ color: '#6E6E78' }}>
          Got an invite code? <Text style={{ color: colors.you, fontWeight: '700' }}>Enter it</Text>
        </Text>
      </View>
    </View>
  );
}

const palettesLight = { surface: '#FFFFFF' };

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
