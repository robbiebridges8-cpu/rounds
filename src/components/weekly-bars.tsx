import { Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { colors, fonts } from '@/theme';

const WEEKS = 8;

/** Monday 00:00 of the week containing `date`. */
function weekStart(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d.getTime();
}

/**
 * Check-ins per week for the last eight weeks. Strava's little bar chart,
 * the one that makes a quiet fortnight look like a reproach.
 */
export function WeeklyBars({ dates, width }: { dates: string[]; width: number }) {
  const thisWeek = weekStart(new Date());
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const counts = new Array<number>(WEEKS).fill(0);
  for (const iso of dates) {
    const index = Math.floor((thisWeek - weekStart(new Date(iso))) / weekMs);
    if (index >= 0 && index < WEEKS) counts[WEEKS - 1 - index] += 1;
  }
  const max = Math.max(1, ...counts);
  const height = 56;
  const gap = 6;
  const bar = (width - gap * (WEEKS - 1)) / WEEKS;
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <View className="gap-2 rounded-lg border border-line bg-surface p-4">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-ink-soft text-[12px] font-semibold uppercase tracking-wide">Last 8 weeks</Text>
        <Text className="text-ink" style={{ fontFamily: fonts.display, fontSize: 20 }}>
          {total}
          <Text className="text-ink-soft text-[13px]"> {total === 1 ? 'check-in' : 'check-ins'}</Text>
        </Text>
      </View>
      <Svg width={width} height={height}>
        {counts.map((n, i) => {
          const h = Math.max(3, (n / max) * height);
          const current = i === WEEKS - 1;
          return (
            <Rect
              key={i}
              x={i * (bar + gap)}
              y={height - h}
              width={bar}
              height={h}
              rx={3}
              fill={n === 0 ? colors.raised : current ? colors.ale : colors.you}
            />
          );
        })}
      </Svg>
      <View className="flex-row justify-between">
        <Text className="text-ink-soft text-[11px]">7 weeks ago</Text>
        <Text className="text-ink-soft text-[11px]">This week: {counts[WEEKS - 1]}</Text>
      </View>
    </View>
  );
}
