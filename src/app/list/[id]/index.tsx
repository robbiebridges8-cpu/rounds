import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Body, Button, Card, EmptyState, Icon, Rating, SectionTitle } from '@/components/ui';
import { useSession } from '@/lib/auth';
import { useDeleteList, useFollowList, useListPubs, useLists, useRemoveListPub, useSetListNote } from '@/lib/lists';
import { colors } from '@/theme';

export default function ListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const lists = useLists();
  const pubs = useListPubs(id);
  const follow = useFollowList();
  const setNote = useSetListNote();
  const removePub = useRemoveListPub();
  const remove = useDeleteList();

  const list = lists.data?.find((l) => l.id === id);
  const isCreator = Boolean(list?.creator_id && list.creator_id === session?.user.id);

  if (lists.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.ale} />
      </View>
    );
  }
  if (!list) return <EmptyState icon="list.bullet" title="That list is gone" />;

  const menu = () => {
    const destroy = () =>
      Alert.alert('Delete this list?', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(id, { onSuccess: () => router.back() }) },
      ]);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Add pubs', 'Delete list'], cancelButtonIndex: 0, destructiveButtonIndex: 2 },
        (i) => {
          if (i === 1) router.push({ pathname: '/list/[id]/add', params: { id } });
          if (i === 2) destroy();
        }
      );
    } else destroy();
  };

  const editNote = (pubId: string, name: string, current: string | null) => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        name,
        'One line on why it is on the list.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: (v?: string) => setNote.mutate({ id, pubId, note: v ?? '' }) },
        ],
        'plain-text',
        current ?? ''
      );
    }
  };

  const pubActions = (pubId: string, name: string, note: string | null) => {
    if (!isCreator) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', note ? 'Edit the line' : 'Add a line', 'Remove from list'], cancelButtonIndex: 0, destructiveButtonIndex: 2, title: name },
        (i) => {
          if (i === 1) editNote(pubId, name, note);
          if (i === 2) removePub.mutate({ id, pubId });
        }
      );
    } else {
      Alert.alert(name, undefined, [
        { text: 'Remove from list', style: 'destructive', onPress: () => removePub.mutate({ id, pubId }) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const done = pubs.data?.filter((p) => p.done).length ?? 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: isCreator
            ? () => (
                <Pressable onPress={menu} hitSlop={8} accessibilityRole="button" accessibilityLabel="More">
                  <Icon name="ellipsis.circle" size={22} color={colors.ink} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-4 pb-10 pt-2"
        refreshControl={<RefreshControl refreshing={pubs.isRefetching} onRefresh={() => { void pubs.refetch(); void lists.refetch(); }} />}>
        <View className="gap-2">
          <Text className="text-ink font-display text-[30px] leading-9" style={{ letterSpacing: -1 }}>{list.title}</Text>
          {list.description ? <Body>{list.description}</Body> : null}
          <Text className="text-ink-soft text-[13px]">
            by {list.creator_name} · {list.pub_count} {list.pub_count === 1 ? 'pub' : 'pubs'} · {list.follower_count} following
            {pubs.data ? ` · you've done ${done}` : ''}
          </Text>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              label={list.following ? 'Following' : 'Follow'}
              icon={list.following ? 'bookmark.fill' : 'bookmark'}
              variant={list.following ? 'quiet' : 'primary'}
              onPress={() => {
                void Haptics.selectionAsync();
                follow.mutate({ id, follow: !list.following });
              }}
              loading={follow.isPending}
            />
          </View>
          {isCreator ? (
            <View className="flex-1">
              <Button label="Add pubs" icon="plus" variant={list.pub_count === 0 ? 'primary' : 'outline'} onPress={() => router.push({ pathname: '/list/[id]/add', params: { id } })} />
            </View>
          ) : null}
        </View>

        <View>
          <SectionTitle>Pubs</SectionTitle>
          {pubs.isSuccess && pubs.data.length === 0 ? (
            <Card>
              <View className="p-5">
                <Body>{isCreator ? 'No pubs yet. Add some, then long press one to add a line.' : 'Nothing on it yet.'}</Body>
              </View>
            </Card>
          ) : null}
          {pubs.data && pubs.data.length > 0 ? (
            <Card>
              {pubs.data.map((pub, index) => (
                <Pressable
                  key={pub.pub_id}
                  onPress={() => router.push({ pathname: '/pub/[id]', params: { id: pub.pub_id } })}
                  onLongPress={() => pubActions(pub.pub_id, pub.name, pub.note)}
                  className="flex-row items-start gap-3 pl-4 active:bg-raised">
                  <Text className="text-ink-soft w-6 pt-3.5 text-right text-[15px] font-bold" style={{ fontVariant: ['tabular-nums'] }}>{index + 1}</Text>
                  <View className={`flex-1 flex-row items-start gap-3 py-3 pr-4 ${index === pubs.data.length - 1 ? '' : 'border-b border-line'}`}>
                    <View className="flex-1 gap-0.5">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-ink text-[17px] font-semibold" numberOfLines={1}>{pub.name}</Text>
                        {pub.done ? <Icon name="checkmark.circle.fill" size={15} color={colors.you} /> : null}
                      </View>
                      {pub.note ? <Text className="text-ink text-[14px] leading-5">{pub.note}</Text> : null}
                      <View className="flex-row items-center gap-2">
                        {pub.borough ? <Text className="text-ink-soft text-[13px]">{pub.borough}</Text> : null}
                        {pub.avg_rating != null ? <Rating value={pub.avg_rating} size={12} /> : null}
                      </View>
                    </View>
                    <Icon name="chevron.right" size={13} color={colors.slate} weight="semibold" />
                  </View>
                </Pressable>
              ))}
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}
