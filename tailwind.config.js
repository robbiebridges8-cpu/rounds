/** @type {import('tailwindcss').Config} */
// Mirrors src/theme.ts. Change both.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: '#130F0C',
        surface: '#1E1712',
        raised: '#2A2019',
        line: '#352A21',
        ink: '#F3EADB',
        'ink-soft': '#A99A88',
        ale: '#E8842E',
        'ale-dark': '#C96A1C',
        'ale-tint': '#3B2617',
        stout: '#E8842E',
        'stout-soft': '#F3EADB',
        gold: '#F2B92E',
        mate: '#4FB58C',
        'mate-tint': '#22463A',
        slate: '#6B5F55',
        danger: '#E0533F',
      },
      fontFamily: {
        display: ['Fraunces_700Bold'],
        'display-black': ['Fraunces_900Black'],
        'display-italic': ['Fraunces_600SemiBold_Italic'],
      },
      borderRadius: { sm: '10px', md: '16px', lg: '24px' },
    },
  },
  plugins: [],
};
