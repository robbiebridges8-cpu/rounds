// The look: Signal. A white ground, then colour doing the talking: cobalt for
// you, coral for your mates, butter and mint for the rest of the furniture,
// ink for anything you press. Chunky pills, rounded cards, one geometric
// display face. Dark mode is the same idea with the lights off.
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
  ink: string;
  inkSoft: string;
  /** The accent: stars, active states. Coral. */
  ale: string;
  aleDark: string;
  aleTint: string;
  /** The contrast surface: the week card, banners. Cobalt. */
  stout: string;
  stoutSoft: string;
  /** Map legend: you. Cobalt. */
  you: string;
  youTint: string;
  /** Map legend: a mate has been. Coral. */
  mates: string;
  matesTint: string;
  /** Map legend: nobody you know. */
  slate: string;
  butter: string;
  mint: string;
  danger: string;
};

export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    canvas: '#F6F5F1',
    surface: '#FFFFFF',
    raised: '#ECEBE5',
    line: '#E3E1DA',
    ink: '#101014',
    inkSoft: '#6E6E78',
    ale: '#FF5A3C',
    aleDark: '#E24A2E',
    aleTint: '#FFE4DD',
    stout: '#2244FF',
    stoutSoft: '#C9D1FF',
    you: '#2244FF',
    youTint: '#DCE2FF',
    mates: '#FF5A3C',
    matesTint: '#FFE4DD',
    slate: '#C4C3BC',
    butter: '#FFD23F',
    mint: '#A6F0C6',
    danger: '#E0361F',
  },
  dark: {
    canvas: '#0F0F13',
    surface: '#19191F',
    raised: '#24242C',
    line: '#2E2E38',
    ink: '#F6F5F1',
    inkSoft: '#A0A0AC',
    ale: '#FF6E54',
    aleDark: '#FF5A3C',
    aleTint: '#3A1F19',
    stout: '#2F52FF',
    stoutSoft: '#C9D1FF',
    you: '#5C74FF',
    youTint: '#1E2650',
    mates: '#FF6E54',
    matesTint: '#3A1F19',
    slate: '#4E4E5A',
    butter: '#FFD84D',
    mint: '#8FE6B4',
    danger: '#FF5A3C',
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
    '--color-ink': p.ink,
    '--color-ink-soft': p.inkSoft,
    '--color-ale': p.ale,
    '--color-ale-dark': p.aleDark,
    '--color-ale-tint': p.aleTint,
    '--color-stout': p.stout,
    '--color-stout-soft': p.stoutSoft,
    '--color-you': p.you,
    '--color-you-tint': p.youTint,
    '--color-mates': p.mates,
    '--color-mates-tint': p.matesTint,
    '--color-slate': p.slate,
    '--color-butter': p.butter,
    '--color-mint': p.mint,
    '--color-danger': p.danger,
  };
}

/**
 * Unbounded for display: a wide geometric with real presence at heavy
 * weights, the face on the Signal direction. UI text is the system font.
 */
export const fonts = {
  display: 'Unbounded_800ExtraBold',
  displayMedium: 'Unbounded_600SemiBold',
} as const;

export const radii = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
