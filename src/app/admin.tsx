import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { Card, EmptyState, ListRow, SectionTitle } from '@/components/ui';
import { useAdminStats, useIsAdmin } from '@/lib/admin';
import { colors, fonts } from '@/theme';

/** The numbers you show an advertiser or a buyer. Admins only. */
export default function AdminScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isAdmin = useIsAdmin();
  const stats = useAdminStats(Boolean(isAdmin.data));
  const s = stats.data;

  if (isAdmin.isSuccess && !isAdmin.data) {
    return <EmptyState icon="lock" title="Admins only" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Numbers' }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-4 pb-10 pt-2"
        refreshControl={<RefreshControl refreshing={stats.isRefetching} onRefresh={() => void stats.refetch()} />}>
        {!s ? (
          <View className="py-10">
            <ActivityIndicator color={colors.ale} />
          </View>
        ) : (
          <>
            <View className="flex-row gap-2">
              <Tile value={s.active_7d} label="Active 7d" bg={colors.you} fg="#fff" />
              <Tile value={s.active_30d} label="Active 30d" bg={colors.butter} fg="#101014" />
              <Tile value={s.users} label="Users" bg={colors.mint} fg="#101014" />
            </View>
            <View className="flex-row gap-2">
              <Tile value={s.checkins_7d} label="Check-ins 7d" bg={colors.surface} fg={colors.ink} />
              <Tile value={s.new_users_7d} label="New 7d" bg={colors.surface} fg={colors.ink} />
              <Tile value={s.friendships} label="Friendships" bg={colors.surface} fg={colors.ink} />
            </View>

            <View>
              <SectionTitle>Check-ins by week</SectionTitle>
              <Card>
                <View className="p-4">
                  <Bars data={s.weekly.map((w) => w.checkins)} width={width - 64} />
                  <View className="mt-2 flex-row justify-between">
                    <Text className="text-ink-soft text-[11px]">{s.weekly[0]?.week ?? ''}</Text>
                    <Text className="text-ink-soft text-[11px]">this week</Text>
                  </View>
                </View>
              </Card>
            </View>

            <View>
              <SectionTitle>Boroughs, last 30 days</SectionTitle>
              <Card>
                {s.boroughs.length === 0 ? <EmptyState icon="map" title="Nothing yet" /> : null}
                {s.boroughs.map((b, i) => (
                  <ListRow key={b.borough} title={b.borough} right={<Text className="text-ink text-[16px] font-bold">{b.checkins}</Text>} chevron={false} last={i === s.boroughs.length - 1} />
                ))}
              </Card>
            </View>

            <View>
              <SectionTitle>Top pubs, last 30 days</SectionTitle>
              <Card>
                {s.top_pubs.length === 0 ? <EmptyState icon="mappin" title="Nothing yet" /> : null}
                {s.top_pubs.map((p, i) => (
                  <ListRow
                    key={p.id}
                    title={p.name}
                    subtitle={[p.borough, `${p.visitors} ${p.visitors === 1 ? 'person' : 'people'}`].filter(Boolean).join(' · ')}
                    right={<Text className="text-ink text-[16px] font-bold">{p.checkins}</Text>}
                    onPress={() => router.push({ pathname: '/pub/[id]', params: { id: p.id } })}
                    last={i === s.top_pubs.length - 1}
                  />
                ))}
              </Card>
            </View>

            <Text className="text-ink-soft px-1 text-[12px]">
              {s.checkins_total} check-ins, {s.photos_total} photos and {s.friendships} friendships all time.
            </Text>
          </>
        )}
      </ScrollView>
    </>
  );
}

function Tile({ value, label, bg, fg }: { value: number; label: string; bg: string; fg: string }) {
  return (
    <View className="flex-1 rounded-lg px-3.5 py-3.5" style={{ backgroundColor: bg }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: fg }}>{value}</Text>
      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: fg, opacity: 0.85 }}>{label}</Text>
    </View>
  );
}

function Bars({ data, width }: { data: number[]; width: number }) {
  const n = Math.max(data.length, 1);
  const gap = 6;
  const bar = (width - gap * (n - 1)) / n;
  const max = Math.max(1, ...data);
  const h = 72;
  return (
    <Svg width={width} height={h}>
      {data.map((v, i) => (
        <Rect key={i} x={i * (bar + gap)} y={h - Math.max(3, (v / max) * h)} width={bar} height={Math.max(3, (v / max) * h)} rx={3} fill={i === data.length - 1 ? colors.you : colors.stoutSoft} />
      ))}
    </Svg>
  );
}
