import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Avatar, Body, Button, Field, Icon, Stars } from '@/components/ui';
import { useProfile } from '@/lib/auth';
import { useCreateCheckin } from '@/lib/checkins';
import { useFriendships } from '@/lib/friends';
import { pickImage, type PickedImage } from '@/lib/images';
import { inviteLink, useInviteCode } from '@/lib/invites';
import { offerWeeklyNudge } from '@/lib/notifications';
import { usePub } from '@/lib/pubs';
import { colors } from '@/theme';

const MAX_PHOTOS = 3;

const LABELS: Record<string, string> = {
  '0.5': 'Never again', '1': 'Grim', '1.5': 'Poor', '2': 'Meh', '2.5': 'Fine',
  '3': 'Decent', '3.5': 'Good', '4': 'Very good', '4.5': 'Excellent', '5': 'Belter',
};

export default function CheckinSheet() {
  const { pubId } = useLocalSearchParams<{ pubId: string }>();
  const router = useRouter();
  const pub = usePub(pubId);
  const create = useCreateCheckin();
  const friendships = useFriendships();
  const { data: me } = useProfile();
  const inviteCode = useInviteCode();

  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<PickedImage[]>([]);
  const [tagged, setTagged] = useState<Set<string>>(new Set());
  const [guests, setGuests] = useState<string[]>([]);
  const [guestName, setGuestName] = useState('');

  const addPhoto = async (source: 'camera' | 'library') => {
    const picked = await pickImage(source);
    if (picked) setPhotos((current) => [...current, picked].slice(0, MAX_PHOTOS));
  };

  const choosePhotoSource = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take a photo', 'Choose from library'], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) void addPhoto('camera');
          if (index === 2) void addPhoto('library');
        }
      );
    } else {
      Alert.alert('Add a photo', undefined, [
        { text: 'Take a photo', onPress: () => void addPhoto('camera') },
        { text: 'Choose from library', onPress: () => void addPhoto('library') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const toggleTag = (id: string) => {
    void Haptics.selectionAsync();
    setTagged((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addGuest = () => {
    const name = guestName.trim();
    if (!name) return;
    setGuests((current) => [...current, name]);
    setGuestName('');
  };

  /** The text to the people who are not on Rounds. Sent from this phone. */
  const textGuests = async () => {
    if (guests.length === 0 || !me || !inviteCode.data) return;
    if (!(await SMS.isAvailableAsync())) return;
    const pubName = pub.data?.pub.name ?? 'the pub';
    await SMS.sendSMSAsync(
      [],
      `${me.display_name} put you at ${pubName} on Rounds, the pub map for you and your mates. Claim it: ${inviteLink(inviteCode.data)} (code ${inviteCode.data})`
    );
  };

  const submit = () => {
    if (!pub.data) return;
    create.mutate(
      {
        pubId: pub.data.pub.id,
        pubCoords: { latitude: pub.data.pub.lat, longitude: pub.data.pub.lng },
        rating: rating || null,
        note,
        photos,
        tagIds: [...tagged],
        guests,
      },
      {
        onSuccess: async ({ photoError }) => {
          void Haptics.notificationAsync(photoError ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success);
          router.back();
          void offerWeeklyNudge();
          if (photoError) Alert.alert('Checked in, but the photo did not upload', photoError);
          await textGuests();
        },
        onError: (error) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Check-in did not save', error.message);
        },
      }
    );
  };

  const friends = friendships.data?.friends ?? [];

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="gap-6 px-5 pb-10 pt-4"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text className="text-ink text-[17px] font-semibold">Cancel</Text>
        </Pressable>
        <Text className="text-ink text-[17px] font-bold">Check in</Text>
        <View style={{ width: 52 }} />
      </View>

      <View className="gap-1">
        <Text className="text-ink font-display text-[28px] leading-9" style={{ letterSpacing: -1 }}>
          {pub.data?.pub.name ?? ' '}
        </Text>
        <Body>Say how it was. Only your mates ever see this.</Body>
      </View>

      <View className="items-center gap-1 rounded-lg bg-surface py-5">
        <Stars value={rating} onChange={(v) => { void Haptics.selectionAsync(); setRating(v); }} size={34} />
        <Text className="text-ink-soft text-[14px] font-semibold">
          {rating ? `${LABELS[String(rating)]} · ${rating} stars` : 'Tap to rate. Halves count.'}
        </Text>
      </View>

      <View className="gap-3">
        <Text className="text-ink text-[13px] font-bold uppercase tracking-wider">Who&apos;s here?</Text>
        {friends.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {friends.map((f) => {
              const on = tagged.has(f.id);
              return (
                <Pressable
                  key={f.id}
                  onPress={() => toggleTag(f.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  className="h-10 flex-row items-center gap-2 rounded-full pl-1 pr-3.5"
                  style={{ backgroundColor: on ? colors.ale : colors.surface, borderWidth: 2, borderColor: on ? colors.ale : colors.line }}>
                  <Avatar url={f.avatar_url} name={f.display_name} size={30} />
                  <Text className="text-[14px] font-bold" style={{ color: on ? '#fff' : colors.ink }}>{f.display_name}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <View className="flex-row flex-wrap gap-2">
          {guests.map((g, i) => (
            <Pressable
              key={`${g}-${i}`}
              onPress={() => setGuests((c) => c.filter((_, j) => j !== i))}
              className="h-10 flex-row items-center gap-1.5 rounded-full bg-butter px-3.5">
              <Text className="text-[14px] font-bold" style={{ color: '#101014' }}>{g}</Text>
              <Icon name="xmark" size={11} color="#101014" weight="bold" />
            </Pressable>
          ))}
        </View>
        <View className="flex-row gap-2">
          <TextInput
            value={guestName}
            onChangeText={setGuestName}
            placeholder="Someone not on Rounds"
            placeholderTextColor={colors.slate}
            returnKeyType="done"
            onSubmitEditing={addGuest}
            autoCapitalize="words"
            className="text-ink h-11 flex-1 rounded-full bg-raised px-4 text-[15px]"
          />
          <Pressable onPress={addGuest} disabled={!guestName.trim()} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-ink" style={{ opacity: guestName.trim() ? 1 : 0.4 }}>
            <Icon name="plus" size={16} color="#fff" weight="bold" />
          </Pressable>
        </View>
        {guests.length > 0 ? (
          <Text className="text-ink-soft text-[12px]">After you check in, a text opens so you can send them the app.</Text>
        ) : null}
      </View>

      <Field label="Note" value={note} onChangeText={setNote} placeholder="Who you were with, what you drank, anything worth remembering." multiline maxLength={500} />

      <View className="gap-2">
        <Text className="text-ink text-[13px] font-bold uppercase tracking-wider">Photos</Text>
        <View className="flex-row gap-3">
          {photos.map((photo, index) => (
            <Pressable key={photo.uri} accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))}>
              <Image source={{ uri: photo.uri }} style={{ width: 88, height: 88, borderRadius: 14 }} contentFit="cover" />
              <View className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full bg-surface">
                <Icon name="xmark.circle.fill" size={22} color={colors.ink} />
              </View>
            </Pressable>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <Pressable onPress={choosePhotoSource} accessibilityRole="button" accessibilityLabel="Add a photo" className="h-[88px] w-[88px] items-center justify-center rounded-md bg-raised active:bg-line">
              <Icon name="camera.fill" size={24} color={colors.ink} />
            </Pressable>
          ) : null}
        </View>
        <Text className="text-ink-soft text-[12px]">A photo is what lets mates say cheers back.</Text>
      </View>

      <Button label="Check in" onPress={submit} loading={create.isPending} disabled={!pub.data} />
    </ScrollView>
  );
}
