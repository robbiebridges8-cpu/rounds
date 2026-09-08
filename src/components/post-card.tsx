import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar, Card, Icon, Stars } from '@/components/ui';
import { photoUrl } from '@/lib/checkins';
import type { FeedPost } from '@/lib/feed';
import { formatDistance, formatWhen } from '@/lib/format';
import { colors } from '@/theme';

type Props = {
  post: FeedPost;
  me: string | undefined;
  onOpen: () => void;
  onCheers: () => void;
  onReply: () => void;
};

/**
 * One check-in in the feed. Photos are the point: a check-in with a photo
 * can be answered with a photo (cheers), and the answers show as a strip of
 * small circles under it, BeReal style.
 */
export function PostCard({ post, me, onOpen, onCheers, onReply }: Props) {
  const router = useRouter();
  const who = post.profiles;
  const isMe = post.user_id === me;
  const hasPhotos = post.checkin_photos.length > 0;
  const mineCheers = post.cheers.some((c) => c.user_id === me);
  const replies = post.checkin_comments;

  return (
    <Card>
      <Pressable onPress={onOpen} accessibilityRole="button" className="active:bg-ale-tint/40">
        <View className="flex-row items-center gap-3 px-4 pt-4">
          <Pressable
            disabled={isMe || !who}
            onPress={() => who && router.push({ pathname: '/user/[id]', params: { id: who.id } })}>
            <Avatar url={who?.avatar_url} name={who?.display_name ?? '?'} size={40} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-ink text-[15px]" numberOfLines={2}>
              <Text className="font-semibold">{isMe ? 'You' : (who?.display_name ?? 'Someone')}</Text>
              <Text className="text-ink-soft"> at </Text>
              <Text
                className="font-semibold"
                onPress={() =>
                  post.pubs && router.push({ pathname: '/pub/[id]', params: { id: post.pubs.id } })
                }>
                {post.pubs?.name ?? 'a pub'}
              </Text>
            </Text>
            <Text className="text-ink-soft text-[13px]">
              {formatWhen(post.created_at)}
              {post.pubs?.borough ? ` · ${post.pubs.borough}` : ''}
              {!post.verified && post.distance_m != null
                ? ` · logged ${formatDistance(post.distance_m)} away`
                : ''}
            </Text>
          </View>
          {post.rating ? <Stars value={post.rating} size={12} /> : null}
        </View>

        {post.note ? (
          <Text className="text-ink px-4 pt-3 text-[17px] leading-6">{post.note}</Text>
        ) : null}

        {hasPhotos ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
            contentContainerClassName="gap-2 px-4">
            {post.checkin_photos.map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: photoUrl(photo.storage_path) }}
                style={{ width: 220, height: 220, borderRadius: 14 }}
                contentFit="cover"
                transition={150}
              />
            ))}
          </ScrollView>
        ) : null}

        {post.cheers.length > 0 ? (
          <View className="flex-row items-center gap-2 px-4 pt-3">
            <View className="flex-row">
              {post.cheers.slice(0, 5).map((cheer, index) => (
                <View
                  key={cheer.id}
                  className="overflow-hidden rounded-full border-2 border-card"
                  style={{ width: 34, height: 34, marginLeft: index ? -10 : 0 }}>
                  <Image
                    source={{ uri: photoUrl(cheer.photo_path) }}
                    style={{ width: 30, height: 30 }}
                    contentFit="cover"
                  />
                </View>
              ))}
            </View>
            <Text className="text-ink-soft text-[13px]">
              {post.cheers.length === 1
                ? `${post.cheers[0].user_id === me ? 'You' : (post.cheers[0].profiles?.display_name ?? 'Someone')} said cheers`
                : `${post.cheers.length} cheers`}
            </Text>
          </View>
        ) : null}

        {replies.length > 0 ? (
          <View className="gap-1 px-4 pt-3">
            {replies.slice(-2).map((reply) => (
              <Text key={reply.id} className="text-ink text-[15px]" numberOfLines={2}>
                <Text className="font-semibold">
                  {reply.user_id === me ? 'You' : (reply.profiles?.display_name ?? 'Someone')}
                </Text>{' '}
                {reply.body}
              </Text>
            ))}
            {replies.length > 2 ? (
              <Text className="text-ink-soft text-[13px]">View all {replies.length} replies</Text>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      <View className="mt-3 flex-row border-t border-line">
        {hasPhotos ? (
          <Action
            icon={mineCheers ? 'camera.fill' : 'camera'}
            label={mineCheers ? 'Cheersed' : 'Cheers'}
            active={mineCheers}
            onPress={onCheers}
          />
        ) : null}
        <Action icon="bubble.right" label="Reply" onPress={onReply} />
      </View>
    </Card>
  );
}

function Action({
  icon,
  label,
  active,
  onPress,
}: {
  icon: 'camera' | 'camera.fill' | 'bubble.right';
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="h-11 flex-1 flex-row items-center justify-center gap-2 active:bg-ale-tint">
      <Icon name={icon} size={16} color={active ? colors.ale : colors.inkSoft} weight="semibold" />
      <Text className={`text-[15px] font-semibold ${active ? 'text-ale' : 'text-ink-soft'}`}>{label}</Text>
    </Pressable>
  );
}
