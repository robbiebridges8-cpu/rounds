import { Stack, useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Avatar, Card, EmptyState, Icon } from '@/components/ui';
import { formatWhen } from '@/lib/format';
import { useInbox, useMarkRead, type InboxItem } from '@/lib/inbox';
import { colors } from '@/theme';

const KIND_ICON: Record<string, 'camera.fill' | 'bubble.right.fill' | 'person.fill' | 'calendar' | 'checkmark.seal.fill' | 'heart.fill'> = {
  cheers: 'camera.fill',
  reply: 'bubble.right.fill',
  tag: 'person.fill',
  like: 'heart.fill',
  digest: 'calendar',
  claim: 'checkmark.seal.fill',
};

function destination(n: InboxItem): Href {
  if (n.checkin_id) return { pathname: '/post/[id]', params: { id: n.checkin_id } };
  if (n.pub_id) return { pathname: '/pub/[id]', params: { id: n.pub_id } };
  return '/feed';
}

export default function InboxScreen() {
  const router = useRouter();
  const inbox = useInbox();
  const markRead = useMarkRead();

  // Opening the inbox reads everything. Simple, and how mail works.
  useEffect(() => {
    const unread = inbox.data?.filter((n) => !n.read_at).map((n) => n.id) ?? [];
    if (unread.length) markRead.mutate(unread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inbox.data]);

  return (
    <>
      <Stack.Screen options={{ title: 'Inbox' }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-10 pt-2"
        refreshControl={<RefreshControl refreshing={inbox.isRefetching} onRefresh={() => void inbox.refetch()} />}>
        {inbox.isPending ? (
          <View className="py-10">
            <ActivityIndicator color={colors.ale} />
          </View>
        ) : inbox.data && inbox.data.length > 0 ? (
          <Card>
            {inbox.data.map((n, index) => (
              <Pressable
                key={n.id}
                onPress={() => router.push(destination(n))}
                accessibilityRole="button"
                className="flex-row items-center gap-3 pl-4 active:bg-raised">
                {n.actor ? (
                  <Avatar url={n.actor.avatar_url} name={n.actor.display_name} size={40} />
                ) : (
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-stout">
                    <Icon name={KIND_ICON[n.kind] ?? 'calendar'} size={18} color="#fff" weight="bold" />
                  </View>
                )}
                <View className={`flex-1 flex-row items-center gap-3 py-3 pr-4 ${index === inbox.data.length - 1 ? '' : 'border-b border-line'}`}>
                  <View className="flex-1">
                    <Text className={`text-[16px] ${n.read_at ? 'text-ink font-semibold' : 'text-ink font-bold'}`} numberOfLines={1}>
                      {n.title}
                    </Text>
                    <Text className="text-ink-soft text-[14px]" numberOfLines={2}>
                      {n.body}
                    </Text>
                    <Text className="text-ink-soft mt-0.5 text-[12px]">{formatWhen(n.created_at)}</Text>
                  </View>
                  {!n.read_at ? <View className="h-2.5 w-2.5 rounded-full bg-ale" /> : null}
                </View>
              </Pressable>
            ))}
          </Card>
        ) : (
          <Card>
            <EmptyState icon="tray" title="Nothing yet" body="Cheers, replies and tags show up here." />
          </Card>
        )}
      </ScrollView>
    </>
  );
}
