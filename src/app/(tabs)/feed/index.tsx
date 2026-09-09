import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { PostCard } from '@/components/post-card';
import { Button, Card, EmptyState, Icon } from '@/components/ui';
import { WeekCard } from '@/components/week-card';
import { useSession } from '@/lib/auth';
import { detectOvertakes, type Overtake } from '@/lib/digest';
import { useCheers, useFeed, useRemoveCheers, type FeedPost } from '@/lib/feed';
import { pickImage } from '@/lib/images';
import { useLeaderboard, useMyWeek, useWeeklySummary, type MyWeek } from '@/lib/social';
import { colors, fonts } from '@/theme';

export default function FeedScreen() {
  const router = useRouter();
  const { session } = useSession();
  const me = session?.user.id;

  const feed = useFeed();
  const week = useWeeklySummary();
  const myWeek = useMyWeek();
  const leaderboard = useLeaderboard();
  const cheers = useCheers();
  const removeCheers = useRemoveCheers();
  const [overtakes, setOvertakes] = useState<Overtake[]>([]);

  useEffect(() => {
    if (leaderboard.data) void detectOvertakes(leaderboard.data).then(setOvertakes);
  }, [leaderboard.data]);

  const posts = feed.data?.pages.flat() ?? [];

  const sayCheers = async (post: FeedPost) => {
    if (post.cheers.some((c) => c.user_id === me)) {
      Alert.alert('Take back your cheers?', undefined, [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Take it back', style: 'destructive', onPress: () => removeCheers.mutate(post.id) },
      ]);
      return;
    }
    const photo = await pickImage('camera');
    if (!photo) return;
    cheers.mutate(
      { checkinId: post.id, photo },
      {
        onSuccess: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        onError: (error) => Alert.alert('Cheers did not send', error.message),
      }
    );
  };

  const refresh = () => {
    void feed.refetch();
    void week.refetch();
    void myWeek.refetch();
    void leaderboard.refetch();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Feed' }} />
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-4 pb-10 pt-2"
        refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={refresh} />}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
        }}
        ListHeaderComponent={
          <View className="gap-4">
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
            onReply={() =>
              router.push({ pathname: '/post/[id]', params: { id: item.id, reply: '1' } })
            }
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
                body="Check in somewhere, or invite a mate so their nights out show up here.">
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
