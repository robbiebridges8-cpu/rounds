import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Body, Button, Field, Heading, Icon, Screen } from '@/components/ui';
import { colors } from '@/theme';
import { useSession } from '@/lib/auth';
import { compress, pickImage, uploadImage } from '@/lib/images';
import { supabase } from '@/lib/supabase';

const USERNAME_RULE = /^[a-z0-9_]{3,20}$/;

export default function Onboarding() {
  const router = useRouter();
  const { session } = useSession();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const chooseAvatar = async () => {
    const picked = await pickImage('library');
    if (picked) setAvatarUri((await compress(picked, 512)).uri);
  };

  const save = async () => {
    const handle = username.trim().toLowerCase();
    if (!USERNAME_RULE.test(handle)) {
      setError('3 to 20 characters: lowercase letters, numbers and underscores.');
      return;
    }
    if (!displayName.trim()) {
      setError('What should we call you?');
      return;
    }

    const userId = session!.user.id;
    setSaving(true);
    setError(null);

    try {
      let avatarUrl: string | null = null;
      if (avatarUri) {
        avatarUrl = await uploadImage('avatars', `${userId}/avatar.jpg`, {
          uri: avatarUri,
          width: 512,
          height: 512,
        });
      }

      const { error: insertError } = await supabase.from('profiles').insert({
        id: userId,
        username: handle,
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
      });

      if (insertError) {
        // 23505 is the unique index on username.
        setError(
          insertError.code === '23505' ? 'That username is taken.' : insertError.message
        );
        return;
      }

      // Navigate before the profile refetch lands, or the auth redirect
      // would bounce us to the map before the first-pubs step.
      router.replace('/first-pubs');
      void queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1 px-6"
          contentContainerClassName="gap-8 py-10"
          keyboardShouldPersistTaps="handled">
          <View className="gap-3">
            <Heading>Nearly there</Heading>
            <Body>Pick a name your mates will recognise.</Body>
          </View>

          <Pressable onPress={chooseAvatar} className="items-center gap-2">
            <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-line bg-surface">
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: 112, height: 112 }} />
              ) : (
                <Icon name="camera.fill" size={30} color={colors.ale} />
              )}
            </View>
            <Text className="text-ale font-bold">
              {avatarUri ? 'Change photo' : 'Add a photo (optional)'}
            </Text>
          </Pressable>

          <Field
            label="Username"
            value={username}
            onChangeText={(text) => setUsername(text.toLowerCase())}
            placeholder="robbie"
            hint="How friends find you. Lowercase, no spaces."
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />

          <Field
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            error={error}
            placeholder="Robbie"
            maxLength={40}
          />

          <Button label="Start logging pubs" onPress={save} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
