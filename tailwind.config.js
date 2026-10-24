const { palette } = require('./src/constants/tokens.js');

/**
 * Semantik renk sınıfları her zaman açık/koyu çift olarak kullanılır:
 *   bg-canvas dark:bg-canvas-dark
 *   bg-surface dark:bg-surface-dark
 *   border-line dark:border-line-dark
 *   text-ink dark:text-ink-dark
 *   text-muted dark:text-muted-dark
 * Marka renkleri tek tondur: bg-primary, text-accent, bg-danger ...
 */
const pair = (name) => ({
  DEFAULT: palette.light[name],
  dark: palette.dark[name],
});

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: pair('canvas'),
        surface: pair('surface'),
        elevated: pair('elevated'),
        line: pair('line'),
        ink: pair('ink'),
        muted: pair('muted'),
        faint: pair('faint'),
        primary: {
          DEFAULT: palette.brand.primary,
          pressed: palette.brand.primaryPressed,
        },
        accent: palette.brand.accent,
        warning: palette.brand.warning,
        danger: palette.brand.danger,
        'on-brand': palette.brand.onBrand,
      },
    },
  },
  plugins: [],
};
