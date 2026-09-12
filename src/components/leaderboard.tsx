import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar, Card, EmptyState } from '@/components/ui';
import type { LeaderboardRow } from '@/lib/social';
import { colors, fonts } from '@/theme';

const MEDALS = [colors.you, '#B9B4AD', '#C98C5A'];

export type Metric = 'borough_count' | 'pub_count' | 'month_checkins' | 'badge_count';

export const METRICS: { key: Metric; label: string; unit: string; resets?: string }[] = [
  { key: 'borough_count', label: 'Boroughs', unit: 'boroughs' },
  { key: 'pub_count', label: 'Pubs', unit: 'pubs' },
  { key: 'month_checkins', label: 'This month', unit: 'check-ins', resets: 'Resets on the 1st' },
  { key: 'badge_count', label: 'Badges', unit: 'badges' },
];

/** Segmented control for the metric. Native-looking, scrolls if it must. */
export function MetricPicker({ value, onChange }: { value: Metric; onChange: (m: Metric) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-1 pb-3">
      {METRICS.map((m) => {
        const on = m.key === value;
        return (
          <Pressable
            key={m.key}
            onPress={() => onChange(m.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            className={`h-9 items-center justify-center rounded-full px-4 ${
              on ? 'bg-ink' : 'border border-line bg-surface'
            }`}>
            <Text className={`text-[14px] font-semibold ${on ? 'text-canvas' : 'text-ink'}`}>{m.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Ranked by one number. Which number is the reader's choice. */
export function Leaderboard({ rows, metric }: { rows: LeaderboardRow[]; metric: Metric }) {
  const router = useRouter();
  const spec = METRICS.find((m) => m.key === metric)!;

  if (rows.length <= 1) {
    return (
      <Card>
        <EmptyState
          icon="trophy"
          title="Just you so far"
          body="Invite a mate."
        />
      </Card>
    );
  }

  const sorted = [...rows].sort(
    (a, b) => b[metric] - a[metric] || b.pub_count - a.pub_count || b.checkin_count - a.checkin_count
  );

  return (
    <Card>
      {sorted.map((row, index) => {
        const last = index === sorted.length - 1;
        const tiedWithPrevious = index > 0 && sorted[index - 1][metric] === row[metric];
        const rank = tiedWithPrevious ? sorted.findIndex((r) => r[metric] === row[metric]) + 1 : index + 1;
        return (
          <Pressable
            key={row.user_id}
            disabled={row.is_me}
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: row.user_id } })}
            className={`flex-row items-center gap-3 px-4 ${row.is_me ? 'bg-ale-tint/60' : 'active:bg-ale-tint'}`}>
            <View className="w-7 items-center">
              {rank <= 3 ? (
                <View
                  className="h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: MEDALS[rank - 1] }}>
                  <Text className="text-[13px] font-extrabold text-white">{rank}</Text>
                </View>
              ) : (
                <Text className="text-ink-soft text-[15px] font-semibold">{rank}</Text>
              )}
            </View>
            <Avatar url={row.avatar_url} name={row.display_name} size={40} />
            <View className={`flex-1 flex-row items-center gap-3 py-3 ${last ? '' : 'border-b border-line'}`}>
              <View className="flex-1">
                <Text className="text-ink text-[17px] font-semibold" numberOfLines={1}>
                  {row.is_me ? 'You' : row.display_name}
                </Text>
                <Text className="text-ink-soft text-[13px]">
                  {metric === 'borough_count'
                    ? `${row.pub_count} ${row.pub_count === 1 ? 'pub' : 'pubs'}`
                    : metric === 'month_checkins'
                      ? `${row.month_pubs} ${row.month_pubs === 1 ? 'pub' : 'pubs'} this month`
                      : `${row.borough_count} ${row.borough_count === 1 ? 'borough' : 'boroughs'}`}
                </Text>
              </View>
              <View className="items-end">
                <Text
                  className="text-ink"
                  style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30, fontVariant: ['tabular-nums'] }}>
                  {row[metric]}
                </Text>
                <Text className="text-ink-soft text-[11px] font-semibold uppercase tracking-wide">
                  {spec.unit}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </Card>
  );
}
