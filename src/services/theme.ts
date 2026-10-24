import { useSyncExternalStore } from 'react';
import { colorScheme } from 'nativewind';

import { getPref, setPref } from '@/services/database';

/**
 * Üç yollu görünüm seçimi: Koyu | Aydınlık | Sistem.
 * Seçim kalıcıdır ve NativeWind `dark:` sınıflarını yönetir.
 */
export type ThemePreference = 'dark' | 'light' | 'system';

const THEME_PREF = 'app_theme';
const DEFAULT_THEME: ThemePreference = 'system';

type Listener = () => void;
const listeners = new Set<Listener>();
let currentPreference: ThemePreference = DEFAULT_THEME;

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'dark' || value === 'light' || value === 'system';
}

/**
 * `initDatabase()` sonrasında, ilk ekran çizilmeden önce çağrılır. "Verileri sıfırla"
 * sonrasında da çağrılır; seçim değiştiyse seçici yeniden çizilir.
 */
export function initTheme(): ThemePreference {
  const saved = getPref(THEME_PREF);
  currentPreference = isThemePreference(saved) ? saved : DEFAULT_THEME;
  colorScheme.set(currentPreference);
  listeners.forEach((listener) => listener());
  return currentPreference;
}

export function getThemePreference(): ThemePreference {
  return currentPreference;
}

export async function setThemePreference(preference: ThemePreference): Promise<void> {
  currentPreference = preference;
  colorScheme.set(preference);
  listeners.forEach((listener) => listener());
  await setPref(THEME_PREF, preference);
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getThemePreference, getThemePreference);
}
