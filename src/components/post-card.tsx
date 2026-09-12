import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { Avatar, Card, Icon, Stars } from '@/components/ui';
import { photoUrl } from '@/lib/checkins';
import { useLikePost, useLikeReply, useReply, type FeedPost } from '@/lib/feed';
import { formatWhen } from '@/lib/format';
import { openPhotos } from '@/lib/photo-viewer';
import { colors } from '@/theme';

type Props = {
  post: FeedPost;
  me: string | undefined;
  onOpen: () => void;
  onCheers: () => void;
  /** Show every reply rather than the last two. The post page sets this. */
  expanded?: boolean;
};

/**
 * The activity card. Three ways to respond, in order of how much we want
 * them: Cheers (a photo back, the big butter pill), Like (a nod), Reply
 * (a line, typed right here under the post, no navigation).
 */
export function PostCard({ post, me, onOpen, onCheers, expanded = false }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const likePost = useLikePost();
  const likeReply = useLikeReply();
  const reply = useReply();
  const [composing, setComposing] = useState(expanded);
  const [replyTo, setReplyTo] = useState<FeedPost['checkin_comments'][number] | null>(null);
  const [draft, setDraft] = useState('');

  const who = post.profiles;
  const isMe = post.user_id === me;
  const hasPhotos = post.checkin_photos.length > 0;
  const mineCheers = post.cheers.some((c) => c.user_id === me);
  const liked = post.checkin_likes.some((l) => l.user_id === me);
  const topLevel = post.checkin_comments.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => post.checkin_comments.filter((c) => c.parent_id === id);
  const replies = expanded ? topLevel : topLevel.slice(-2);
  const cardWidth = width - 32;

  const toggleLike = () => {
    void Haptics.selectionAsync();
    likePost.mutate({ checkinId: post.id, like: !liked });
  };

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    reply.mutate(
      { checkinId: post.id, body, parentId: replyTo?.id ?? null },
      {
        onSuccess: () => {
          setDraft('');
          setReplyTo(null);
          if (!expanded) setComposing(false);
        },
        onError: (e) => Alert.alert('Reply did not send', e.message),
      }
    );
  };

  return (
    <Card>
      <Pressable onPress={onOpen} accessibilityRole="button" disabled={expanded} className={expanded ? '' : 'active:bg-raised'}>
        <View className="flex-row items-center gap-3 px-4 pt-4">
          <Pressable disabled={isMe || !who} onPress={() => who && router.push({ pathname: '/user/[id]', params: { id: who.id } })}>
            <Avatar url={who?.avatar_url} name={who?.display_name ?? '?'} size={40} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-ink text-[15px] font-bold" numberOfLines={1}>{isMe ? 'You' : (who?.display_name ?? 'Someone')}</Text>
            <Text className="text-ink-soft text-[13px]" numberOfLines={1}>
              {formatWhen(post.created_at)}
              {post.pubs?.borough ? ` · ${post.pubs.borough}` : ''}
            </Text>
          </View>
          {post.rating ? <Stars value={post.rating} size={13} /> : null}
        </View>

        <Pressable className="px-4 pt-3" onPress={() => post.pubs && router.push({ pathname: '/pub/[id]', params: { id: post.pubs.id } })}>
          <Text className="text-ink font-display text-[24px] leading-7" style={{ letterSpacing: -0.5 }} numberOfLines={2}>{post.pubs?.name ?? 'A pub'}</Text>
        </Pressable>

        {post.checkin_tags.length + post.checkin_guests.length > 0 ? (
          <Text className="text-ink-soft px-4 pt-1 text-[14px]" numberOfLines={2}>
            with{' '}
            <Text className="text-ink font-bold">
              {[...post.checkin_tags.map((t) => (t.user_id === me ? 'you' : (t.profiles?.display_name ?? 'someone'))), ...post.checkin_guests.map((g) => g.name)].join(', ')}
            </Text>
          </Text>
        ) : null}

        {post.note ? <Text className="text-ink px-4 pt-2 text-[16px] leading-6">{post.note}</Text> : null}

        {hasPhotos ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerClassName="gap-2 px-4">
            {post.checkin_photos.map((photo, index) => {
              // The photo keeps its own shape. Only very tall or very wide ones get trimmed.
              const ratio = photo.width && photo.height ? Math.min(1.3, Math.max(0.6, photo.height / photo.width)) : 0.75;
              const single = post.checkin_photos.length === 1;
              const w = single ? cardWidth - 32 : 280 / ratio;
              const h = single ? w * ratio : 280;
              return (
                <Pressable key={photo.id} onPress={() => openPhotos(post.checkin_photos.map((p) => photoUrl(p.storage_path)), index)} accessibilityRole="imagebutton">
                  <Image source={{ uri: photoUrl(photo.storage_path) }} style={{ width: w, height: h, borderRadius: 12 }} contentFit="cover" transition={150} />
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

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
              {post.cheers.length === 1 ? `${post.cheers[0].user_id === me ? 'You' : (post.cheers[0].profiles?.display_name ?? 'Someone')} said cheers` : `${post.cheers.length} said cheers`}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {/* The three responses. Cheers first and biggest, on purpose. */}
      <View className="flex-row items-center gap-2 px-4 pb-3 pt-3">
        {hasPhotos ? (
          <Pressable onPress={onCheers} accessibilityRole="button" className="h-11 flex-row items-center gap-2 rounded-full px-4 active:opacity-80" style={{ backgroundColor: mineCheers ? colors.ale : colors.butter }}>
            <Icon name={mineCheers ? 'camera.fill' : 'camera'} size={16} color={mineCheers ? '#fff' : '#101014'} weight="bold" />
            <Text className="text-[15px] font-bold" style={{ color: mineCheers ? '#fff' : '#101014' }}>
              {mineCheers ? 'Cheersed' : 'Cheers'}{post.cheers.length ? ` · ${post.cheers.length}` : ''}
            </Text>
          </Pressable>
        ) : null}
        <View className="h-11 flex-row items-center rounded-full bg-raised">
          <Pressable onPress={toggleLike} accessibilityRole="button" accessibilityLabel={liked ? 'Unlike' : 'Like'} className="h-11 flex-row items-center gap-1.5 rounded-full pl-3.5 pr-2 active:opacity-80">
            <Icon name={liked ? 'heart.fill' : 'heart'} size={16} color={liked ? colors.ale : colors.ink} weight="bold" />
          </Pressable>
          {post.checkin_likes.length ? (
            <Pressable onPress={() => router.push({ pathname: '/likes/[checkinId]', params: { checkinId: post.id } })} hitSlop={6} accessibilityRole="button" accessibilityLabel="See who liked this" className="h-11 items-center justify-center pr-3.5">
              <Text className="text-ink text-[14px] font-bold">{post.checkin_likes.length}</Text>
            </Pressable>
          ) : (
            <View className="w-2" />
          )}
        </View>
        <Pressable onPress={() => setComposing((c) => !c)} accessibilityRole="button" accessibilityLabel="Reply" className="h-11 flex-row items-center gap-1.5 rounded-full bg-raised px-3.5 active:opacity-80">
          <Icon name="bubble.right" size={16} color={colors.ink} weight="bold" />
          {post.checkin_comments.length ? <Text className="text-ink text-[14px] font-bold">{post.checkin_comments.length}</Text> : null}
        </Pressable>
      </View>

      {replies.length > 0 ? (
        <View className="gap-2 px-4 pb-3">
          {!expanded && topLevel.length > 2 ? (
            <Pressable onPress={onOpen}>
              <Text className="text-ink-soft text-[13px] font-semibold">View all {post.checkin_comments.length} replies</Text>
            </Pressable>
          ) : null}
          {replies.map((r) => (
            <View key={r.id} className="gap-2">
              <ReplyRow reply={r} me={me} onLike={(like) => likeReply.mutate({ commentId: r.id, checkinId: post.id, like })} onReply={() => { setReplyTo(r); setComposing(true); }} />
              {childrenOf(r.id).map((c) => (
                <View key={c.id} className="pl-8">
                  <ReplyRow reply={c} me={me} onLike={(like) => likeReply.mutate({ commentId: c.id, checkinId: post.id, like })} onReply={() => { setReplyTo(r); setComposing(true); }} />
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {composing ? (
        <View className="border-t border-line px-4 py-3">
          {replyTo ? (
            <View className="mb-2 flex-row items-center gap-2">
              <Text className="text-ink-soft text-[12px] font-semibold">Replying to {replyTo.user_id === me ? 'yourself' : (replyTo.profiles?.display_name ?? 'someone')}</Text>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Reply to the check-in instead">
                <Icon name="xmark.circle.fill" size={14} color={colors.slate} />
              </Pressable>
            </View>
          ) : null}
        <View className="flex-row items-end gap-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={replyTo ? 'Your reply' : `Reply to ${isMe ? 'your check-in' : (who?.display_name ?? 'this')}`}
            placeholderTextColor={colors.slate}
            multiline
            maxLength={280}
            autoFocus={!expanded}
            className="text-ink max-h-24 min-h-[40px] flex-1 rounded-[20px] bg-raised px-4 py-2.5 text-[15px]"
          />
          <Pressable onPress={send} disabled={!draft.trim() || reply.isPending} accessibilityRole="button" accessibilityLabel="Send reply" className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: draft.trim() ? colors.ink : colors.line }}>
            <Icon name="arrow.up" size={16} color="#fff" weight="bold" />
          </Pressable>
        </View>
        </View>
      ) : null}
    </Card>
  );
}

function ReplyRow({ reply, me, onLike, onReply }: { reply: FeedPost['checkin_comments'][number]; me: string | undefined; onLike: (like: boolean) => void; onReply: () => void }) {
  const router = useRouter();
  const liked = reply.comment_likes.some((l) => l.user_id === me);
  const mine = reply.user_id === me;
  const openProfile = () => {
    if (!mine) router.push({ pathname: '/user/[id]', params: { id: reply.user_id } });
  };
  return (
    <View className="flex-row items-start gap-2">
      <Pressable onPress={openProfile} disabled={mine} accessibilityRole="button" accessibilityLabel={reply.profiles?.display_name ?? 'Profile'}>
        <Avatar url={reply.profiles?.avatar_url} name={reply.profiles?.display_name ?? '?'} size={24} />
      </Pressable>
      <View className="flex-1">
        <Text className="text-ink text-[15px] leading-5">
          <Text className="font-bold" onPress={mine ? undefined : openProfile}>{mine ? 'You' : (reply.profiles?.display_name ?? 'Someone')}</Text> {reply.body}
        </Text>
        <View className="flex-row items-center gap-3">
          <Text className="text-ink-soft text-[11px]">{formatWhen(reply.created_at)}</Text>
          <Pressable onPress={onReply} hitSlop={6} accessibilityRole="button">
            <Text className="text-ink-soft text-[11px] font-bold">Reply</Text>
          </Pressable>
        </View>
      </View>
      <Pressable onPress={() => { void Haptics.selectionAsync(); onLike(!liked); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={liked ? 'Unlike reply' : 'Like reply'} className="flex-row items-center gap-1 pt-0.5">
        <Icon name={liked ? 'heart.fill' : 'heart'} size={13} color={liked ? colors.ale : colors.slate} />
        {reply.comment_likes.length ? <Text className="text-ink-soft text-[11px] font-bold">{reply.comment_likes.length}</Text> : null}
      </Pressable>
    </View>
  );
}
