import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar, Button, Field } from '@/components/ui';
import { useProfile, useUpdateProfile } from '@/lib/auth';
import { compress, pickImage } from '@/lib/images';

const USERNAME_RULE = /^[a-z0-9_]{3,20}$/;

/** Your name, your handle, your photo. The same three as onboarding. */
export default function EditProfileSheet() {
  const router = useRouter();
  const profile = useProfile();
  const update = useUpdateProfile();
  const current = profile.data;
  const [username, setUsername] = useState(current?.username ?? '');
  const [displayName, setDisplayName] = useState(current?.display_name ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chooseAvatar = async () => {
    const picked = await pickImage('library');
    if (picked) setAvatarUri((await compress(picked, 512)).uri);
  };

  const save = () => {
    const handle = username.trim().toLowerCase();
    if (!USERNAME_RULE.test(handle)) {
      setError('3 to 20 characters: lowercase letters, numbers and underscores.');
      return;
    }
    if (!displayName.trim()) {
      setError('What should we call you?');
      return;
    }
    setError(null);
    update.mutate(
      { username: handle, displayName: displayName.trim(), avatarUri },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 px-5 pb-10 pt-4" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text className="text-ink text-[17px] font-semibold">Cancel</Text>
        </Pressable>
        <Text className="text-ink text-[17px] font-bold">Edit profile</Text>
        <View style={{ width: 52 }} />
      </View>

      <View className="items-center gap-3">
        <Pressable onPress={() => void chooseAvatar()} accessibilityRole="button" accessibilityLabel="Change photo" className="overflow-hidden rounded-full">
          {avatarUri ? <Image source={{ uri: avatarUri }} style={{ width: 112, height: 112 }} /> : <Avatar url={current?.avatar_url} name={current?.display_name ?? '?'} size={112} />}
        </Pressable>
        <Pressable onPress={() => void chooseAvatar()} hitSlop={8} accessibilityRole="button">
          <Text className="text-you text-[14px] font-bold">Change photo</Text>
        </Pressable>
      </View>

      <Field label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Robbie" maxLength={40} />
      <Field label="Username" value={username} onChangeText={setUsername} hint="How friends find you. Lowercase, no spaces." error={error} autoCapitalize="none" autoCorrect={false} maxLength={20} />
      <Button label="Save" onPress={save} loading={update.isPending} />
    </ScrollView>
  );
}
