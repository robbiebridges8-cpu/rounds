// One place for colour, type and radius. Tailwind config mirrors these, so
// use className for layout and reach for this object only where a component
// needs a raw value (map pins, status bar, native props, SVG).
//
// Dark first. Pubs happen at night, and the map, the photos and the gold
// boroughs all read better on stout than on paper.

export const colors = {
  // surfaces
  canvas: '#130F0C',
  surface: '#1E1712',
  raised: '#2A2019',
  line: '#352A21',

  // text
  ink: '#F3EADB',
  inkSoft: '#A99A88',

  // brand: a proper amber, brighter on dark
  ale: '#E8842E',
  aleDark: '#C96A1C',
  aleTint: '#3B2617',

  // the accent surface (week card, banners): warm and loud, used once
  stout: '#E8842E',
  stoutSoft: '#F3EADB',

  // map legend
  gold: '#F2B92E', // you have been here
  mate: '#4FB58C', // a friend has been, you have not
  mateTint: '#22463A', // same, on the borough map
  slate: '#6B5F55', // nobody you know has been

  // score pills, Beli style: green good, amber middling, red poor
  scoreHigh: '#4FB58C',
  scoreMid: '#F2B92E',
  scoreLow: '#E8842E',
  scoreBad: '#E0533F',

  danger: '#E0533F',
} as const;

/**
 * Fraunces for display: headings, big numbers, the wordmark. It has the
 * warmth of a pub sign without the cliché. Everything else is the system
 * font, which is what the Human Interface Guidelines want for UI text.
 */
export const fonts = {
  display: 'Fraunces_700Bold',
  displayBlack: 'Fraunces_900Black',
  displayItalic: 'Fraunces_600SemiBold_Italic',
} as const;

export const radii = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/** 0 to 10, colour coded. */
export function scoreColor(score: number): string {
  if (score >= 8) return colors.scoreHigh;
  if (score >= 6) return colors.scoreMid;
  if (score >= 4) return colors.scoreLow;
  return colors.scoreBad;
}
