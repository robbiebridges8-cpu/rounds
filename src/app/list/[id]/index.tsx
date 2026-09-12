import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';

import { ListIcon, ProgressBar } from '@/components/list-badges';
import { Body, Button, Card, EmptyState, Icon, Rating, SectionTitle } from '@/components/ui';
import { APP_NAME } from '@/lib/brand';
import { useSession } from '@/lib/auth';
import { listColor, useDeleteList, useFollowList, useListPubs, useLists, useRemoveListPub, useSetListNote, walkMinutes } from '@/lib/lists';
import { colors, fonts } from '@/theme';

export default function ListScreen() {
  const { id, add } = useLocalSearchParams<{ id: string; add?: string }>();
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

  // A new list opens straight onto Add pubs, so it is never born empty.
  useEffect(() => {
    if (add === '1' && id) router.push({ pathname: '/list/[id]/add', params: { id } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [add, id]);

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
  const total = pubs.data?.length ?? list.pub_count;
  const finished = Boolean(list.completed_at);
  const isCrawl = list.kind === 'crawl';
  const color = listColor(list.color);

  const share = () => {
    const link = Linking.createURL(`/list/${id}`);
    const names = (pubs.data ?? []).slice(0, 4).map((p) => p.name).join(isCrawl ? ' → ' : ', ');
    void Share.share({
      message: `${list.title}${names ? `: ${names}${(pubs.data?.length ?? 0) > 4 ? '…' : ''}` : ''}\n\nOpen it in ${APP_NAME}: ${link}`,
    });
  };

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
          {isCrawl ? (
            <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: colors.butter }}>
              <Text className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#101014' }}>Crawl</Text>
            </View>
          ) : null}
          <Text className="text-ink font-display text-[30px] leading-9" style={{ letterSpacing: -1 }}>{list.title}</Text>
          {list.description ? <Body>{list.description}</Body> : null}
          <Text className="text-ink-soft text-[13px]">
            by {list.creator_name} · {list.pub_count} {list.pub_count === 1 ? 'pub' : 'pubs'} · {list.follower_count} saved
          </Text>
        </View>

        {finished ? (
          <View className="flex-row items-center gap-3 rounded-lg px-4 py-4" style={{ backgroundColor: color }}>
            <ListIcon icon={list.icon} color={color} size={44} done />
            <View className="flex-1">
              <Text style={{ fontFamily: fonts.display, fontSize: 20, color: '#fff' }}>Done. Badge earned.</Text>
              <Text className="text-[13px] text-white" style={{ opacity: 0.85 }}>Every pub on it, checked in.</Text>
            </View>
          </View>
        ) : total > 0 ? (
          <View className="gap-2 rounded-lg border border-line bg-surface p-4">
            <View className="flex-row items-baseline justify-between">
              <Text style={{ fontFamily: fonts.display, fontSize: 30, color }}>
                {done}
                <Text className="text-ink-soft text-[17px]"> of {total}</Text>
              </Text>
              <Text className="text-ink-soft text-[13px]">{total - done} to go{list.following || isCreator ? '' : ' · save it to earn the badge'}</Text>
            </View>
            <ProgressBar value={done} total={total} color={color} />
          </View>
        ) : null}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              label={list.following ? 'Saved' : 'Save'}
              icon={list.following ? 'bookmark.fill' : 'bookmark'}
              variant={list.following ? 'quiet' : 'primary'}
              onPress={() => {
                void Haptics.selectionAsync();
                follow.mutate({ id, follow: !list.following });
              }}
              loading={follow.isPending}
            />
          </View>
          <Button label="Share" icon="square.and.arrow.up" variant="outline" onPress={share} />
          {isCreator ? (
            <Button label="Add pubs" icon="plus" variant={list.pub_count === 0 ? 'primary' : 'outline'} onPress={() => router.push({ pathname: '/list/[id]/add', params: { id } })} />
          ) : null}
        </View>

        {pubs.data && pubs.data.length > 0 ? (
          <Button label="Show on map" icon="map" variant="outline" onPress={() => router.push({ pathname: '/(tabs)', params: { pubs: pubs.data.map((p) => p.pub_id).join(',') } })} />
        ) : null}

        <View>
          <SectionTitle>{isCrawl ? 'Stops' : 'Pubs'}</SectionTitle>
          {pubs.isSuccess && pubs.data.length === 0 ? (
            <Card>
              <View className="p-5">
                <Body>{isCreator ? 'No pubs yet. Add some, then use the dots on a pub to add a line.' : 'Nothing on it yet.'}</Body>
              </View>
            </Card>
          ) : null}
          {pubs.data && pubs.data.length > 0 ? (
            <Card>
              {pubs.data.map((pub, index) => {
                const prev = index > 0 ? pubs.data[index - 1] : null;
                const walk = isCrawl && prev ? walkMinutes(prev, pub) : null;
                return (
                <Pressable
                  key={pub.pub_id}
                  onPress={() => router.push({ pathname: '/pub/[id]', params: { id: pub.pub_id } })}
                  onLongPress={() => pubActions(pub.pub_id, pub.name, pub.note)}
                  className="flex-row items-start gap-3 pl-4 active:bg-raised">
                  {isCrawl ? (
                    <View className="w-7 items-center pt-3">
                      <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: pub.done ? color : colors.raised }}>
                        <Text className="text-[13px] font-bold" style={{ color: pub.done ? '#fff' : colors.inkSoft, fontVariant: ['tabular-nums'] }}>{index + 1}</Text>
                      </View>
                    </View>
                  ) : (
                    <Text className="text-ink-soft w-6 pt-3.5 text-right text-[15px] font-bold" style={{ fontVariant: ['tabular-nums'] }}>{index + 1}</Text>
                  )}
                  <View className={`flex-1 flex-row items-start gap-3 py-3 pr-4 ${index === pubs.data.length - 1 ? '' : 'border-b border-line'}`}>
                    <View className="flex-1 gap-0.5">
                      <View className="flex-row items-center gap-2">
                        <Text className={`${pub.done ? 'text-ink' : 'text-ink-soft'} text-[17px] font-semibold`} numberOfLines={1}>{pub.name}</Text>
                        {pub.done ? <Icon name="checkmark.circle.fill" size={15} color={colors.you} /> : null}
                      </View>
                      {pub.note ? <Text className="text-ink text-[14px] leading-5">{pub.note}</Text> : null}
                      <View className="flex-row items-center gap-2">
                        {walk != null ? <Text className="text-ink-soft text-[13px]">{`${walk} min walk`}</Text> : null}
                        {pub.borough ? <Text className="text-ink-soft text-[13px]">{pub.borough}</Text> : null}
                        {pub.avg_rating != null ? <Rating value={pub.avg_rating} size={12} /> : null}
                      </View>
                    </View>
                    {isCreator ? (
                      <Pressable onPress={() => pubActions(pub.pub_id, pub.name, pub.note)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit or remove">
                        <Icon name="ellipsis" size={16} color={colors.inkSoft} />
                      </Pressable>
                    ) : (
                      <Icon name="chevron.right" size={13} color={colors.slate} weight="semibold" />
                    )}
                  </View>
                </Pressable>
                );
              })}
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}
