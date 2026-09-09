import { Text, View } from 'react-native';

import { colors, fonts, scoreColor } from '@/theme';

/**
 * A score out of ten in a coloured pill. Beli's idea: one glance says
 * whether it was good. Green is 8 and up, gold 6 to 8, amber 4 to 6, red
 * below that. `size` scales the whole thing.
 */
export function ScorePill({
  score,
  size = 'md',
  rank,
}: {
  score: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  /** Optional "#3" prefix. */
  rank?: number;
}) {
  const dims = { sm: [24, 12, 8], md: [30, 15, 10], lg: [44, 24, 14] }[size];
  const [height, font, padding] = dims;

  if (score == null) {
    return (
      <View
        className="items-center justify-center rounded-full border border-line"
        style={{ height, paddingHorizontal: padding, minWidth: height }}>
        <Text style={{ color: colors.inkSoft, fontSize: font * 0.85, fontWeight: '600' }}>–</Text>
      </View>
    );
  }

  const n = Number(score);
  return (
    <View
      className="flex-row items-center justify-center rounded-full"
      style={{ height, paddingHorizontal: padding, minWidth: height, backgroundColor: scoreColor(n) }}>
      {rank != null ? (
        <Text style={{ color: colors.canvas, fontSize: font * 0.8, fontWeight: '700', opacity: 0.75, marginRight: 4 }}>
          #{rank}
        </Text>
      ) : null}
      <Text
        allowFontScaling={false}
        style={{
          color: colors.canvas,
          fontSize: font,
          lineHeight: font * 1.15,
          fontFamily: fonts.displayBlack,
          fontVariant: ['tabular-nums'],
        }}>
        {n.toFixed(1)}
      </Text>
    </View>
  );
}
