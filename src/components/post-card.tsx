import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { BoroughSnapshot } from '@/components/borough-map';
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
 * The activity card. Strava's shape: who, where, a picture, the numbers,
 * then the social bit. The picture is the photo if there is one, otherwise
 * the borough silhouette with a yellow dot.
 */
export function PostCard({ post, me, onOpen, onCheers, onReply }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const who = post.profiles;
  const isMe = post.user_id === me;
  const hasPhotos = post.checkin_photos.length > 0;
  const mineCheers = post.cheers.some((c) => c.user_id === me);
  const replies = post.checkin_comments;
  const cardWidth = width - 32;
  const canSnapshot = post.pubs && post.pubs.lat != null && post.pubs.lng != null;

  return (
    <Card>
      <Pressable onPress={onOpen} accessibilityRole="button" className="active:bg-raised">
        <View className="flex-row items-center gap-3 px-4 pt-4">
          <Pressable disabled={isMe || !who} onPress={() => who && router.push({ pathname: '/user/[id]', params: { id: who.id } })}>
            <Avatar url={who?.avatar_url} name={who?.display_name ?? '?'} size={40} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-ink text-[15px] font-bold" numberOfLines={1}>
              {isMe ? 'You' : (who?.display_name ?? 'Someone')}
            </Text>
            <Text className="text-ink-soft text-[13px]" numberOfLines={1}>
              {formatWhen(post.created_at)}
              {post.pubs?.borough ? ` · ${post.pubs.borough}` : ''}
            </Text>
          </View>
          {post.rating ? <Stars value={post.rating} size={13} /> : null}
        </View>

        <Pressable className="px-4 pt-3" onPress={() => post.pubs && router.push({ pathname: '/pub/[id]', params: { id: post.pubs.id } })}>
          <Text className="text-ink font-display text-[24px] leading-7" style={{ letterSpacing: -0.5 }} numberOfLines={2}>
            {post.pubs?.name ?? 'A pub'}
          </Text>
        </Pressable>

        {post.note ? <Text className="text-ink px-4 pt-2 text-[16px] leading-6">{post.note}</Text> : null}

        {hasPhotos ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerClassName="gap-2 px-4">
            {post.checkin_photos.map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: photoUrl(photo.storage_path) }}
                style={{
                  width: post.checkin_photos.length === 1 ? cardWidth - 32 : 240,
                  height: post.checkin_photos.length === 1 ? (cardWidth - 32) * 0.72 : 240,
                  borderRadius: 12,
                }}
                contentFit="cover"
                transition={150}
              />
            ))}
          </ScrollView>
        ) : canSnapshot ? (
          <View className="mx-4 mt-3 overflow-hidden rounded-md bg-canvas">
            <BoroughSnapshot borough={post.pubs!.borough} lat={post.pubs!.lat!} lng={post.pubs!.lng!} width={cardWidth - 32} height={120} />
            <View className="absolute bottom-2 left-3 flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full bg-gold" />
              <Text className="text-ink-soft text-[11px] font-bold">{post.pubs!.borough ?? 'London'}</Text>
            </View>
          </View>
        ) : null}

        <View className="flex-row gap-6 px-4 pt-3">
          <Stat
            label={post.verified ? 'Verified' : 'Logged'}
            value={post.verified ? 'there' : post.distance_m != null ? `${formatDistance(post.distance_m)} away` : 'no location'}
          />
          {post.rating ? <Stat label="Rated" value={`${Number(post.rating).toFixed(1)} / 5`} /> : null}
          {post.cheers.length > 0 ? <Stat label="Cheers" value={String(post.cheers.length)} /> : null}
        </View>

        {post.cheers.length > 0 ? (
          <View className="flex-row items-center gap-2 px-4 pt-3">
            <View className="flex-row">
              {post.cheers.slice(0, 5).map((cheer, index) => (
                <View key={cheer.id} className="overflow-hidden rounded-full border-2 border-surface" style={{ width: 34, height: 34, marginLeft: index ? -10 : 0 }}>
                  <Image source={{ uri: photoUrl(cheer.photo_path) }} style={{ width: 30, height: 30 }} contentFit="cover" />
                </View>
              ))}
            </View>
            <Text className="text-ink-soft text-[13px]">
              {post.cheers.length === 1
                ? `${post.cheers[0].user_id === me ? 'You' : (post.cheers[0].profiles?.display_name ?? 'Someone')} said cheers`
                : `${post.cheers.length} said cheers`}
            </Text>
          </View>
        ) : null}

        {replies.length > 0 ? (
          <View className="gap-1 px-4 pt-3">
            {replies.slice(-2).map((reply) => (
              <Text key={reply.id} className="text-ink text-[15px]" numberOfLines={2}>
                <Text className="font-bold">{reply.user_id === me ? 'You' : (reply.profiles?.display_name ?? 'Someone')}</Text> {reply.body}
              </Text>
            ))}
            {replies.length > 2 ? <Text className="text-ink-soft text-[13px]">View all {replies.length} replies</Text> : null}
          </View>
        ) : null}
      </Pressable>

      <View className="mt-3 flex-row border-t border-line">
        {hasPhotos ? (
          <Action icon={mineCheers ? 'camera.fill' : 'camera'} label={mineCheers ? 'Cheersed' : 'Cheers'} active={mineCheers} onPress={onCheers} />
        ) : null}
        <Action icon="bubble.right" label="Reply" onPress={onReply} />
      </View>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-ink-soft text-[10px] font-bold uppercase tracking-wider">{label}</Text>
      <Text className="text-ink text-[15px] font-bold">{value}</Text>
    </View>
  );
}

function Action({ icon, label, active, onPress }: { icon: 'camera' | 'camera.fill' | 'bubble.right'; label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="h-11 flex-1 flex-row items-center justify-center gap-2 active:bg-raised">
      <Icon name={icon} size={16} color={active ? colors.ale : colors.inkSoft} weight="semibold" />
      <Text className={`text-[15px] font-bold ${active ? 'text-ale' : 'text-ink-soft'}`}>{label}</Text>
    </Pressable>
  );
}
