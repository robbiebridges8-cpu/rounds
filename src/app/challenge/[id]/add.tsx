import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Card, Field, Icon } from '@/components/ui';
import { useAddChallengePubs, useChallengePubs } from '@/lib/challenges';
import { formatDistance } from '@/lib/format';
import { getPosition, type Coords } from '@/lib/location';
import { useNearbyPubs } from '@/lib/pubs';
import { usePubSearch } from '@/lib/social';
import { colors } from '@/theme';

/** Form sheet: search or nearby, tick, add. Same shape as the first-pubs step. */
export default function AddPubsSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const existing = useChallengePubs(id);
  const add = useAddChallengePubs();

  const [coords, setCoords] = useState<Coords | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const nearby = useNearbyPubs(coords, 2000);
  const search = usePubSearch(query);

  useEffect(() => {
    void getPosition().then(setCoords);
  }, []);

  const already = new Set((existing.data ?? []).map((p) => p.pub_id));
  const searching = query.trim().length >= 2;
  const rows = (searching ? search.data : nearby.data)?.filter((p) => !already.has(p.id)) ?? [];
  const loading = searching ? search.isPending : Boolean(coords) && nearby.isPending;

  const toggle = (pubId: string) => {
    void Haptics.selectionAsync();
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(pubId)) next.delete(pubId);
      else next.add(pubId);
      return next;
    });
  };

  const save = () =>
    add.mutate(
      { id, pubIds: [...picked] },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: (error) => Alert.alert('Could not add those', error.message),
      }
    );

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-5 pb-6 pt-5"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
            <Text className="text-ale text-[17px]">Cancel</Text>
          </Pressable>
          <Text className="text-ink text-[17px] font-semibold">Add pubs</Text>
          <View style={{ width: 52 }} />
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
            {coords ? 'Near you' : 'Search by name'}
          </Text>
        ) : null}

        {loading ? (
          <View className="py-8">
            <ActivityIndicator color={colors.ale} />
          </View>
        ) : null}

        {rows.length > 0 ? (
          <Card>
            {rows.map((pub, index) => {
              const on = picked.has(pub.id);
              const meta = [
                'distance_m' in pub ? formatDistance(pub.distance_m) : null,
                'borough' in pub ? pub.borough : pub.address,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <Pressable
                  key={pub.id}
                  onPress={() => toggle(pub.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  className="flex-row items-center gap-3 pl-4 active:bg-ale-tint">
                  <Icon name={on ? 'checkmark.circle.fill' : 'circle'} size={26} color={on ? colors.ale : colors.line} />
                  <View className={`flex-1 py-3 pr-4 ${index === rows.length - 1 ? '' : 'border-b border-line'}`}>
                    <Text className="text-ink text-[17px]" numberOfLines={1}>
                      {pub.name}
                    </Text>
                    {meta ? (
                      <Text className="text-ink-soft text-[13px]" numberOfLines={1}>
                        {meta}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </Card>
        ) : null}
      </ScrollView>

      <View className="border-t border-line px-5 pb-6 pt-3">
        <Button
          label={picked.size ? `Add ${picked.size} ${picked.size === 1 ? 'pub' : 'pubs'}` : 'Pick some pubs'}
          onPress={save}
          disabled={picked.size === 0}
          loading={add.isPending}
        />
      </View>
    </View>
  );
}
