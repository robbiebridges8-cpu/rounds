import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar, Body, Button, Field, Stars } from '@/components/ui';
import { useFriendships } from '@/lib/friends';
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
  const friendships = useFriendships();
  const previousTagIds = post.checkin_tags.map((t) => t.user_id);
  const [rating, setRating] = useState<number | null>(post.rating != null ? Number(post.rating) : null);
  const [note, setNote] = useState(post.note ?? '');
  const [tagged, setTagged] = useState<Set<string>>(new Set(previousTagIds));
  const [when, setWhen] = useState<Date>(new Date(post.created_at));
  const friends = friendships.data?.friends ?? [];
  const toggleTag = (id: string) =>
    setTagged((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = () =>
    update.mutate(
      { id: post.id, rating, note: note.trim() || null, createdAt: when.toISOString(), tagIds: [...tagged], previousTagIds },
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
      {friends.length > 0 ? (
        <View className="gap-2">
          <Text className="text-ink text-[13px] font-bold uppercase tracking-wider">Who was there</Text>
          <View className="flex-row flex-wrap gap-2">
            {friends.map((f) => {
              const on = tagged.has(f.id);
              return (
                <Pressable key={f.id} onPress={() => toggleTag(f.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} className="h-10 flex-row items-center gap-2 rounded-full pl-1 pr-3.5" style={{ backgroundColor: on ? colors.ale : colors.raised }}>
                  <Avatar url={f.avatar_url} name={f.display_name} size={30} />
                  <Text className="text-[14px] font-bold" style={{ color: on ? '#fff' : colors.ink }}>{f.display_name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <View className="gap-2">
        <Text className="text-ink text-[13px] font-bold uppercase tracking-wider">When</Text>
        <View className="flex-row items-center justify-between rounded-md bg-surface px-3 py-2">
          <Text className="text-ink-soft text-[13px]">Went last week? Set the day.</Text>
          <DateTimePicker value={when} mode="datetime" display="compact" maximumDate={new Date()} minuteInterval={5} onChange={(_, d) => d && setWhen(d)} />
        </View>
      </View>
      <Field label="Note" value={note} onChangeText={setNote} placeholder="Add a note" multiline maxLength={500} style={{ minHeight: 90 }} />
      <Button label="Save" onPress={save} loading={update.isPending} />
      <Pressable onPress={confirmDelete} accessibilityRole="button" className="items-center py-2">
        <Text className="text-danger text-[15px] font-bold">Delete check-in</Text>
      </Pressable>
    </>
  );
}
