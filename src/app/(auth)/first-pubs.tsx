import { useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Body, Button, Card, Field, Heading, Icon, Screen } from '@/components/ui';
import { useSession } from '@/lib/auth';
import { formatDistance } from '@/lib/format';
import { takePendingInvite, useAcceptInvite } from '@/lib/invites';
import { getPosition, type Coords } from '@/lib/location';
import { useNearbyPubs } from '@/lib/pubs';
import { usePubSearch } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

type Pick = { id: string; name: string };

/**
 * The last onboarding step. A map with nothing on it is the fastest way to
 * lose someone, so before they see it they tick the pubs they already know.
 * These check-ins carry no location or rating: they count, they are just
 * not "verified".
 */
export default function FirstPubs() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const acceptInvite = useAcceptInvite();

  const [coords, setCoords] = useState<Coords | null>(null);
  const [located, setLocated] = useState(false);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Map<string, Pick>>(new Map());
  const [saving, setSaving] = useState(false);

  const nearby = useNearbyPubs(coords, 2500);
  const search = usePubSearch(query);

  useEffect(() => {
    void getPosition().then((position) => {
      setCoords(position);
      setLocated(true);
    });
  }, []);

  const toggle = (pub: Pick) => {
    void Haptics.selectionAsync();
    setPicked((current) => {
      const next = new Map(current);
      if (next.has(pub.id)) next.delete(pub.id);
      else next.set(pub.id, pub);
      return next;
    });
  };

  const finish = async (withPubs: boolean) => {
    setSaving(true);
    try {
      const userId = session!.user.id;
      if (withPubs && picked.size > 0) {
        const { error } = await supabase.from('checkins').insert(
          [...picked.keys()].map((pub_id) => ({
            user_id: userId,
            pub_id,
            client_id: Crypto.randomUUID(),
          }))
        );
        if (error) throw error;
      }

      // A link opened before sign-in lands here.
      const code = await takePendingInvite();
      if (code) {
        try {
          const inviter = await acceptInvite.mutateAsync(code);
          Alert.alert('Friends', `You and ${inviter.display_name} are now friends.`);
        } catch {
          // a bad code is not worth blocking onboarding over
        }
      }

      void queryClient.invalidateQueries();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (error) {
      Alert.alert('Could not save those', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const searching = query.trim().length >= 2;
  const rows = searching ? search.data : nearby.data;
  const loading = searching ? search.isPending : Boolean(coords) && nearby.isPending;

  return (
    <Screen>
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-6 pb-6 pt-8"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View className="gap-2">
            <Heading>Where have you been?</Heading>
            <Body>Tick the pubs you already know. They turn gold on your map straight away.</Body>
          </View>

          <Field
            value={query}
            onChangeText={setQuery}
            placeholder="Search any London pub"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />

          {!searching ? (
            <Text className="text-ink-soft px-1 text-sm font-semibold uppercase tracking-wide">
              {coords ? 'Near you' : located ? 'Location is off. Search instead.' : 'Finding you'}
            </Text>
          ) : null}

          {loading ? (
            <View className="py-8">
              <ActivityIndicator color={colors.ale} />
            </View>
          ) : null}

          {rows && rows.length > 0 ? (
            <Card>
              {rows.map((pub, index) => {
                const on = picked.has(pub.id);
                const distance = 'distance_m' in pub ? formatDistance(pub.distance_m) : null;
                const place = 'borough' in pub ? (pub.address ?? pub.borough) : pub.address;
                const subtitle = [distance, place].filter(Boolean).join(' · ');
                return (
                  <Pressable
                    key={pub.id}
                    onPress={() => toggle({ id: pub.id, name: pub.name })}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    className="flex-row items-center gap-3 pl-4 active:bg-ale-tint">
                    <Icon
                      name={on ? 'checkmark.circle.fill' : 'circle'}
                      size={26}
                      color={on ? colors.you : colors.line}
                    />
                    <View
                      className={`flex-1 py-3 pr-4 ${
                        index === rows.length - 1 ? '' : 'border-b border-line'
                      }`}>
                      <Text className="text-ink text-[17px]" numberOfLines={1}>
                        {pub.name}
                      </Text>
                      {subtitle ? (
                        <Text className="text-ink-soft text-[13px]" numberOfLines={1}>
                          {subtitle}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          ) : null}

          {rows && rows.length === 0 && !loading ? (
            <Body>{searching ? 'No pub by that name.' : 'No pubs within 2.5 km.'}</Body>
          ) : null}
        </ScrollView>

        <View className="gap-3 border-t border-line bg-canvas px-6 pb-2 pt-4">
          <Button
            label={picked.size ? `Add ${picked.size} ${picked.size === 1 ? 'pub' : 'pubs'}` : 'Pick a pub'}
            onPress={() => void finish(true)}
            loading={saving}
            disabled={picked.size === 0}
          />
          <Button label="Skip for now" variant="quiet" onPress={() => void finish(false)} disabled={saving} />
        </View>
      </View>
    </Screen>
  );
}
