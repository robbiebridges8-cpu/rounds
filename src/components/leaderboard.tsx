import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Avatar, Card, EmptyState } from '@/components/ui';
import type { LeaderboardRow } from '@/lib/social';
import { colors, fonts } from '@/theme';

const MEDALS = [colors.gold, '#B9B4AD', '#C98C5A'];

/** Ranked by boroughs. One number everyone can argue about over a pint. */
export function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  const router = useRouter();

  if (rows.length <= 1) {
    return (
      <Card>
        <EmptyState
          icon="trophy"
          title="A league of one"
          body="Invite a mate and this becomes a race for boroughs."
        />
      </Card>
    );
  }

  return (
    <Card>
      {rows.map((row, index) => {
        const last = index === rows.length - 1;
        return (
          <Pressable
            key={row.user_id}
            disabled={row.is_me}
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: row.user_id } })}
            className={`flex-row items-center gap-3 px-4 ${row.is_me ? 'bg-ale-tint/60' : 'active:bg-ale-tint'}`}>
            <View className="w-7 items-center">
              {index < 3 ? (
                <View
                  className="h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: MEDALS[index] }}>
                  <Text className="text-[13px] font-extrabold text-white">{index + 1}</Text>
                </View>
              ) : (
                <Text className="text-ink-soft text-[15px] font-semibold">{index + 1}</Text>
              )}
            </View>
            <Avatar url={row.avatar_url} name={row.display_name} size={40} />
            <View className={`flex-1 flex-row items-center gap-3 py-3 ${last ? '' : 'border-b border-line'}`}>
              <View className="flex-1">
                <Text className="text-ink text-[17px] font-semibold" numberOfLines={1}>
                  {row.is_me ? 'You' : row.display_name}
                </Text>
                <Text className="text-ink-soft text-[13px]">
                  {row.pub_count} {row.pub_count === 1 ? 'pub' : 'pubs'} · {row.checkin_count}{' '}
                  {row.checkin_count === 1 ? 'check-in' : 'check-ins'}
                </Text>
              </View>
              <View className="items-end">
                <Text
                  className="text-ink"
                  style={{ fontFamily: fonts.displayBlack, fontSize: 26, lineHeight: 30, fontVariant: ['tabular-nums'] }}>
                  {row.borough_count}
                </Text>
                <Text className="text-ink-soft text-[11px] font-semibold uppercase tracking-wide">
                  boroughs
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </Card>
  );
}
