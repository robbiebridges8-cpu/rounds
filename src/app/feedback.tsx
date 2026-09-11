import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Body, Button, Field, Icon } from '@/components/ui';
import { FEEDBACK_KINDS, useSendFeedback, type FeedbackKind } from '@/lib/feedback';
import { pickImage, type PickedImage } from '@/lib/images';
import { colors } from '@/theme';

/**
 * Bugs, ideas, anything. The device and app version go along without being
 * asked for; a screenshot is one tap. Everything lands in the admin inbox.
 */
export default function FeedbackSheet() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const send = useSendFeedback();
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
  const [shot, setShot] = useState<PickedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addShot = async () => {
    const picked = await pickImage('library');
    if (picked) setShot(picked);
  };

  const submit = () => {
    if (message.trim().length < 3) {
      setError('Say a bit more than that.');
      return;
    }
    setError(null);
    send.mutate(
      { kind, message, screen: from ?? null, screenshot: shot },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
          Alert.alert('Cheers', kind === 'bug' ? 'We will get on it.' : 'Read by a human, every one.');
        },
        onError: (e) => Alert.alert('Could not send that', e.message),
      },
    );
  };

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 px-5 pb-10 pt-4" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text className="text-ink text-[17px] font-semibold">Cancel</Text>
        </Pressable>
        <Text className="text-ink text-[17px] font-bold">Tell us</Text>
        <View style={{ width: 52 }} />
      </View>
      <Body>Broken, confusing, missing, or just an idea. Every one gets read.</Body>

      <View className="flex-row flex-wrap gap-2">
        {FEEDBACK_KINDS.map((k) => {
          const on = kind === k.key;
          return (
            <Pressable key={k.key} onPress={() => setKind(k.key)} accessibilityRole="radio" accessibilityState={{ selected: on }} className={`h-10 flex-row items-center rounded-full px-4 ${on ? 'bg-ink' : 'bg-surface'}`}>
              <Text className={`text-[14px] font-bold ${on ? 'text-canvas' : 'text-ink'}`}>{k.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Field
        label="What happened"
        value={message}
        onChangeText={setMessage}
        error={error}
        placeholder={kind === 'bug' ? 'What were you doing, and what went wrong?' : kind === 'idea' ? 'What would make it better?' : 'Go on'}
        multiline
        autoFocus
        maxLength={2000}
        style={{ minHeight: 120 }}
      />

      {shot ? (
        <View className="flex-row items-center gap-3">
          <Image source={{ uri: shot.uri }} style={{ width: 64, height: 64 * (shot.height / shot.width), maxHeight: 120, borderRadius: 10 }} contentFit="cover" />
          <Pressable onPress={() => setShot(null)} hitSlop={8} accessibilityRole="button">
            <Text className="text-ink-soft text-[14px] font-semibold">Remove screenshot</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => void addShot()} accessibilityRole="button" className="flex-row items-center gap-2 self-start rounded-full bg-surface px-4 py-2.5 active:opacity-80">
          <Icon name="photo" size={16} color={colors.ink} />
          <Text className="text-ink text-[14px] font-bold">Add a screenshot</Text>
        </Pressable>
      )}

      <Button label="Send" onPress={submit} loading={send.isPending} />
      <Text className="text-ink-soft text-[12px]">Your phone model, iOS version and which screen you were on are sent with it. Nothing else.</Text>
    </ScrollView>
  );
}
