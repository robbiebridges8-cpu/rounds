import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PostCard } from '@/components/post-card';
import { Avatar, Card, EmptyState, Icon, SectionTitle } from '@/components/ui';
import { useSession } from '@/lib/auth';
import { photoUrl } from '@/lib/checkins';
import { useCheers, useDeleteReply, usePost, useRemoveCheers, useReply } from '@/lib/feed';
import { formatWhen } from '@/lib/format';
import { pickImage } from '@/lib/images';
import { colors } from '@/theme';

export default function PostScreen() {
  const { id, reply: focusReply } = useLocalSearchParams<{ id: string; reply?: string }>();
  const { session } = useSession();
  const me = session?.user.id;
  const post = usePost(id);
  const cheers = useCheers();
  const removeCheers = useRemoveCheers();
  const reply = useReply();
  const deleteReply = useDeleteReply();
  const inputRef = useRef<TextInput>(null);
  const [body, setBody] = useState('');

  useEffect(() => {
    if (focusReply && post.data) setTimeout(() => inputRef.current?.focus(), 350);
  }, [focusReply, post.data]);

  if (post.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.ale} />
      </View>
    );
  }
  if (!post.data) return <EmptyState icon="bubble.left" title="That check-in is gone" />;

  const data = post.data;

  const sayCheers = async () => {
    if (data.cheers.some((c) => c.user_id === me)) {
      Alert.alert('Take back your cheers?', undefined, [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Take it back', style: 'destructive', onPress: () => removeCheers.mutate(data.id) },
      ]);
      return;
    }
    const photo = await pickImage('camera');
    if (!photo) return;
    cheers.mutate(
      { checkinId: data.id, photo },
      {
        onSuccess: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        onError: (error) => Alert.alert('Cheers did not send', error.message),
      }
    );
  };

  const send = () => {
    const text = body.trim();
    if (!text) return;
    reply.mutate(
      { checkinId: data.id, body: text },
      {
        onSuccess: () => setBody(''),
        onError: (error) => Alert.alert('Reply did not send', error.message),
      }
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: data.pubs?.name ?? 'Check-in' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-4 pb-6 pt-4"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive">
          <PostCard
            post={data}
            me={me}
            onOpen={() => undefined}
            onCheers={() => void sayCheers()}
            onReply={() => inputRef.current?.focus()}
          />

          {data.cheers.length > 0 ? (
            <View>
              <SectionTitle>Cheers</SectionTitle>
              <View className="flex-row flex-wrap gap-3">
                {data.cheers.map((cheer) => (
                  <View key={cheer.id} className="w-[31%] gap-1.5">
                    <Image
                      source={{ uri: photoUrl(cheer.photo_path) }}
                      style={{ width: '100%', aspectRatio: 1, borderRadius: 14 }}
                      contentFit="cover"
                      transition={150}
                    />
                    <Text className="text-ink-soft text-[12px] font-semibold" numberOfLines={1}>
                      {cheer.user_id === me ? 'You' : (cheer.profiles?.display_name ?? 'Someone')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View>
            <SectionTitle>Replies</SectionTitle>
            {data.checkin_comments.length === 0 ? (
              <Text className="text-ink-soft px-1 text-[15px]">Nothing yet. Say something.</Text>
            ) : (
              <Card>
                {data.checkin_comments.map((c, index) => (
                  <Pressable
                    key={c.id}
                    disabled={c.user_id !== me}
                    onLongPress={() =>
                      Alert.alert('Delete your reply?', undefined, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => deleteReply.mutate({ id: c.id, checkinId: data.id }),
                        },
                      ])
                    }
                    className="flex-row gap-3 px-4 pt-3">
                    <Avatar url={c.profiles?.avatar_url} name={c.profiles?.display_name ?? '?'} size={32} />
                    <View
                      className={`flex-1 pb-3 ${
                        index === data.checkin_comments.length - 1 ? '' : 'border-b border-line'
                      }`}>
                      <View className="flex-row items-baseline gap-2">
                        <Text className="text-ink text-[15px] font-semibold">
                          {c.user_id === me ? 'You' : (c.profiles?.display_name ?? 'Someone')}
                        </Text>
                        <Text className="text-ink-soft text-[12px]">{formatWhen(c.created_at)}</Text>
                      </View>
                      <Text className="text-ink text-[15px] leading-5">{c.body}</Text>
                    </View>
                  </Pressable>
                ))}
              </Card>
            )}
          </View>
        </ScrollView>

        <View className="flex-row items-end gap-2 border-t border-line bg-cream px-4 pb-3 pt-2">
          <TextInput
            ref={inputRef}
            value={body}
            onChangeText={setBody}
            placeholder="Reply"
            placeholderTextColor={colors.slate}
            multiline
            maxLength={280}
            className="text-ink max-h-28 min-h-[44px] flex-1 rounded-[22px] border border-line bg-card px-4 py-3 text-[16px]"
          />
          <Pressable
            onPress={send}
            disabled={!body.trim() || reply.isPending}
            accessibilityRole="button"
            accessibilityLabel="Send reply"
            className={`h-11 w-11 items-center justify-center rounded-full ${
              body.trim() ? 'bg-ale active:bg-ale-dark' : 'bg-line'
            }`}>
            <Icon name="arrow.up" size={18} color="#fff" weight="bold" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
