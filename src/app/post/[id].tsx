import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { PostCard } from '@/components/post-card';
import { Button, EmptyState, Icon, SectionTitle } from '@/components/ui';
import { useSession } from '@/lib/auth';
import { photoUrl } from '@/lib/checkins';
import { useAcceptTag, useDeclineTag, useDeleteCheckin, usePost, useRemoveCheers } from '@/lib/feed';
import { openPhotos } from '@/lib/photo-viewer';
import { colors } from '@/theme';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const me = session?.user.id;
  const post = usePost(id);
  const removeCheers = useRemoveCheers();
  const deleteCheckin = useDeleteCheckin();
  const acceptTag = useAcceptTag();
  const declineTag = useDeclineTag();

  if (post.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.ale} />
      </View>
    );
  }
  if (!post.data) return <EmptyState icon="bubble.left" title="That check-in is gone" />;

  const data = post.data;
  const mine = data.user_id === me;
  const taggedMe = data.checkin_tags.some((t) => t.user_id === me);
  const myTag = data.checkin_tags.find((t) => t.user_id === me);

  const confirmDelete = () =>
    Alert.alert('Delete this check-in?', 'Photos, cheers and replies go with it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCheckin.mutate(data.id, { onSuccess: () => router.back() }) },
    ]);

  const sayCheers = () => {
    if (data.cheers.some((c) => c.user_id === me)) {
      Alert.alert('Take back your cheers?', undefined, [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Take it back', style: 'destructive', onPress: () => removeCheers.mutate(data.id) },
      ]);
      return;
    }
    router.push({ pathname: '/cheers/[checkinId]', params: { checkinId: data.id } });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: data.pubs?.name ?? 'Check-in',
          headerRight: mine
            ? () => (
                <View className="flex-row items-center gap-5">
                  <Pressable onPress={() => router.push({ pathname: '/checkin/edit/[id]', params: { id: data.id } })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit check-in">
                    <Icon name="pencil" size={19} color={colors.ink} />
                  </Pressable>
                  <Pressable onPress={confirmDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete check-in">
                    <Icon name="trash" size={19} color={colors.danger} />
                  </Pressable>
                </View>
              )
            : undefined,
        }}
      />
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
            expanded
          />

          {taggedMe && data.pubs ? (
            myTag?.accepted_at ? (
              <View className="flex-row items-center gap-2 rounded-lg bg-surface px-4 py-3">
                <Icon name="checkmark.circle.fill" size={18} color={colors.you} />
                <Text className="text-ink flex-1 text-[15px] font-semibold">You were there. It counts for you.</Text>
              </View>
            ) : (
              <View className="gap-2 rounded-lg px-4 py-4" style={{ backgroundColor: colors.butter }}>
                <Text className="text-[16px] font-bold" style={{ color: '#101014' }}>Were you there?</Text>
                <Text className="text-[13px]" style={{ color: '#101014', opacity: 0.75 }}>Yes puts it on your map and shows your mates.</Text>
                <View className="mt-1 flex-row gap-2">
                  <View className="flex-1">
                    <Button label="Yes, I was there" onPress={() => acceptTag.mutate(data.id, { onSuccess: (r) => Alert.alert(r === 'added' ? 'On your map' : 'Counted', r === 'added' ? 'It counts for your pubs and boroughs.' : 'You had already logged that night yourself.') })} loading={acceptTag.isPending} />
                  </View>
                  <Button label="No" variant="quiet" onPress={() => declineTag.mutate(data.id)} loading={declineTag.isPending} />
                </View>
              </View>
            )
          ) : null}

          {data.cheers.length > 0 ? (
            <View>
              <SectionTitle>Cheers</SectionTitle>
              <View className="flex-row flex-wrap gap-3">
                {data.cheers.map((cheer, index) => (
                  <Pressable key={cheer.id} className="w-[31%] gap-1.5" onPress={() => openPhotos(data.cheers.map((c) => photoUrl(c.photo_path)), index)} accessibilityRole="imagebutton">
                    <Image
                      source={{ uri: photoUrl(cheer.photo_path) }}
                      style={{ width: '100%', aspectRatio: 1, borderRadius: 14 }}
                      contentFit="cover"
                      transition={150}
                    />
                    <Text className="text-ink-soft text-[12px] font-semibold" numberOfLines={1}>
                      {cheer.user_id === me ? 'You' : (cheer.profiles?.display_name ?? 'Someone')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

        </ScrollView>

      </KeyboardAvoidingView>
    </>
  );
}
