import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ActionSheetIOS, Alert, Platform, Pressable, Text, View } from 'react-native';

import { Card, EmptyState, Icon, Stars } from '@/components/ui';
import { photoUrl, type UserCheckin } from '@/lib/checkins';
import { useDeleteCheckin } from '@/lib/feed';
import { colors, fonts } from '@/theme';

/**
 * Letterboxd's diary: every check-in, grouped by month, the day in a box on
 * the left. Reads as a record of nights out rather than a list of pubs.
 */
export function Diary({ checkins, me }: { checkins: UserCheckin[]; me: boolean }) {
  if (checkins.length === 0) {
    return (
      <Card>
        <EmptyState icon="book.closed" title="Nothing in the diary" body={me ? 'Every check-in lands here, by month.' : undefined} />
      </Card>
    );
  }

  const groups = new Map<string, UserCheckin[]>();
  for (const c of checkins) {
    const d = new Date(c.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }

  return (
    <View className="gap-5">
      {[...groups.entries()].map(([key, items]) => {
        const first = new Date(items[0].created_at);
        const label = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        return (
          <View key={key}>
            <Text className="text-ink-soft mb-2 px-1 text-[12px] font-bold uppercase tracking-wider">{label}</Text>
            <Card>
              {items.map((c, index) => (
                <DiaryRow key={c.id} checkin={c} mine={me} last={index === items.length - 1} />
              ))}
            </Card>
          </View>
        );
      })}
    </View>
  );
}

function DiaryRow({ checkin, mine, last }: { checkin: UserCheckin; mine: boolean; last: boolean }) {
  const router = useRouter();
  const remove = useDeleteCheckin();
  const d = new Date(checkin.created_at);
  const photo = checkin.checkin_photos[0];

  const edit = () => router.push({ pathname: '/checkin/edit/[id]', params: { id: checkin.id } });
  const confirmDelete = () =>
    Alert.alert('Delete this check-in?', 'Photos, cheers and replies go with it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(checkin.id, { onError: (e) => Alert.alert('Could not delete', e.message) }) },
    ]);
  const actions = () => {
    if (Platform.OS !== 'ios') return edit();
    ActionSheetIOS.showActionSheetWithOptions(
      { title: checkin.pubs?.name ?? 'This check-in', options: ['Edit', 'Delete', 'Cancel'], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
      (i) => (i === 0 ? edit() : i === 1 ? confirmDelete() : undefined),
    );
  };

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: checkin.id } })}
      onLongPress={mine ? actions : undefined}
      accessibilityRole="button"
      className="flex-row items-center gap-3 pl-3 active:bg-raised">
      <View className="w-11 items-center rounded-md bg-raised py-1.5">
        <Text className="text-ink-soft text-[10px] font-bold uppercase">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</Text>
        <Text className="text-ink" style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 24 }}>
          {d.getDate()}
        </Text>
      </View>
      <View className={`flex-1 flex-row items-center gap-3 py-3 pr-4 ${last ? '' : 'border-b border-line'}`}>
        <View className="flex-1 gap-0.5">
          <Text className="text-ink text-[17px] font-semibold" numberOfLines={1}>
            {checkin.pubs?.name ?? 'A pub'}
          </Text>
          {checkin.rating ? <Stars value={checkin.rating} size={12} /> : null}
          {checkin.note ? (
            <Text className="text-ink-soft text-[13px]" numberOfLines={1}>
              {checkin.note}
            </Text>
          ) : null}
        </View>
        {photo ? <Image source={{ uri: photoUrl(photo.storage_path) }} style={{ width: 44, height: 44, borderRadius: 8 }} contentFit="cover" /> : null}
        {mine ? (
          <Pressable onPress={actions} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit or delete">
            <Icon name="ellipsis" size={16} color={colors.inkSoft} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
