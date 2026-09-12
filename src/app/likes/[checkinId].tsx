import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar, Card, EmptyState, ListRow } from '@/components/ui';
import { useSession } from '@/lib/auth';
import { usePost } from '@/lib/feed';
import { formatWhen } from '@/lib/format';
import { colors } from '@/theme';

/** Who liked a check-in. Tap a name to see them. */
export default function LikesSheet() {
  const router = useRouter();
  const { checkinId } = useLocalSearchParams<{ checkinId: string }>();
  const { session } = useSession();
  const post = usePost(checkinId);
  const likes = [...(post.data?.checkin_likes ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 px-5 pb-10 pt-4">
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text className="text-ink text-[17px] font-semibold">Done</Text>
        </Pressable>
        <Text className="text-ink text-[17px] font-bold">{likes.length === 1 ? '1 like' : `${likes.length} likes`}</Text>
        <View style={{ width: 52 }} />
      </View>
      {post.isPending ? (
        <View className="py-10">
          <ActivityIndicator color={colors.ale} />
        </View>
      ) : likes.length === 0 ? (
        <EmptyState icon="heart" title="No likes yet" />
      ) : (
        <Card>
          {likes.map((l, i) => (
            <ListRow
              key={l.user_id}
              left={<Avatar url={l.profiles?.avatar_url} name={l.profiles?.display_name ?? '?'} size={36} />}
              title={l.user_id === session?.user.id ? 'You' : (l.profiles?.display_name ?? 'Someone')}
              subtitle={`${l.profiles ? `@${l.profiles.username} · ` : ''}${formatWhen(l.created_at)}`}
              onPress={l.user_id === session?.user.id ? undefined : () => router.push({ pathname: '/user/[id]', params: { id: l.user_id } })}
              chevron={l.user_id !== session?.user.id}
              last={i === likes.length - 1}
            />
          ))}
        </Card>
      )}
    </ScrollView>
  );
}
