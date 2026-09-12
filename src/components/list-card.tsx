import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui';
import type { ListSummary } from '@/lib/lists';
import { colors } from '@/theme';

/** A list on the Explore tab: title, who, three pub names, follow count. */
export function ListCard({ list, onPress }: { list: ListSummary; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="gap-2 rounded-lg bg-surface p-4 active:bg-raised">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-ink font-display text-[19px] leading-6" style={{ letterSpacing: -0.5 }} numberOfLines={2}>
            {list.title}
          </Text>
          <Text className="text-ink-soft mt-0.5 text-[13px]" numberOfLines={1}>
            {list.pub_count ? `${list.been_count} of ${list.pub_count} been` : 'No pubs yet'} · by {list.creator_name}
            {list.follower_count ? ` · ${list.follower_count} following` : ''}
          </Text>
        </View>
        {list.following ? <Icon name="bookmark.fill" size={18} color={colors.you} /> : <Icon name="chevron.right" size={14} color={colors.slate} weight="semibold" />}
      </View>
      {list.sample.length > 0 ? (
        <Text className="text-ink text-[14px]" numberOfLines={1}>
          {list.sample.join(' · ')}
          {list.pub_count > list.sample.length ? ` · +${list.pub_count - list.sample.length}` : ''}
        </Text>
      ) : null}
    </Pressable>
  );
}
