import type { SFSymbol } from 'expo-symbols';
import { Text, View } from 'react-native';

import { Icon } from '@/components/ui';
import { listColor, type Badge } from '@/lib/lists';

export function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <View className="h-2 overflow-hidden rounded-full bg-line">
      <View className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
    </View>
  );
}

export function ListIcon({ icon, color, size = 44, done }: { icon: string; color: string; size?: number; done?: boolean }) {
  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: done ? color : `${color}22`, borderWidth: done ? 0 : 1.5, borderColor: `${color}55` }}>
      <Icon name={icon as SFSymbol} size={size * 0.45} color={done ? '#fff' : color} weight="semibold" />
    </View>
  );
}

/** Finished lists on a profile. Earned, not bought. */
export function BadgeRow({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null;
  return (
    <View className="flex-row flex-wrap gap-3">
      {badges.map((badge) => (
        <View key={badge.list_id} className="w-[72px] items-center gap-1.5">
          <ListIcon icon={badge.icon} color={listColor(badge.color)} size={56} done />
          <Text className="text-ink text-center text-[11px] font-semibold leading-3" numberOfLines={2}>
            {badge.title}
          </Text>
        </View>
      ))}
    </View>
  );
}
