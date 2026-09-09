import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Body, Button, Field } from '@/components/ui';
import { usePubClaim, useSavePubDetails } from '@/lib/claims';
import { usePub } from '@/lib/pubs';

/** What an approved claimant can say on the pub page. Four short fields. */
export default function PubDetailsSheet() {
  const { pubId } = useLocalSearchParams<{ pubId: string }>();
  const router = useRouter();
  const pub = usePub(pubId);
  const claim = usePubClaim(pubId);
  const save = useSavePubDetails();
  const d = claim.data?.details;

  const [hours, setHours] = useState(d?.hours ?? '');
  const [offer, setOffer] = useState(d?.offer ?? '');
  const [event, setEvent] = useState(d?.event ?? '');
  const [website, setWebsite] = useState(d?.website ?? '');

  const submit = () =>
    save.mutate(
      { pubId, hours: hours.trim() || null, offer: offer.trim() || null, event: event.trim() || null, website: website.trim() || null },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: (e) => Alert.alert('Could not save', e.message),
      }
    );

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 px-5 pb-10 pt-4" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text className="text-ink text-[17px] font-semibold">Cancel</Text>
        </Pressable>
        <Text className="text-ink text-[17px] font-bold">Your pub page</Text>
        <View style={{ width: 52 }} />
      </View>
      <View className="gap-1">
        <Text className="text-ink font-display text-[26px] leading-8" style={{ letterSpacing: -0.8 }}>
          {pub.data?.pub.name ?? ' '}
        </Text>
        <Body>Short and current beats long and stale. Everyone who has been sees this.</Body>
      </View>
      <Field label="Opening hours" value={hours} onChangeText={setHours} placeholder="Mon to Thu 12 to 11, Fri and Sat till 1, Sun till 10" maxLength={200} />
      <Field label="This week" value={event} onChangeText={setEvent} placeholder="Quiz Thursday 8pm. Live jazz Sunday." maxLength={200} />
      <Field label="Offer" value={offer} onChangeText={setOffer} placeholder="Show your Rounds badge for a pound off a pint, Tuesdays." maxLength={200} />
      <Field label="Website" value={website} onChangeText={setWebsite} placeholder="https://" autoCapitalize="none" keyboardType="url" maxLength={200} />
      <Button label="Save" onPress={submit} loading={save.isPending} />
    </ScrollView>
  );
}
