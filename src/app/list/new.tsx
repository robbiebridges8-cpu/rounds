import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Body, Button, Field } from '@/components/ui';
import { useCreateList, type ListKind } from '@/lib/lists';

export default function NewListSheet() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const create = useCreateList();
  const [kind, setKind] = useState<ListKind>(params.kind === 'crawl' ? 'crawl' : 'list');
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
      { title, description, kind },
      {
        onSuccess: (list) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.dismiss();
          router.push({ pathname: '/list/[id]', params: { id: list.id, add: '1' } });
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
        <Text className="text-ink text-[17px] font-bold">{kind === 'crawl' ? 'New crawl' : 'New list'}</Text>
        <View style={{ width: 52 }} />
      </View>
      <View className="flex-row gap-2">
        {(
          [
            ['list', 'List'],
            ['crawl', 'Crawl'],
          ] as [ListKind, string][]
        ).map(([key, label]) => {
          const on = kind === key;
          return (
            <Pressable key={key} onPress={() => setKind(key)} accessibilityRole="radio" accessibilityState={{ selected: on }} className={`h-10 flex-1 items-center justify-center rounded-full ${on ? 'bg-ink' : 'bg-surface'}`}>
              <Text className={`text-[14px] font-bold ${on ? 'text-canvas' : 'text-ink'}`}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Body>{kind === 'crawl' ? 'Pubs in order, with the walk between them. Share it and everyone can follow along.' : 'Name it, add pubs, then a line on each.'}</Body>
      <Field label="Name" value={title} onChangeText={setTitle} error={error} placeholder={kind === 'crawl' ? 'Friday in Soho' : 'Best gardens south of the river'} maxLength={60} autoFocus />
      <Field label="What it is" value={description} onChangeText={setDescription} placeholder="Optional. One or two lines." maxLength={280} multiline />
      <Button label="Create" onPress={save} loading={create.isPending} />
    </ScrollView>
  );
}
