// One place for colour, type and radius. Tailwind config mirrors these, so
// use className for layout and reach for this object only where a component
// needs a raw value (map pins, status bar, native props, SVG).

export const colors = {
  // paper
  cream: '#F5EDDF',
  card: '#FFFFFF',
  line: '#E4D7C5',

  // ink
  ink: '#1B1410',
  inkSoft: '#77675A',

  // brand: bitter, a proper amber
  ale: '#B0521A',
  aleDark: '#8A3F12',
  aleTint: '#F5E3D0',

  // the dark surface for moments of contrast
  stout: '#1E1712',
  stoutSoft: '#C8BBAD',

  // map legend
  gold: '#D9A21B', // you have been here
  mate: '#2B7A5C', // a friend has been, you have not
  mateTint: '#C9E1D6', // same, on the borough map
  slate: '#A99D91', // nobody you know has been

  danger: '#B23A28',
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
