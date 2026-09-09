/** @type {import('tailwindcss').Config} */
// Every colour is a CSS variable set by ThemeProvider (see src/theme.ts), so
// the same class names work in light and dark. Do not use opacity modifiers
// (bg-ink/50) on these: variables and modifiers do not mix in NativeWind.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        raised: 'var(--color-raised)',
        line: 'var(--color-line)',
        ink: 'var(--color-ink)',
        'ink-soft': 'var(--color-ink-soft)',
        ale: 'var(--color-ale)',
        'ale-dark': 'var(--color-ale-dark)',
        'ale-tint': 'var(--color-ale-tint)',
        stout: 'var(--color-stout)',
        'stout-soft': 'var(--color-stout-soft)',
        you: 'var(--color-you)',
        'you-tint': 'var(--color-you-tint)',
        mates: 'var(--color-mates)',
        'mates-tint': 'var(--color-mates-tint)',
        slate: 'var(--color-slate)',
        butter: 'var(--color-butter)',
        mint: 'var(--color-mint)',
        danger: 'var(--color-danger)',
      },
      fontFamily: {
        display: ['Unbounded_800ExtraBold'],
        'display-medium': ['Unbounded_600SemiBold'],
      },
      borderRadius: { sm: '10px', md: '16px', lg: '22px' },
    },
  },
  plugins: [],
};
