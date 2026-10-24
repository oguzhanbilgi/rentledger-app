import { useColorScheme } from 'nativewind';

import tokens from './tokens.js';

export const palette = tokens.palette;

export type ThemeColors = typeof palette.dark & typeof palette.brand;

/**
 * JS tarafında renk gereken yerler için (lucide ikonları, StatusBar,
 * TextInput placeholder, Switch track). Görünüm sınıfları için tailwind kullanın.
 */
export function useThemeColors(): ThemeColors & { isDark: boolean } {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  return { ...(isDark ? palette.dark : palette.light), ...palette.brand, isDark };
}
