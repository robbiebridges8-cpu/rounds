import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Body, Button, Field } from '@/components/ui';
import { useCreateList } from '@/lib/lists';

export default function NewListSheet() {
  const router = useRouter();
  const create = useCreateList();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (title.trim().length < 3) {
      setError('Give it a name. Three characters or more.');
      return;
    }
    setError(null);
    create.mutate(
      { title, description },
      {
        onSuccess: (list) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.dismiss();
          router.push({ pathname: '/list/[id]', params: { id: list.id } });
        },
        onError: (e) => Alert.alert('Could not create that', e.message),
      }
    );
  };

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-6 px-5 pb-10 pt-4" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text className="text-ink text-[17px] font-semibold">Cancel</Text>
        </Pressable>
        <Text className="text-ink text-[17px] font-bold">New list</Text>
        <View style={{ width: 52 }} />
      </View>
      <Body>Name it, add pubs, then a line on each.</Body>
      <Field label="Name" value={title} onChangeText={setTitle} error={error} placeholder="Best gardens south of the river" maxLength={60} autoFocus />
      <Field label="What it is" value={description} onChangeText={setDescription} placeholder="Optional. One or two lines." maxLength={280} multiline />
      <Button label="Create" onPress={save} loading={create.isPending} />
    </ScrollView>
  );
}
