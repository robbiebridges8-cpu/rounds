import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useEffect } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Wordmark } from '@/components/ui';
import { colors, fonts } from '@/theme';

type Orb = { icon: SFSymbol; bg: string; fg: string; ring: number; angle: number; size: number };

const ORBS: Orb[] = [
  { icon: 'mug.fill', bg: '#FFD300', fg: '#10214A', ring: 1, angle: 20, size: 56 },
  { icon: 'mappin', bg: '#DC241F', fg: '#FFFFFF', ring: 1, angle: 200, size: 52 },
  { icon: 'person.fill', bg: '#00843D', fg: '#FFFFFF', ring: 2, angle: 95, size: 48 },
  { icon: 'star.fill', bg: '#10214A', fg: '#FFD300', ring: 2, angle: 250, size: 46 },
  { icon: 'person.fill', bg: '#A0A5A9', fg: '#10214A', ring: 2, angle: 330, size: 44 },
  { icon: 'camera.fill', bg: '#FFFFFF', fg: '#DC241F', ring: 3, angle: 150, size: 44 },
  { icon: 'trophy.fill', bg: '#FFFFFF', fg: '#10214A', ring: 3, angle: 40, size: 42 },
];

/**
 * The first thing you see. A slow orbit of the things the app is about, on a
 * soft wash of the line colours, and one button. Luma's welcome without the
 * 3D renders.
 */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 90_000, easing: Easing.linear }), -1, false);
  }, [spin]);

  const orbit = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const counter = useAnimatedStyle(() => ({ transform: [{ rotate: `${-spin.value}deg` }] }));

  const radius = [0, width * 0.24, width * 0.36, width * 0.47];
  const centre = width / 2;

  return (
    <View className="flex-1 bg-canvas">
      <LinearGradient
        colors={['#FBE4E3', '#F5F3EC', '#CFE9D8', '#FFF4B8']}
        locations={[0, 0.45, 0.8, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />

      <View style={{ height: width, marginTop: insets.top + 24 }}>
        {[1, 2, 3].map((ring) => (
          <View
            key={ring}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: centre - radius[ring],
              top: centre - radius[ring],
              width: radius[ring] * 2,
              height: radius[ring] * 2,
              borderRadius: radius[ring],
              borderWidth: 1.5,
              borderColor: 'rgba(16,33,74,0.10)',
            }}
          />
        ))}

        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width, height: width }, orbit]}>
          {ORBS.map((orb, i) => {
            const a = (orb.angle * Math.PI) / 180;
            const x = centre + Math.cos(a) * radius[orb.ring] - orb.size / 2;
            const y = centre + Math.sin(a) * radius[orb.ring] - orb.size / 2;
            return (
              <Animated.View
                key={i}
                style={[
                  {
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: orb.size,
                    height: orb.size,
                    borderRadius: orb.size / 2,
                    backgroundColor: orb.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#10214A',
                    shadowOpacity: 0.18,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                  },
                  counter,
                ]}>
                <Icon name={orb.icon} size={orb.size * 0.42} color={orb.fg} weight="bold" />
              </Animated.View>
            );
          })}
        </Animated.View>

        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: centre - 44,
            top: centre - 44,
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Wordmark size={26} color="#F5F3EC" />
        </View>
      </View>

      <View className="flex-1 justify-end gap-6 px-6" style={{ paddingBottom: insets.bottom + 20 }}>
        <View className="gap-1">
          <Text
            className="text-ink text-center"
            style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.2 }}>
            Every pub in London.
          </Text>
          <Text
            className="text-ale text-center"
            style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.2 }}>
            Which have you done?
          </Text>
          <Text className="text-ink-soft mt-3 text-center text-[17px] leading-6">
            Log the pubs you go to, turn boroughs yellow, and see where your mates have been.
          </Text>
        </View>
        <Button label="Get started" onPress={() => router.push('/sign-in')} />
      </View>
    </View>
  );
}
