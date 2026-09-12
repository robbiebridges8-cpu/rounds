import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Body, Button, Field, Stars } from '@/components/ui';
import { useDeleteCheckin, usePost, useUpdateCheckin } from '@/lib/feed';
import { colors } from '@/theme';

/** Fix the stars or the note on a check-in you made. Or delete it. */
type Loaded = NonNullable<ReturnType<typeof usePost>['data']>;

export default function EditCheckinSheet() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = usePost(id);

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 px-5 pb-10 pt-4" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text className="text-ink text-[17px] font-semibold">Cancel</Text>
        </Pressable>
        <Text className="text-ink text-[17px] font-bold">Edit check-in</Text>
        <View style={{ width: 52 }} />
      </View>
      {post.data ? (
        <EditForm post={post.data} onDone={() => router.back()} />
      ) : (
        <View className="py-10">
          <ActivityIndicator color={colors.ale} />
        </View>
      )}
    </ScrollView>
  );
}

/** Mounted once the check-in has loaded, so its state starts from the real values. */
function EditForm({ post, onDone }: { post: Loaded; onDone: () => void }) {
  const update = useUpdateCheckin();
  const remove = useDeleteCheckin();
  const [rating, setRating] = useState<number | null>(post.rating != null ? Number(post.rating) : null);
  const [note, setNote] = useState(post.note ?? '');

  const save = () =>
    update.mutate(
      { id: post.id, rating, note: note.trim() || null },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onDone();
        },
        onError: (e) => Alert.alert('Could not save', e.message),
      },
    );

  const confirmDelete = () =>
    Alert.alert('Delete this check-in?', 'Photos, cheers and replies go with it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(post.id, { onSuccess: onDone, onError: (e) => Alert.alert('Could not delete', e.message) }) },
    ]);

  return (
    <>
      <Body>{post.pubs?.name ?? 'A pub'}</Body>
      <View className="gap-2">
        <Text className="text-ink text-[13px] font-bold uppercase tracking-wider">Stars</Text>
        <View className="flex-row items-center gap-3">
          <Stars value={rating} onChange={setRating} size={34} />
          {rating != null ? (
            <Pressable onPress={() => setRating(null)} hitSlop={8} accessibilityRole="button">
              <Text className="text-ink-soft text-[13px] font-semibold">Clear</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Field label="Note" value={note} onChangeText={setNote} placeholder="Anything worth remembering" multiline maxLength={500} style={{ minHeight: 90 }} />
      <Button label="Save" onPress={save} loading={update.isPending} />
      <Pressable onPress={confirmDelete} accessibilityRole="button" className="items-center py-2">
        <Text className="text-danger text-[15px] font-bold">Delete check-in</Text>
      </Pressable>
    </>
  );
}
