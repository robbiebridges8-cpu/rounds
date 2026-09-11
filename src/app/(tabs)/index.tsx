import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import Svg, { Path, Rect } from 'react-native-svg';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, MapButton, Stars } from '@/components/ui';
import { plural } from '@/lib/format';
import { LONDON_REGION, getPosition } from '@/lib/location';
import { useMapPubs, usePubPhotos, type Bounds, type MapPub } from '@/lib/pubs';
import { usePref } from '@/lib/prefs';
import { useTheme } from '@/lib/theme-provider';
import { colors, fonts } from '@/theme';

const boundsOf = (region: Region): Bounds => ({
  minLat: region.latitude - region.latitudeDelta / 2,
  maxLat: region.latitude + region.latitudeDelta / 2,
  minLng: region.longitude - region.longitudeDelta / 2,
  maxLng: region.longitude + region.longitudeDelta / 2,
});

type Tier = 'me' | 'mate' | 'none';
type Filter = 'all' | 'me' | 'mate' | 'none';

const tierOf = (pub: MapPub): Tier => (pub.visited_by_me ? 'me' : pub.friend_visits > 0 ? 'mate' : 'none');

const CHIP_COLOR: Record<Filter, string> = { all: '#101014', me: '#FFD23F', mate: '#FF5A3C', none: '#101014' };
const CHIP_TEXT: Record<Filter, string> = { all: '#FFFFFF', me: '#101014', mate: '#FFFFFF', none: '#FFFFFF' };

const CHIPS: { key: Filter; label: string; icon?: 'checkmark' | 'person.2.fill' | 'circle.dashed' }[] = [
  { key: 'all', label: 'All' },
  { key: 'me', label: 'Been', icon: 'checkmark' },
  { key: 'mate', label: 'Mates', icon: 'person.2.fill' },
  { key: 'none', label: 'Not yet', icon: 'circle.dashed' },
];

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scheme } = useTheme();
  const [pints] = usePref('pint-pins');
  const mapRef = useRef<MapView>(null);
  const [bounds, setBounds] = useState<Bounds>(() => boundsOf(LONDON_REGION));
  const [wide, setWide] = useState(true);
  const [selected, setSelected] = useState<MapPub | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  // City zoom shows only pubs with life in them; a neighbourhood shows all.
  const { data: pubs } = useMapPubs(bounds, wide);

  const locate = async () => {
    const coords = await getPosition();
    if (!coords) return;
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.012, longitudeDelta: 0.009 }, 500);
  };

  useEffect(() => {
    void locate();
  }, []);

  const current = selected ? (pubs?.find((p) => p.id === selected.id) ?? selected) : null;
  const shown = pubs?.filter((p) => filter === 'all' || tierOf(p) === filter);
  // Unvisited dots are a mid grey, not the palette's pale slate: on Apple's
  // muted map the pale one vanished.
  const tierColor: Record<Tier, string> = { me: colors.you, mate: colors.mates, none: '#8A8A96' };

  return (
    <View className="flex-1 bg-canvas">
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={LONDON_REGION}
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        userInterfaceStyle={scheme === 'light' ? 'light' : 'dark'}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsPointsOfInterests={false}
        showsBuildings={false}
        onPress={() => setSelected(null)}
        onRegionChangeComplete={(region) => {
          setBounds(boundsOf(region));
          setWide(region.latitudeDelta > 0.028);
        }}>
        {shown?.map((pub) => {
          const tier = tierOf(pub);
          const active = pub.id === current?.id;
          return (
            <Marker
              key={`${pub.id}-${pints ? 'pint' : 'dot'}`}
              identifier={pub.id}
              coordinate={{ latitude: pub.lat, longitude: pub.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={active}
              onPress={(event) => {
                event.stopPropagation();
                setSelected(pub);
              }}
              zIndex={active ? 3 : tier === 'me' ? 2 : tier === 'mate' ? 1 : 0}>
              {pints ? <PintPin color={tierColor[tier]} active={active} small={tier === 'none'} /> : <Pin color={tierColor[tier]} active={active} small={tier === 'none'} />}
            </Marker>
          );
        })}
      </MapView>

      {/* Resy's top: a search bar and a row of chips. */}
      <View className="absolute left-4 right-4 gap-2" style={{ top: insets.top + 8 }}>
        <View>
          <View className="absolute left-0 right-0 top-[6px] h-[54px] rounded-full bg-ink" />
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityRole="search"
            className="h-[54px] flex-row items-center gap-3 rounded-full border-2 border-ink bg-surface px-[18px] active:opacity-90">
            <Icon name="magnifyingglass" size={18} color={colors.ink} weight="bold" />
            <Text className="text-ink text-[16px] font-bold">Search</Text>
            <Text className="text-ink-soft text-[16px]">any London pub</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {CHIPS.map((chip) => {
            const on = filter === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setFilter(chip.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                className="h-9 flex-row items-center gap-1.5 rounded-full px-4"
                style={{
                  backgroundColor: on ? CHIP_COLOR[chip.key] : colors.surface,
                  borderWidth: 2,
                  borderColor: on ? CHIP_COLOR[chip.key] : colors.ink,
                }}>
                {chip.icon ? <Icon name={chip.icon} size={12} color={on ? CHIP_TEXT[chip.key] : colors.ink} weight="bold" /> : null}
                <Text className="text-[14px] font-bold" style={{ color: on ? CHIP_TEXT[chip.key] : colors.ink }}>{chip.label}</Text>
              </Pressable>
            );
          })}
          {wide || (pubs && pubs.length >= 400) ? (
            <View className="h-9 flex-row items-center gap-1.5 rounded-full bg-surface px-3">
              <Icon name="plus.magnifyingglass" size={12} color={colors.inkSoft} />
              <Text className="text-ink-soft text-[12px] font-semibold">Zoom in for every pub</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>

      <View className="absolute right-4" style={{ bottom: current ? 310 : 64 }}>
        <MapButton icon="location.fill" label="Show my location" onPress={() => void locate()} />
      </View>

      <View className="absolute left-4 right-4 gap-2" style={{ bottom: 12 }}>
        {current ? (
          <Animated.View key={current.id} entering={FadeInDown.springify().damping(18).stiffness(220)} exiting={FadeOutDown.duration(140)}>
            <Preview
              pub={current}
              onOpen={() => router.push({ pathname: '/pub/[id]', params: { id: current.id } })}
              onCheckIn={() => router.push({ pathname: '/checkin/[pubId]', params: { pubId: current.id } })}
            />
          </Animated.View>
        ) : (
          <View className="flex-row items-center gap-4 self-center rounded-full bg-surface px-4 py-2" style={shadow}>
            <Legend color={colors.you} label="Been" />
            <Legend color={colors.mates} label="Mates" />
            {!wide ? <Legend color="#8A8A96" label="Not yet" /> : null}
          </View>
        )}
        <Text className="text-ink-soft self-start text-[10px]">© OpenStreetMap contributors</Text>
      </View>
    </View>
  );
}

/**
 * Experiment: a pint glass instead of a dot. The beer is the tier colour,
 * the head is white, the glass outline is the surface colour.
 */
function PintPin({ color, active, small }: { color: string; active: boolean; small: boolean }) {
  const h = active ? 34 : small ? 18 : 26;
  const w = h * 0.7;
  return (
    <Svg width={w} height={h} viewBox="0 0 14 20">
      <Path d="M2 3 L12 3 L11 18.5 Q11 19.5 10 19.5 L4 19.5 Q3 19.5 3 18.5 Z" fill={color} stroke={colors.surface} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M2 3 L12 3 L11.6 6.5 L2.4 6.5 Z" fill="#FFFFFF" />
      <Rect x="4.4" y="8" width="1.4" height="9" rx="0.7" fill="rgba(255,255,255,0.35)" />
    </Svg>
  );
}

/** A dot with a light ring, sized by tier. */
function Pin({ color, active, small }: { color: string; active: boolean; small: boolean }) {
  const size = active ? 28 : small ? 12 : 18;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: active ? 4 : 2,
        borderColor: colors.surface,
        opacity: 1,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      }}
    />
  );
}

