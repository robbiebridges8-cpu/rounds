import Svg, { G, Path } from 'react-native-svg';

import { BOROUGHS, BOROUGH_VIEWBOX } from '@/lib/boroughs';
import { colors } from '@/theme';

type Props = {
  /** Borough names you have checked in at. */
  visited: ReadonlySet<string>;
  /** Boroughs a friend has been to and you have not. Optional second layer. */
  friends?: ReadonlySet<string>;
  width: number;
  /** Line colour between boroughs. Cream on the app, white on the share card. */
  stroke?: string;
  empty?: string;
};

const ASPECT = 771 / 1000;

/**
 * The fill-in map of London. 33 boroughs, gold where you have been. This is
 * the thing people screenshot, so it has to look good at every size.
 */
export function BoroughMap({
  visited,
  friends,
  width,
  stroke = colors.cream,
  empty = colors.line,
}: Props) {
  return (
    <Svg width={width} height={width * ASPECT} viewBox={BOROUGH_VIEWBOX}>
      <G stroke={stroke} strokeWidth={4} strokeLinejoin="round">
        {BOROUGHS.map((b) => (
          <Path
            key={b.name}
            d={b.d}
            fill={visited.has(b.name) ? colors.gold : friends?.has(b.name) ? colors.mateTint : empty}
          />
        ))}
      </G>
    </Svg>
  );
}

export const BOROUGH_TOTAL = BOROUGHS.length;
