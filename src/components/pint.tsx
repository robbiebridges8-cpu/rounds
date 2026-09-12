import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

export const BEER = '#F5B520';

const GLASS = 'M2 1.5 L12 1.5 L11 18.5 Q11 19.5 10 19.5 L4 19.5 Q3 19.5 3 18.5 Z';

/**
 * The pint glass: the map pin, the apostrophe in the wordmark, the mark of
 * the whole thing. Beer is one fixed gold on every theme, because beer is.
 */
export function PintGlass({ width, level = 1, rim = colors.ink, beer = BEER, strokeWidth = 1.3 }: { width: number; level?: number; rim?: string; beer?: string; strokeWidth?: number }) {
  const height = width / 0.7;
  const top = 1.5;
  const bottom = 19.5;
  const y = bottom - (bottom - top - 0.5) * Math.max(0, Math.min(1, level));
  const id = `pint-${Math.round(width)}-${Math.round(level * 100)}`;
  return (
    <Svg width={width} height={height} viewBox="0 0 14 20">
      <Defs>
        <ClipPath id={id}>
          <Path d={GLASS} />
        </ClipPath>
      </Defs>
      {level > 0 ? <Rect x={0} y={y} width={14} height={bottom - y + 1} fill={beer} clipPath={`url(#${id})`} /> : null}
      {level > 0 ? <Rect x={0} y={y - 0.2} width={14} height={level < 1 ? 1.6 : 3.5} fill="#FFFFFF" clipPath={`url(#${id})`} /> : null}
      {level > 0.4 ? <Rect x={4.2} y={7} width={1.3} height={9} rx={0.65} fill="rgba(255,255,255,0.45)" /> : null}
      <Path d={GLASS} fill="none" stroke={rim} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}
