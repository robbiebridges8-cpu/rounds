// The look: London signage. Chalk-white paper, navy ink rather than black,
// one red for the one action that matters, and the Underground line colours
// doing the talking on the map: Circle yellow for you, District green for
// your mates, Jubilee grey for everywhere else. Dark mode is the same idea
// after closing time: navy, not black.
//
// `colors` is the live palette. The ThemeProvider swaps its values when the
// scheme changes and remounts the tree, so plain `colors.x` reads in native
// props and SVG stay correct. Class names use the same tokens through CSS
// variables, see tailwind.config.js.

export type Palette = {
  canvas: string;
  surface: string;
  raised: string;
  line: string;
  rule: string;
  ink: string;
  inkSoft: string;
  ale: string;
  aleDark: string;
  aleTint: string;
  stout: string;
  stoutSoft: string;
  gold: string;
  goldTint: string;
  mate: string;
  mateTint: string;
  slate: string;
  danger: string;
};

export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    canvas: '#F5F3EC', // chalk
    surface: '#FFFFFF',
    raised: '#EBE8DF',
    line: '#D9D5CA',
    rule: '#10214A', // the thick navy rule under a station name
    ink: '#10214A', // navy, never black
    inkSoft: '#5B6478',
    ale: '#DC241F', // Central line red: the action colour
    aleDark: '#B71B17',
    aleTint: '#FBE4E3',
    stout: '#10214A', // the contrast surface is navy, not dark brown
    stoutSoft: '#C7CEE0',
    gold: '#FFD300', // Circle line yellow: you have been here
    goldTint: '#FFF4B8',
    mate: '#00843D', // District line green: a mate has been
    mateTint: '#CFE9D8',
    slate: '#A0A5A9', // Jubilee line grey: nobody you know has been
    danger: '#B71B17',
  },
  dark: {
    canvas: '#0B1020',
    surface: '#141B33',
    raised: '#1E2747',
    line: '#2B3559',
    rule: '#F5F3EC',
    ink: '#F5F3EC',
    inkSoft: '#A9B0C6',
    ale: '#F0362F',
    aleDark: '#DC241F',
    aleTint: '#3B1618',
    stout: '#2140C8',
    stoutSoft: '#C7CEE0',
    gold: '#FFD300',
    goldTint: '#4A3F00',
    mate: '#2FB86A',
    mateTint: '#173A27',
    slate: '#6E7590',
    danger: '#F0362F',
  },
};

/** Live palette. Mutated by ThemeProvider; see applyPalette. */
export const colors: Palette = { ...palettes.light };

export function applyPalette(scheme: 'light' | 'dark') {
  Object.assign(colors, palettes[scheme]);
}

/** The same palette as CSS variables, for NativeWind's vars(). */
export function paletteVars(p: Palette): Record<string, string> {
  return {
    '--color-canvas': p.canvas,
    '--color-surface': p.surface,
    '--color-raised': p.raised,
    '--color-line': p.line,
    '--color-rule': p.rule,
    '--color-ink': p.ink,
    '--color-ink-soft': p.inkSoft,
    '--color-ale': p.ale,
    '--color-ale-dark': p.aleDark,
    '--color-ale-tint': p.aleTint,
    '--color-stout': p.stout,
    '--color-stout-soft': p.stoutSoft,
    '--color-gold': p.gold,
    '--color-gold-tint': p.goldTint,
    '--color-mate': p.mate,
    '--color-mate-tint': p.mateTint,
    '--color-slate': p.slate,
    '--color-danger': p.danger,
  };
}

/**
 * Bricolage Grotesque for display: an editorial grotesque with real character
 * in the heavy weights, and not the default anyone reaches for. UI text is
 * the system font, as the Human Interface Guidelines want.
 */
export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayMedium: 'BricolageGrotesque_600SemiBold',
} as const;

export const radii = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
