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
        rule: 'var(--color-rule)',
        ink: 'var(--color-ink)',
        'ink-soft': 'var(--color-ink-soft)',
        ale: 'var(--color-ale)',
        'ale-dark': 'var(--color-ale-dark)',
        'ale-tint': 'var(--color-ale-tint)',
        stout: 'var(--color-stout)',
        'stout-soft': 'var(--color-stout-soft)',
        gold: 'var(--color-gold)',
        'gold-tint': 'var(--color-gold-tint)',
        mate: 'var(--color-mate)',
        'mate-tint': 'var(--color-mate-tint)',
        slate: 'var(--color-slate)',
        danger: 'var(--color-danger)',
      },
      fontFamily: {
        display: ['BricolageGrotesque_800ExtraBold'],
        'display-medium': ['BricolageGrotesque_600SemiBold'],
      },
      borderRadius: { sm: '6px', md: '10px', lg: '14px' },
    },
  },
  plugins: [],
};
