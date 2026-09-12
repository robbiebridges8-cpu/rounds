import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { PostCard } from '@/components/post-card';
import { Button, EmptyState, Icon, SectionTitle } from '@/components/ui';
import { useSession } from '@/lib/auth';
import { photoUrl } from '@/lib/checkins';
import { useClaimVisit, useDeleteCheckin, usePost, useRemoveCheers } from '@/lib/feed';
import { colors } from '@/theme';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const me = session?.user.id;
  const post = usePost(id);
  const removeCheers = useRemoveCheers();
  const deleteCheckin = useDeleteCheckin();
  const claimVisit = useClaimVisit();

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
            <Button
              label="You were here? Add it to your map"
              icon="mappin.and.ellipse"
              variant="accent"
              onPress={() => claimVisit.mutate({ pubId: data.pubs!.id }, { onSuccess: () => Alert.alert('Added', 'It is on your map and counts for your boroughs.') })}
              loading={claimVisit.isPending}
            />
          ) : null}

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

        </ScrollView>

      </KeyboardAvoidingView>
    </>
  );
}
