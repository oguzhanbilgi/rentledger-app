// @ts-check

/**
 * Renk tokenları — tek kaynak.
 * Hem `tailwind.config.js` (className) hem `src/constants/theme.ts` (ikon, StatusBar,
 * placeholder gibi JS tarafında renk gereken yerler) buradan okur.
 * JSX içinde ham hex renk YAZMAYIN; ya tailwind sınıfı ya `useThemeColors()` kullanın.
 */
const palette = {
  light: {
    canvas: '#F8FAFC',
    surface: '#FFFFFF',
    elevated: '#F1F5F9',
    line: '#E2E8F0',
    ink: '#0F172A',
    muted: '#64748B',
    faint: '#94A3B8',
  },
  dark: {
    canvas: '#070B14',
    surface: '#0E1526',
    elevated: '#162038',
    line: '#1E293B',
    ink: '#FFFFFF',
    muted: '#94A3B8',
    faint: '#64748B',
  },
  brand: {
    primary: '#3B82F6',
    primaryPressed: '#2563EB',
    accent: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    onBrand: '#FFFFFF',
  },
};

module.exports = { palette };
