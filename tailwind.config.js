/** @type {import('tailwindcss').Config} */
// Mirrors src/theme.ts. Change both.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cream: '#F5EDDF',
        card: '#FFFFFF',
        line: '#E4D7C5',
        ink: '#1B1410',
        'ink-soft': '#77675A',
        ale: '#B0521A',
        'ale-dark': '#8A3F12',
        'ale-tint': '#F5E3D0',
        stout: '#1E1712',
        'stout-soft': '#C8BBAD',
        gold: '#D9A21B',
        mate: '#2B7A5C',
        'mate-tint': '#C9E1D6',
        slate: '#A99D91',
        danger: '#B23A28',
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
