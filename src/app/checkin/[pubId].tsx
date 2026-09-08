import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Body, Button, Field, Icon, Stars } from '@/components/ui';
import { useCreateCheckin } from '@/lib/checkins';
import { offerWeeklyNudge } from '@/lib/notifications';
import { pickImage, type PickedImage } from '@/lib/images';
import { usePub } from '@/lib/pubs';
import { colors } from '@/theme';

const MAX_PHOTOS = 3;

export default function CheckinSheet() {
  const { pubId } = useLocalSearchParams<{ pubId: string }>();
  const router = useRouter();
  const pub = usePub(pubId);
  const create = useCreateCheckin();

  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<PickedImage[]>([]);

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

  const submit = () => {
    if (!pub.data) return;
    create.mutate(
      {
        pubId: pub.data.pub.id,
        pubCoords: { latitude: pub.data.pub.lat, longitude: pub.data.pub.lng },
        rating: rating || null,
        note,
        photos,
      },
      {
        onSuccess: ({ photoError }) => {
          void Haptics.notificationAsync(
            photoError
              ? Haptics.NotificationFeedbackType.Warning
              : Haptics.NotificationFeedbackType.Success
          );
          router.back();
          void offerWeeklyNudge();
          if (photoError) {
            Alert.alert('Checked in, but the photo did not upload', photoError);
          }
        },
        onError: (error) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Check-in did not save', error.message);
        },
      }
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerClassName="gap-6 px-5 pb-10 pt-4"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text className="text-ale text-[17px]">Cancel</Text>
        </Pressable>
        <Text className="text-ink text-[17px] font-semibold">Check in</Text>
        <View style={{ width: 52 }} />
      </View>

      <View className="gap-1">
        <Text className="text-ink font-display text-[28px] leading-9">{pub.data?.pub.name ?? ' '}</Text>
        <Body>Say how it was. Everything here is only ever seen by your mates.</Body>
      </View>

      <View className="items-center gap-2 py-2">
        <Stars value={rating} onChange={setRating} size={34} />
        <Text className="text-ink-soft text-sm">
          {rating ? ['', 'Avoid', 'Meh', 'Decent', 'Good', 'Belter'][rating] : 'Tap to rate (optional)'}
        </Text>
      </View>

      <Field
        label="Note"
        value={note}
        onChangeText={setNote}
        placeholder="Who you were with, what you drank, anything worth remembering."
        multiline
        maxLength={500}
      />

      <View className="gap-2">
        <Text className="text-ink text-sm font-bold uppercase tracking-wide">Photos</Text>
        <View className="flex-row gap-3">
          {photos.map((photo, index) => (
            <Pressable
              key={photo.uri}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))}>
              <Image
                source={{ uri: photo.uri }}
                style={{ width: 88, height: 88, borderRadius: 12 }}
                contentFit="cover"
              />
              <View className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full bg-card">
                <Icon name="xmark.circle.fill" size={22} color={colors.ink} />
              </View>
            </Pressable>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <Pressable
              onPress={choosePhotoSource}
              accessibilityRole="button"
              accessibilityLabel="Add a photo"
              className="h-[88px] w-[88px] items-center justify-center rounded-lg border-2 border-dashed border-line bg-card active:bg-ale-tint">
              <Icon name="camera" size={24} color={colors.ale} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Button label="Check in" onPress={submit} loading={create.isPending} disabled={!pub.data} />
    </ScrollView>
  );
}
