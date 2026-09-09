import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { ChallengeIcon } from '@/components/challenge-card';
import { Body, Button, Field, Icon } from '@/components/ui';
import {
  CHALLENGE_COLORS,
  CHALLENGE_ICONS,
  useCreateChallenge,
  type ChallengeColor,
} from '@/lib/challenges';
import { colors } from '@/theme';

export default function NewChallengeSheet() {
  const router = useRouter();
  const create = useCreateChallenge();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<SFSymbol>('flag.fill');
  const [color, setColor] = useState<ChallengeColor>('ale');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (title.trim().length < 3) {
      setError('Give it a name. Three characters or more.');
      return;
    }
    setError(null);
    create.mutate(
      { title, description, icon, color },
      {
        onSuccess: (challenge) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.dismiss();
          router.push({ pathname: '/challenge/[id]', params: { id: challenge.id } });
        },
        onError: (e) => Alert.alert('Could not create that', e.message),
      }
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="gap-6 px-5 pb-10 pt-5"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text className="text-ale text-[17px]">Cancel</Text>
        </Pressable>
        <Text className="text-ink text-[17px] font-semibold">New challenge</Text>
        <View style={{ width: 52 }} />
      </View>

      <View className="items-center gap-3">
        <ChallengeIcon icon={icon} color={CHALLENGE_COLORS[color]} size={88} done />
        <Body>Pick a look. You add the pubs next.</Body>
      </View>

      <Field
        label="Name"
        value={title}
        onChangeText={setTitle}
        error={error}
        placeholder="Every pub on the Circle line"
        maxLength={60}
        autoFocus
      />
      <Field
        label="The pitch"
        value={description}
        onChangeText={setDescription}
        placeholder="Optional. One line on why anyone would do this."
        maxLength={280}
        multiline
      />

      <View className="gap-2">
        <Text className="text-ink text-sm font-bold uppercase tracking-wide">Icon</Text>
        <View className="flex-row flex-wrap gap-3">
          {CHALLENGE_ICONS.map((name) => {
            const on = name === icon;
            return (
              <Pressable
                key={name}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setIcon(name);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                className={`h-12 w-12 items-center justify-center rounded-full border-2 ${
                  on ? 'border-ink bg-surface' : 'border-line bg-surface'
                }`}>
                <Icon name={name} size={20} color={on ? colors.ink : colors.inkSoft} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-ink text-sm font-bold uppercase tracking-wide">Colour</Text>
        <View className="flex-row gap-3">
          {(Object.keys(CHALLENGE_COLORS) as ChallengeColor[]).map((key) => {
            const on = key === color;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setColor(key);
                }}
                accessibilityRole="radio"
                accessibilityLabel={key}
                accessibilityState={{ selected: on }}
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: CHALLENGE_COLORS[key], borderWidth: on ? 3 : 0, borderColor: colors.ink }}>
                {on ? <Icon name="checkmark" size={18} color="#fff" weight="bold" /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button label="Create" onPress={save} loading={create.isPending} />
    </ScrollView>
  );
}
