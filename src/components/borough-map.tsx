import Svg, { Circle, G, Path } from 'react-native-svg';

import { BOROUGHS, BOROUGH_VIEWBOX, projectToBoroughMap } from '@/lib/boroughs';
import { colors } from '@/theme';

type Props = {
  /** Borough names you have checked in at. */
  visited: ReadonlySet<string>;
  /** Boroughs a friend has been to and you have not. Optional second layer. */
  friends?: ReadonlySet<string>;
  width: number;
  /** Line colour between boroughs. */
  stroke?: string;
  empty?: string;
  /** Pubs to mark with a dot, bigger the more visits. */
  pubs?: readonly { lat: number; lng: number; visits: number }[];
  dot?: string;
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
  stroke = colors.canvas,
  empty = colors.raised,
  pubs,
  dot = colors.butter,
}: Props) {
  return (
    <Svg width={width} height={width * ASPECT} viewBox={BOROUGH_VIEWBOX}>
      <G stroke={stroke} strokeWidth={4} strokeLinejoin="round">
        {BOROUGHS.map((b) => (
          <Path
            key={b.name}
            d={b.d}
            fill={visited.has(b.name) ? colors.butter : friends?.has(b.name) ? colors.matesTint : empty}
          />
        ))}
      </G>
      {pubs?.map((pub, i) => {
        const [x, y] = projectToBoroughMap(pub.lng, pub.lat);
        const r = 6 + Math.min(3, Math.log2(Math.max(1, pub.visits))) * 2;
        return <Circle key={i} cx={x} cy={y} r={r} fill={dot} stroke={stroke} strokeWidth={3} />;
      })}
    </Svg>
  );
}

export const BOROUGH_TOTAL = BOROUGHS.length;

export function BoroughSnapshot({
  borough,
  lat,
  lng,
  width,
  height = width * 0.62,
  fill = colors.raised,
  dot = colors.you,
}: {
  borough: string | null | undefined;
  lat: number;
  lng: number;
  width: number;
  height?: number;
  fill?: string;
  dot?: string;
}) {
  const shape = borough ? BOROUGHS.find((b) => b.name === borough) : undefined;
  const [px, py] = projectToBoroughMap(lng, lat);

  // Fit the borough's box into the frame with a margin, keeping aspect.
  const [minX, minY, maxX, maxY] = shape ? shape.bbox : [0, 0, 1000, 771];
  const pad = shape ? Math.max(maxX - minX, maxY - minY) * 0.14 : 0;
  const bx = minX - pad;
  const by = minY - pad;
  const bw = maxX - minX + pad * 2;
  const bh = maxY - minY + pad * 2;
  const scale = Math.min(width / bw, height / bh);
  const vw = width / scale;
  const vh = height / scale;
  const vx = bx - (vw - bw) / 2;
  const vy = by - (vh - bh) / 2;
  const r = Math.max(6, 9 / scale);

  return (
    <Svg width={width} height={height} viewBox={`${vx} ${vy} ${vw} ${vh}`}>
      {shape ? (
        <Path d={shape.d} fill={fill} stroke={colors.line} strokeWidth={2 / scale} strokeLinejoin="round" />
      ) : (
        <G>
          {BOROUGHS.map((b) => (
            <Path key={b.name} d={b.d} fill={fill} stroke={colors.line} strokeWidth={2} />
          ))}
        </G>
      )}
      <Circle cx={px} cy={py} r={r * 1.9} fill={dot} opacity={0.25} />
      <Circle cx={px} cy={py} r={r} fill={dot} stroke={colors.canvas} strokeWidth={r * 0.45} />
    </Svg>
  );
}
