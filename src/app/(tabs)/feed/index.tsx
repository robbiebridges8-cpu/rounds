import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { PostCard } from '@/components/post-card';
import { Button, Card, EmptyState, Icon } from '@/components/ui';
import { WeekCard } from '@/components/week-card';
import { useSession } from '@/lib/auth';
import { detectOvertakes, type Overtake } from '@/lib/digest';
import { useFeed, useRemoveCheers, type FeedPost } from '@/lib/feed';
import { useUnreadCount } from '@/lib/inbox';
import { useLeaderboard, useMyWeek, useWeeklySummary, type MyWeek } from '@/lib/social';
import { colors, fonts } from '@/theme';
import { usePull } from '@/lib/refresh';

export default function FeedScreen() {
  const router = useRouter();
  const { session } = useSession();
  const me = session?.user.id;

  const feed = useFeed();
  const week = useWeeklySummary();
  const myWeek = useMyWeek();
  const leaderboard = useLeaderboard();
  const removeCheers = useRemoveCheers();
  const [overtakes, setOvertakes] = useState<Overtake[]>([]);
  const unread = useUnreadCount();

  useEffect(() => {
    if (leaderboard.data) void detectOvertakes(leaderboard.data).then(setOvertakes);
  }, [leaderboard.data]);

  const posts = feed.data?.pages.flat() ?? [];

  const sayCheers = (post: FeedPost) => {
    if (post.cheers.some((c) => c.user_id === me)) {
      Alert.alert('Take back your cheers?', undefined, [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Take it back', style: 'destructive', onPress: () => removeCheers.mutate(post.id) },
      ]);
      return;
    }
    router.push({ pathname: '/cheers/[checkinId]', params: { checkinId: post.id } });
  };

  const pull = usePull(() => Promise.all([feed.refetch(), week.refetch(), myWeek.refetch(), leaderboard.refetch()]));

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Feed',
          headerRight: () => (
            <View className="flex-row items-center gap-5">
              <Pressable onPress={() => router.push('/search')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Search pubs">
                <Icon name="magnifyingglass" size={20} color={colors.ink} weight="semibold" />
              </Pressable>
              <Pressable onPress={() => router.push('/inbox')} hitSlop={8} accessibilityRole="button" accessibilityLabel={unread ? `Inbox, ${unread} unread` : 'Inbox'} className="flex-row items-center">
                <Icon name={unread ? 'bell.fill' : 'bell'} size={20} color={unread ? colors.ale : colors.ink} />
                {unread ? (
                  <View className="-ml-1 -mt-3 h-[18px] min-w-[18px] items-center justify-center rounded-full px-1" style={{ backgroundColor: colors.ale }}>
                    <Text className="text-[11px] font-bold text-white">{unread > 9 ? '9+' : unread}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
          ),
        }}
      />
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-4 pb-10 pt-2"
        refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
        }}
        ListHeaderComponent={
          <View className="gap-4">
            {unread > 0 ? (
              <Pressable onPress={() => router.push('/inbox')} accessibilityRole="button" className="flex-row items-center gap-3 rounded-lg px-4 py-3 active:opacity-90" style={{ backgroundColor: colors.ale }}>
                <Icon name="bell.fill" size={16} color="#fff" weight="bold" />
                <Text className="flex-1 text-[15px] font-bold text-white">{`${unread} new for you`}</Text>
                <Icon name="chevron.right" size={13} color="#fff" weight="bold" />
              </Pressable>
            ) : null}
            {overtakes.map((o) => (
              <OvertakeCard key={o.userId} overtake={o} onPress={() => router.push('/friends')} />
            ))}
            <WeekCard summary={week.data ?? null} myId={me} />
            <PersonalWeek data={myWeek.data ?? null} />
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            me={me}
            onOpen={() => router.push({ pathname: '/post/[id]', params: { id: item.id } })}
            onCheers={() => void sayCheers(item)}
          />
        )}
        ListEmptyComponent={
          feed.isPending ? (
            <View className="py-10">
              <ActivityIndicator color={colors.ale} />
            </View>
          ) : (
            <Card>
              <EmptyState
                icon="bubble.left.and.bubble.right"
                title="Nothing here yet"
                body="Check in somewhere, or invite a mate.">
                <View className="w-full pt-4">
                  <Button label="Find a pub" icon="map" onPress={() => router.push('/')} />
                </View>
              </EmptyState>
            </Card>
          )
        }
        ListFooterComponent={
          feed.isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator color={colors.ale} />
            </View>
          ) : null
        }
      />
    </>
  );
}

/** "You: 3 check-ins, 2 new pubs. Best week so far." One line, no fuss. */
function PersonalWeek({ data }: { data: MyWeek | null }) {
  if (!data || data.weeks_active === 0) return null;
  const isBest = data.this_week > 0 && data.this_week >= data.best_week;
  return (
    <View className="flex-row items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
      <Icon name={isBest ? 'sparkles' : 'person.fill'} size={16} color={isBest ? colors.you : colors.inkSoft} />
      <Text className="text-ink flex-1 text-[15px] leading-5">
        <Text className="font-semibold">You this week: </Text>
        {data.this_week === 0
          ? 'nothing yet. Your best is ' + data.best_week + '.'
          : `${data.this_week} ${data.this_week === 1 ? 'check-in' : 'check-ins'}` +
            (data.new_pubs > 0 ? `, ${data.new_pubs} new ${data.new_pubs === 1 ? 'pub' : 'pubs'}` : '') +
            (isBest ? '. Your best week yet.' : `. Best is ${data.best_week}.`)}
      </Text>
    </View>
  );
}

function OvertakeCard({ overtake, onPress }: { overtake: Overtake; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-4 rounded-lg px-4 py-4 active:opacity-90"
      style={{ backgroundColor: colors.danger }}>
      <Icon name="arrow.up.right" size={22} color="#fff" weight="bold" />
      <View className="flex-1">
        <Text style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: '#fff' }}>
          {overtake.name} overtook you
        </Text>
        <Text className="text-[14px] text-white/85">
          {overtake.theirs} boroughs to your {overtake.mine}. Sort it out.
        </Text>
      </View>
      <Icon name="chevron.right" size={14} color="#fff" weight="semibold" />
    </Pressable>
  );
}
