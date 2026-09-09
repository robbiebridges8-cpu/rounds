import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, EmptyState, Icon, ListRow } from '@/components/ui';
import { usePubSearch } from '@/lib/social';
import { colors } from '@/theme';

/** Full-screen search, opened from the bar on the map. */
export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const results = usePubSearch(query);
  const searching = query.trim().length >= 2;

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-3 px-4 pb-3">
        <View className="h-12 flex-1 flex-row items-center gap-3 rounded-lg bg-raised px-4">
          <Icon name="magnifyingglass" size={18} color={colors.inkSoft} weight="semibold" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Any London pub"
            placeholderTextColor={colors.slate}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            className="text-ink flex-1 text-[17px]"
          />
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Text className="text-ink text-[17px] font-bold">Cancel</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-10" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {!searching ? (
          <EmptyState icon="magnifyingglass" title="Type a pub name" body="Two letters is enough to start." />
        ) : results.isPending ? (
          <View className="py-10">
            <ActivityIndicator color={colors.ale} />
          </View>
        ) : results.data && results.data.length > 0 ? (
          <Card>
            {results.data.map((pub, index) => (
              <ListRow
                key={pub.id}
                title={pub.name}
                subtitle={[pub.address, pub.borough].filter(Boolean).join(' · ')}
                onPress={() => {
                  router.dismiss();
                  router.push({ pathname: '/pub/[id]', params: { id: pub.id } });
                }}
                last={index === results.data.length - 1}
              />
            ))}
          </Card>
        ) : (
          <EmptyState icon="mappin.slash" title="No pub by that name" body="Try fewer words, or the street it is on." />
        )}
      </ScrollView>
    </View>
  );
}
