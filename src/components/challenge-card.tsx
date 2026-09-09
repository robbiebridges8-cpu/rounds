import type { SFSymbol } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui';
import { challengeColor, type Badge, type Challenge } from '@/lib/challenges';
import { colors, fonts } from '@/theme';

export function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <View className="h-2 overflow-hidden rounded-full bg-line">
      <View className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
    </View>
  );
}

export function ChallengeIcon({
  icon,
  color,
  size = 44,
  done,
}: {
  icon: string;
  color: string;
  size?: number;
  done?: boolean;
}) {
  return (
    <View
      className="items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: done ? color : `${color}22`,
        borderWidth: done ? 0 : 1.5,
        borderColor: `${color}55`,
      }}>
      <Icon name={icon as SFSymbol} size={size * 0.45} color={done ? '#fff' : color} weight="semibold" />
    </View>
  );
}

export function ChallengeCard({ challenge, onPress }: { challenge: Challenge; onPress: () => void }) {
  const color = challengeColor(challenge.color);
  const done = Boolean(challenge.completed_at);
  const pct = challenge.pub_count ? Math.round((challenge.done_count / challenge.pub_count) * 100) : 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="gap-3 rounded-lg border border-line bg-surface p-4 active:bg-ale-tint/40">
      <View className="flex-row items-center gap-3">
        <ChallengeIcon icon={challenge.icon} color={color} done={done} />
        <View className="flex-1">
          <Text className="text-ink font-display text-[20px] leading-6" numberOfLines={2}>
            {challenge.title}
          </Text>
          <Text className="text-ink-soft text-[13px]" numberOfLines={1}>
            {challenge.pub_count} {challenge.pub_count === 1 ? 'pub' : 'pubs'} ·{' '}
            {challenge.member_count} {challenge.member_count === 1 ? 'person' : 'people'} ·{' '}
            by {challenge.creator_name}
          </Text>
        </View>
        {done ? (
          <Icon name="checkmark.seal.fill" size={24} color={color} />
        ) : challenge.joined ? (
          <Text style={{ fontFamily: fonts.displayBlack, fontSize: 20, color }}>{pct}%</Text>
        ) : (
          <Icon name="chevron.right" size={14} color={colors.slate} weight="semibold" />
        )}
      </View>
      {challenge.joined && !done ? (
        <ProgressBar value={challenge.done_count} total={challenge.pub_count} color={color} />
      ) : null}
    </Pressable>
  );
}

/** Completed challenges on a profile. Earned, not bought. */
export function BadgeRow({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null;
  return (
    <View className="flex-row flex-wrap gap-3">
      {badges.map((badge) => {
        const color = challengeColor(badge.color);
        return (
          <View key={badge.challenge_id} className="w-[72px] items-center gap-1.5">
            <ChallengeIcon icon={badge.icon} color={color} size={56} done />
            <Text className="text-ink text-center text-[11px] font-semibold leading-3" numberOfLines={2}>
              {badge.title}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
