import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { ListCard } from '@/components/list-card';
import { Body, Button, Card, SectionTitle } from '@/components/ui';
import { useSession } from '@/lib/auth';
import { useLists } from '@/lib/lists';
import { colors } from '@/theme';

/** Lists. Some are crawls, with an order. Yours first. */
export default function ExploreScreen() {
  const router = useRouter();
  const { session } = useSession();
  const lists = useLists();
  const me = session?.user.id;
  const mine = (lists.data ?? []).filter((l) => l.following || l.creator_id === me);
  const others = (lists.data ?? []).filter((l) => !(l.following || l.creator_id === me));

  const newLinks = (
    <View className="flex-row items-center gap-4">
      <Pressable onPress={() => router.push({ pathname: '/list/new', params: { kind: 'list' } })} hitSlop={8} accessibilityRole="button">
        <Text className="text-you text-[13px] font-bold">New list</Text>
      </Pressable>
      <Pressable onPress={() => router.push({ pathname: '/list/new', params: { kind: 'crawl' } })} hitSlop={8} accessibilityRole="button">
        <Text className="text-you text-[13px] font-bold">New crawl</Text>
      </Pressable>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Explore' }} />
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-6 px-4 pb-10 pt-2"
        refreshControl={<RefreshControl refreshing={lists.isRefetching} onRefresh={() => void lists.refetch()} />}>
        {lists.isPending ? (
          <View className="py-10">
            <ActivityIndicator color={colors.ale} />
          </View>
        ) : null}

        {mine.length > 0 ? (
          <View>
            <SectionTitle action={newLinks}>Yours</SectionTitle>
            <View className="gap-3">
              {mine.map((l) => (
                <ListCard key={l.id} list={l} onPress={() => router.push({ pathname: '/list/[id]', params: { id: l.id } })} />
              ))}
            </View>
          </View>
        ) : null}

        <View>
          <SectionTitle action={mine.length > 0 ? undefined : newLinks}>{mine.length > 0 ? 'Everyone' : 'Lists'}</SectionTitle>
          {others.length > 0 ? (
            <View className="gap-3">
              {others.map((l) => (
                <ListCard key={l.id} list={l} onPress={() => router.push({ pathname: '/list/[id]', params: { id: l.id } })} />
              ))}
            </View>
          ) : lists.isSuccess ? (
            <Card>
              <View className="gap-3 p-5">
                <Body>{mine.length ? 'Nothing else yet.' : 'No lists yet. Make the first.'}</Body>
                <Button label="Make a list" icon="plus" onPress={() => router.push({ pathname: '/list/new', params: { kind: 'list' } })} />
              </View>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}
