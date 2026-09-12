import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { ChallengeCard } from '@/components/challenge-card';
import { ListCard } from '@/components/list-card';
import { Body, Button, Card, SectionTitle } from '@/components/ui';
import { useSession } from '@/lib/auth';
import { useChallenges } from '@/lib/challenges';
import { useLists } from '@/lib/lists';
import { colors } from '@/theme';

/** Lists are taste. Quests are lists with a finish line. Same tab. */
export default function ExploreScreen() {
  const router = useRouter();
  const { session } = useSession();
  const lists = useLists();
  const challenges = useChallenges();

  const me = session?.user.id;
  const myLists = (lists.data ?? []).filter((l) => l.following || l.creator_id === me);
  const otherLists = (lists.data ?? []).filter((l) => !(l.following || l.creator_id === me));
  const myQuests = (challenges.data ?? []).filter((c) => c.joined || c.creator_id === me);
  const otherQuests = (challenges.data ?? []).filter((c) => !(c.joined || c.creator_id === me));
  const loading = lists.isPending || challenges.isPending;

  return (
    <>
      <Stack.Screen options={{ title: 'Explore' }} />
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-6 px-4 pb-10 pt-2"
        refreshControl={
          <RefreshControl
            refreshing={lists.isRefetching || challenges.isRefetching}
            onRefresh={() => {
              void lists.refetch();
              void challenges.refetch();
            }}
          />
        }>
        {loading ? (
          <View className="py-10">
            <ActivityIndicator color={colors.ale} />
          </View>
        ) : null}

        {myLists.length + myQuests.length > 0 ? (
          <View>
            <SectionTitle>Yours</SectionTitle>
            <View className="gap-3">
              {myQuests.map((c) => (
                <ChallengeCard key={c.id} challenge={c} onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: c.id } })} />
              ))}
              {myLists.map((l) => (
                <ListCard key={l.id} list={l} onPress={() => router.push({ pathname: '/list/[id]', params: { id: l.id } })} />
              ))}
            </View>
          </View>
        ) : null}

        <View>
          <SectionTitle
            action={
              <Pressable onPress={() => router.push('/list/new')} hitSlop={8} accessibilityRole="button">
                <Text className="text-you text-[13px] font-bold">New list</Text>
              </Pressable>
            }>
            Lists
          </SectionTitle>
          {otherLists.length > 0 ? (
            <View className="gap-3">
              {otherLists.map((l) => (
                <ListCard key={l.id} list={l} onPress={() => router.push({ pathname: '/list/[id]', params: { id: l.id } })} />
              ))}
            </View>
          ) : lists.isSuccess ? (
            <Card>
              <View className="gap-3 p-5">
                <Body>{myLists.length ? 'No other lists yet.' : 'No lists yet. Make the first.'}</Body>
                <Button label="Make a list" icon="plus" onPress={() => router.push('/list/new')} />
              </View>
            </Card>
          ) : null}
        </View>

        <View>
          <SectionTitle
            action={
              <Pressable onPress={() => router.push('/challenge/new')} hitSlop={8} accessibilityRole="button">
                <Text className="text-you text-[13px] font-bold">New quest</Text>
              </Pressable>
            }>
            Quests
          </SectionTitle>
          {otherQuests.length > 0 ? (
            <View className="gap-3">
              {otherQuests.map((c) => (
                <ChallengeCard key={c.id} challenge={c} onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: c.id } })} />
              ))}
            </View>
          ) : challenges.isSuccess ? (
            <Card>
              <View className="gap-3 p-5">
                <Body>{myQuests.length ? 'No other quests yet.' : 'No quests yet. Set the first.'}</Body>
                <Button label="Set a quest" icon="flag.fill" onPress={() => router.push('/challenge/new')} />
              </View>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}
