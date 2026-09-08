import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, MapButton } from '@/components/ui';
import { formatRating, plural } from '@/lib/format';
import { LONDON_REGION, getPosition } from '@/lib/location';
import { useMapPubs, type Bounds, type MapPub } from '@/lib/pubs';
import { colors } from '@/theme';

const boundsOf = (region: Region): Bounds => ({
  minLat: region.latitude - region.latitudeDelta / 2,
  maxLat: region.latitude + region.latitudeDelta / 2,
  minLng: region.longitude - region.longitudeDelta / 2,
  maxLng: region.longitude + region.longitudeDelta / 2,
});

type Tier = 'me' | 'mate' | 'none';
const tierOf = (pub: MapPub): Tier =>
  pub.visited_by_me ? 'me' : pub.friend_visits > 0 ? 'mate' : 'none';

const TIER_COLOR: Record<Tier, string> = {
  me: colors.gold,
  mate: colors.mate,
  none: colors.slate,
};

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [bounds, setBounds] = useState<Bounds>(() => boundsOf(LONDON_REGION));
  const [selected, setSelected] = useState<MapPub | null>(null);
  const { data: pubs } = useMapPubs(bounds);

  const locate = async () => {
    const coords = await getPosition();
    if (!coords) return;
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.012, longitudeDelta: 0.009 }, 500);
  };

  useEffect(() => {
    void locate();
  }, []);

  // Keep the preview in step with fresh data after a check-in.
  const current = selected ? (pubs?.find((p) => p.id === selected.id) ?? selected) : null;

  return (
    <View className="flex-1 bg-cream">
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={LONDON_REGION}
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsPointsOfInterests={false}
        showsBuildings={false}
        onPress={() => setSelected(null)}
        onRegionChangeComplete={(region) => setBounds(boundsOf(region))}>
        {pubs?.map((pub) => {
          const tier = tierOf(pub);
          const active = pub.id === current?.id;
          return (
            <Marker
              key={pub.id}
              identifier={pub.id}
              coordinate={{ latitude: pub.lat, longitude: pub.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={active}
              onPress={(event) => {
                event.stopPropagation();
                setSelected(pub);
              }}
              zIndex={active ? 3 : tier === 'me' ? 2 : tier === 'mate' ? 1 : 0}>
              <Pin tier={tier} active={active} />
            </Marker>
          );
        })}
      </MapView>

      <View className="absolute right-4 gap-3" style={{ top: insets.top + 12 }}>
        <MapButton icon="location" label="Show my location" onPress={() => void locate()} />
        <MapButton icon="list.bullet" label="Pubs near me" onPress={() => router.push('/nearby')} />
      </View>

      {pubs && pubs.length >= 400 ? (
        <View
          className="absolute left-4 flex-row items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5"
          style={{ top: insets.top + 12 }}>
          <Icon name="plus.magnifyingglass" size={13} color={colors.inkSoft} />
          <Text className="text-ink-soft text-xs font-semibold">Zoom in to see every pub</Text>
        </View>
      ) : null}

      <View className="absolute left-4 right-4 gap-2" style={{ bottom: 12 }}>
        {current ? (
          <Animated.View
            key={current.id}
            entering={FadeInDown.springify().damping(18).stiffness(220)}
            exiting={FadeOutDown.duration(140)}>
            <Preview
              pub={current}
              onOpen={() => router.push({ pathname: '/pub/[id]', params: { id: current.id } })}
              onCheckIn={() =>
                router.push({ pathname: '/checkin/[pubId]', params: { pubId: current.id } })
              }
            />
          </Animated.View>
        ) : (
          <View
            className="flex-row items-center gap-4 self-center rounded-full border border-line bg-card px-4 py-2"
            style={shadow}>
            <Legend color={colors.gold} label="You" />
            <Legend color={colors.mate} label="Mates" />
            <Legend color={colors.slate} label="Unvisited" />
          </View>
        )}
        <Text className="text-ink-soft self-start text-[10px]">© OpenStreetMap contributors</Text>
      </View>
    </View>
  );
}

/** A dot, not a pin. Reads at any zoom and never covers the pub next door. */
function Pin({ tier, active }: { tier: Tier; active: boolean }) {
  const size = active ? 26 : tier === 'none' ? 12 : 16;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: TIER_COLOR[tier],
        borderWidth: active ? 4 : 2.5,
        borderColor: '#fff',
        opacity: tier === 'none' && !active ? 0.75 : 1,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      }}
    />
  );
}

function Preview({
  pub,
  onOpen,
  onCheckIn,
}: {
  pub: MapPub;
  onOpen: () => void;
  onCheckIn: () => void;
}) {
  const tier = tierOf(pub);
  const meta = [
    pub.checkin_count > 0 ? plural(pub.checkin_count, 'visit') : null,
    pub.friend_visits > 0 ? plural(pub.friend_visits, 'mate') : null,
  ].filter(Boolean);

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      className="rounded-lg border border-line bg-card p-4 active:bg-ale-tint"
      style={shadow}>
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-ink font-display text-[22px] leading-7" numberOfLines={2}>
            {pub.name}
          </Text>
          <View className="flex-row items-center gap-1.5">
            {pub.avg_rating != null ? (
              <>
                <Icon name="star.fill" size={12} color={colors.gold} />
                <Text className="text-ink text-[15px] font-semibold">
                  {formatRating(pub.avg_rating)}
                </Text>
              </>
            ) : null}
            <Text className="text-ink-soft text-[15px]">
              {meta.length
                ? (pub.avg_rating != null ? '· ' : '') + meta.join(' · ')
                : 'Nobody you know has been'}
            </Text>
          </View>
        </View>
        <View className="items-end gap-2">
          <View
            className="h-3 w-3 rounded-full border-2 border-white"
            style={{ backgroundColor: TIER_COLOR[tier] }}
          />
          <Pressable
            onPress={onCheckIn}
            accessibilityRole="button"
            className="h-10 flex-row items-center gap-1.5 rounded-full bg-ale px-4 active:bg-ale-dark">
            <Icon name="mappin.and.ellipse" size={14} color="#fff" weight="semibold" />
            <Text className="text-[15px] font-semibold text-white">Check in</Text>
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
      <Text className="text-ink text-xs font-semibold">{label}</Text>
    </View>
  );
}

const shadow = {
  shadowColor: '#2A1A0C',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
} as const;
