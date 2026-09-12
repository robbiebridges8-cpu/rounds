import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui';
import type { WeeklySummary } from '@/lib/social';
import { colors } from '@/theme';

/** The last seven days, you and your mates. The Sunday notification lands here. */
export function WeekCard({ summary, myId }: { summary: WeeklySummary | null; myId?: string }) {
  const router = useRouter();
  const quiet = !summary || summary.checkin_count === 0;

  return (
    <View className="overflow-hidden rounded-lg bg-stout px-5 py-5">
      <View className="flex-row items-center gap-2">
        <Icon name="calendar" size={14} color={colors.butter} weight="bold" />
        <Text className="text-[12px] font-bold uppercase tracking-wider" style={{ color: colors.butter }}>
          This week
        </Text>
      </View>

      {quiet ? (
        <>
          <Text className="mt-3 font-display text-[26px] leading-8 text-white">Quiet week.</Text>
          <Text className="mt-1 text-[15px] leading-5" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Nobody has checked in for seven days. Fix that.
          </Text>
        </>
      ) : (
        <>
          <Text className="mt-3 font-display text-[26px] leading-8 text-white">
            {summary.checkin_count} {summary.checkin_count === 1 ? 'check-in' : 'check-ins'}
            {summary.people_count > 1 ? ` by ${summary.people_count} of you` : ''}
          </Text>
          <Text className="mt-1 text-[15px] leading-5" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {summary.new_pub_count > 0
              ? `${summary.new_pub_count} ${summary.new_pub_count === 1 ? 'pub' : 'pubs'} nobody had been to before.`
              : 'No new pubs this week.'}
          </Text>

          <View className="mt-4 gap-2">
            {summary.top_pub_id ? (
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/pub/[id]', params: { id: summary.top_pub_id } })
                }
                className="flex-row items-center gap-3 rounded-lg px-3 py-2.5 active:opacity-80"
                style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
                <Icon name="flame.fill" size={18} color={colors.butter} />
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-white" numberOfLines={1}>
                    {summary.top_pub_name}
                  </Text>
                  <Text className="text-[13px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Most visited · {summary.top_pub_visits}{' '}
                    {summary.top_pub_visits === 1 ? 'visit' : 'visits'}
                    {summary.top_pub_rating != null ? ` · ${Number(summary.top_pub_rating).toFixed(1)} stars` : ''}
                  </Text>
                </View>
                <Icon name="chevron.right" size={12} color={colors.butter} weight="semibold" />
              </Pressable>
            ) : null}

            {summary.busiest_user_id ? (
              <View
                className="flex-row items-center gap-3 rounded-lg px-3 py-2.5"
                style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
                <Icon name="figure.walk" size={18} color={colors.butter} />
                <Text className="flex-1 text-[15px] text-white">
                  <Text className="font-semibold">
                    {summary.busiest_user_id === myId ? 'You' : summary.busiest_display_name}
                  </Text>{' '}
                  went out the most: {summary.busiest_checkins}{' '}
                  {summary.busiest_checkins === 1 ? 'time' : 'times'}.
                </Text>
              </View>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}
