import { Pressable, Text, View } from 'react-native';

import { ProgressBar } from '@/components/list-badges';
import { Icon } from '@/components/ui';
import { listColor, type ListSummary } from '@/lib/lists';
import { colors, fonts } from '@/theme';

/** A list on the Explore tab: title, how far you are through it, who made it. */
export function ListCard({ list, onPress }: { list: ListSummary; onPress: () => void }) {
  const color = listColor(list.color);
  const done = Boolean(list.completed_at);
  const pct = list.pub_count ? Math.round((list.been_count / list.pub_count) * 100) : 0;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="gap-3 rounded-lg bg-surface p-4 active:bg-raised">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          {list.kind === 'crawl' ? (
            <View className="mb-1 self-start rounded-full px-2 py-0.5" style={{ backgroundColor: colors.butter }}>
              <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#101014' }}>Crawl</Text>
            </View>
          ) : null}
          <Text className="text-ink font-display text-[19px] leading-6" style={{ letterSpacing: -0.5 }} numberOfLines={2}>
            {list.title}
          </Text>
          <Text className="text-ink-soft mt-0.5 text-[13px]" numberOfLines={1}>
            {list.pub_count ? `${list.been_count} of ${list.pub_count} been` : 'No pubs yet'} · by {list.creator_name}
            {list.follower_count ? ` · ${list.follower_count} saved` : ''}
          </Text>
        </View>
        {done ? (
          <Icon name="checkmark.seal.fill" size={24} color={color} />
        ) : (
          <View className="items-end">
            <Text style={{ fontFamily: fonts.display, fontSize: 20, color }}>{pct}%</Text>
            {list.following ? <Icon name="bookmark.fill" size={12} color={colors.you} /> : null}
          </View>
        )}
      </View>
      {list.sample.length > 0 ? (
        <Text className="text-ink text-[14px]" numberOfLines={1}>
          {list.sample.join(list.kind === 'crawl' ? ' → ' : ' · ')}
          {list.pub_count > list.sample.length ? ` · +${list.pub_count - list.sample.length}` : ''}
        </Text>
      ) : null}
      {!done && list.pub_count > 0 ? <ProgressBar value={list.been_count} total={list.pub_count} color={color} /> : null}
    </Pressable>
  );
}
