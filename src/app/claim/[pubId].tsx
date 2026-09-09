import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Body, Button, Field } from '@/components/ui';
import { useClaimPub, type ClaimRole } from '@/lib/claims';
import { usePub } from '@/lib/pubs';

const ROLES: { key: ClaimRole; label: string }[] = [
  { key: 'landlord', label: 'I run it' },
  { key: 'manager', label: 'I manage it' },
  { key: 'brand', label: 'I represent a brand' },
];

/** Claim a pub page. Reviewed by hand before anything shows. */
export default function ClaimSheet() {
  const { pubId } = useLocalSearchParams<{ pubId: string }>();
  const router = useRouter();
  const pub = usePub(pubId);
  const claim = useClaimPub();
  const [role, setRole] = useState<ClaimRole>('landlord');
  const [contact, setContact] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (contact.trim().length < 3) {
      setError('An email or phone number so we can check.');
      return;
    }
    setError(null);
    claim.mutate(
      { pubId, role, contact },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
          Alert.alert('Claim sent', 'We check every claim by hand. You will hear back within a few days.');
        },
        onError: (e) => Alert.alert('Could not send that', e.message.includes('duplicate') ? 'You have already claimed this pub.' : e.message),
      }
    );
  };

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-6 px-5 pb-10 pt-4" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text className="text-ink text-[17px] font-semibold">Cancel</Text>
        </Pressable>
        <Text className="text-ink text-[17px] font-bold">Claim this pub</Text>
        <View style={{ width: 52 }} />
      </View>

      <View className="gap-1">
        <Text className="text-ink font-display text-[26px] leading-8" style={{ letterSpacing: -0.8 }}>
          {pub.data?.pub.name ?? ' '}
        </Text>
        <Body>Claimed pubs can post opening hours, an event and an offer to everyone who has been.</Body>
      </View>

      <View className="gap-2">
        {ROLES.map((r) => {
          const on = role === r.key;
          return (
            <Pressable
              key={r.key}
              onPress={() => setRole(r.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              className={`h-[52px] flex-row items-center justify-between rounded-md px-4 ${on ? 'bg-ink' : 'bg-surface'}`}>
              <Text className={`text-[16px] font-bold ${on ? 'text-white' : 'text-ink'}`}>{r.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Field label="How do we reach you?" value={contact} onChangeText={setContact} error={error} placeholder="Email or phone" autoCapitalize="none" keyboardType="email-address" />

      <Button label="Send claim" onPress={submit} loading={claim.isPending} />
    </ScrollView>
  );
}
