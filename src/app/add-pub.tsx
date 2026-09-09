import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Body, Button, Field, Icon } from '@/components/ui';
import { useCreatePub } from '@/lib/claims';
import { getPosition, type Coords } from '@/lib/location';
import { colors } from '@/theme';

/**
 * A pub the import missed. Placed where you are standing, which is where
 * you almost always are when you notice one is missing.
 */
export default function AddPubSheet() {
  const router = useRouter();
  const create = useCreatePub();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [located, setLocated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPosition().then((c) => {
      setCoords(c);
      setLocated(true);
    });
  }, []);

  const submit = () => {
    if (name.trim().length < 2) {
      setError('What is it called?');
      return;
    }
    if (!coords) {
      setError('We need your location to place it. Allow location and try again.');
      return;
    }
    setError(null);
    create.mutate(
      { name, lat: coords.latitude, lng: coords.longitude, address },
      {
        onSuccess: (pub) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.dismiss();
          router.push({ pathname: '/pub/[id]', params: { id: pub.id } });
        },
        onError: (e) => Alert.alert('Could not add that', e.message),
      }
    );
  };

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 px-5 pb-10 pt-4" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text className="text-ink text-[17px] font-semibold">Cancel</Text>
        </Pressable>
        <Text className="text-ink text-[17px] font-bold">Add a pub</Text>
        <View style={{ width: 52 }} />
      </View>
      <Body>Search first, most pubs are already here. If it really is missing, add it from inside it.</Body>
      <Field label="Name" value={name} onChangeText={setName} error={error} placeholder="The Crown" autoFocus maxLength={120} />
      <Field label="Address" value={address} onChangeText={setAddress} placeholder="Optional. Street and postcode." maxLength={200} />
      <View className="flex-row items-center gap-2 rounded-md bg-surface px-4 py-3">
        <Icon name={coords ? 'location.fill' : 'location.slash'} size={16} color={coords ? colors.you : colors.inkSoft} />
        <Text className="text-ink-soft flex-1 text-[14px]">
          {coords ? 'Placed at your current location.' : located ? 'Location is off. It cannot be placed.' : 'Finding you'}
        </Text>
      </View>
      <Button label="Add pub" onPress={submit} loading={create.isPending} />
    </ScrollView>
  );
}
