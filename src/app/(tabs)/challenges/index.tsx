import { Stack, useRouter } from 'expo-router';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { ChallengeCard } from '@/components/challenge-card';
import { ListCard } from '@/components/list-card';
import { Body, Button, Card, Icon, SectionTitle } from '@/components/ui';
import { useChallenges } from '@/lib/challenges';
import { useLists } from '@/lib/lists';
import { colors } from '@/theme';

/** Lists are taste. Quests are lists with a finish line. Same tab. */
export default function ExploreScreen() {
  const router = useRouter();
  const lists = useLists();
  const challenges = useChallenges();

  const create = () => {
    const go = (which: 'list' | 'quest') => router.push(which === 'list' ? '/list/new' : '/challenge/new');
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'New list', 'New quest'], cancelButtonIndex: 0, message: 'Lists are pubs you rate. Quests have a finish line.' },
        (i) => {
          if (i === 1) go('list');
          if (i === 2) go('quest');
        }
      );
    } else {
      Alert.alert('Create', undefined, [
        { text: 'New list', onPress: () => go('list') },
        { text: 'New quest', onPress: () => go('quest') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const mine = challenges.data?.filter((c) => c.joined) ?? [];
  const others = challenges.data?.filter((c) => !c.joined) ?? [];
  const loading = lists.isPending || challenges.isPending;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Explore',
          headerRight: () => (
            <View className="flex-row items-center gap-5">
              <Pressable onPress={() => router.push('/search')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Search pubs">
                <Icon name="magnifyingglass" size={20} color={colors.ink} weight="semibold" />
              </Pressable>
              <Pressable onPress={create} hitSlop={8} accessibilityRole="button" accessibilityLabel="Create a list or quest">
                <Icon name="plus.circle.fill" size={24} color={colors.ink} />
              </Pressable>
            </View>
          ),
        }}
      />
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

        <View>
          <SectionTitle
            action={
              <Pressable onPress={() => router.push('/list/new')} hitSlop={8}>
                <Text className="text-you text-[13px] font-bold">New list</Text>
              </Pressable>
            }>
            Lists
          </SectionTitle>
          {lists.data && lists.data.length > 0 ? (
            <View className="gap-3">
              {lists.data.map((l) => (
                <ListCard key={l.id} list={l} onPress={() => router.push({ pathname: '/list/[id]', params: { id: l.id } })} />
              ))}
            </View>
          ) : lists.isSuccess ? (
            <Card>
              <View className="gap-3 p-5">
                <Body>No lists yet. Make the first.</Body>
                <Button label="Make a list" icon="plus" onPress={() => router.push('/list/new')} />
              </View>
            </Card>
          ) : null}
        </View>

        <View>
          <SectionTitle
            action={
              <Pressable onPress={() => router.push('/challenge/new')} hitSlop={8}>
                <Text className="text-you text-[13px] font-bold">New quest</Text>
              </Pressable>
            }>
            Quests
          </SectionTitle>
          <View className="gap-3">
            {[...mine, ...others].map((c) => (
              <ChallengeCard key={c.id} challenge={c} onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: c.id } })} />
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  );
}