/** Resy's card: a photo strip, the name, a red star rating, and the action. */
function Preview({ pub, onOpen, onCheckIn }: { pub: MapPub; onOpen: () => void; onCheckIn: () => void }) {
  const { width } = useWindowDimensions();
  const photos = usePubPhotos(pub.id);
  const inner = width - 32;
  const meta = [pub.checkin_count > 0 ? plural(pub.checkin_count, 'visit') : null, pub.friend_visits > 0 ? plural(pub.friend_visits, 'mate') : null].filter(Boolean);

  return (
    <Pressable onPress={onOpen} accessibilityRole="button" className="overflow-hidden rounded-lg active:opacity-95" style={[shadow, { backgroundColor: colors.butter }]}>
      {photos.data && photos.data.length > 0 ? (
        <View className="p-3 pb-0">
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ height: 120, borderRadius: 14 }}>
            {photos.data.map((p) => (
              <Image key={p.uri} source={{ uri: p.uri }} style={{ width: inner - 24, height: 120, borderRadius: 14 }} contentFit="cover" transition={150} />
            ))}
          </ScrollView>
        </View>
      ) : null}
      <View className="gap-3 p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text style={{ fontFamily: fonts.display, fontSize: 21, lineHeight: 24, letterSpacing: -0.5, color: '#101014' }} numberOfLines={2}>
              {pub.name}
            </Text>
            <Text className="text-[13px] font-semibold" style={{ color: '#101014' }} numberOfLines={1}>
              {meta.length ? meta.join(' · ') : 'Nobody you know has been'}
            </Text>
          </View>
          <View className="items-end gap-0.5">
            <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: '#101014' }}>
              {pub.avg_rating != null ? Number(pub.avg_rating).toFixed(1) : '–'}
            </Text>
            <Stars value={pub.avg_rating} size={11} color="#101014" />
          </View>
        </View>
        <View className="flex-row gap-2">
          <Pressable onPress={onCheckIn} accessibilityRole="button" className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-full active:opacity-80" style={{ backgroundColor: '#101014' }}>
            <Icon name="mappin.and.ellipse" size={14} color="#fff" weight="bold" />
            <Text className="text-[15px] font-bold text-white">Check in</Text>
          </Pressable>
          <Pressable onPress={onOpen} accessibilityRole="button" className="h-12 flex-row items-center justify-center rounded-full bg-white px-5 active:opacity-80">
            <Text className="text-[15px] font-bold" style={{ color: '#101014' }}>Details</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-ink text-xs font-bold">{label}</Text>
    </View>
  );
}

const shadow = {
  shadowColor: '#10214A',
  shadowOpacity: 0.16,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
} as const;
