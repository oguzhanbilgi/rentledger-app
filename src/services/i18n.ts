import { useSyncExternalStore } from 'react';

import { factory, type AppLanguage } from '@/config';
import { en, type TranslationKey } from '@/i18n/en';
import { tr } from '@/i18n/tr';
import { getPref, setPref } from '@/services/database';

/**
 * Çift dil (EN/TR) — %100 tek dil kuralı:
 * İlk açılışta cihaz dili okunur; Türkçe cihazda her şey Türkçe, diğerlerinde İngilizce.
 * Kullanıcı Ayarlar'dan değiştirebilir; seçim kalıcıdır.
 */

export type { AppLanguage } from '@/config';
export type { TranslationKey } from '@/i18n/en';

export const SUPPORTED_LANGUAGES: { code: AppLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
];

const dictionaries: Record<AppLanguage, Record<TranslationKey, string>> = { en, tr };
const LANGUAGE_PREF = 'app_language';

type Listener = () => void;
const listeners = new Set<Listener>();
let currentLanguage: AppLanguage = factory.app.fallbackLanguage;

export function detectDeviceLanguage(): AppLanguage {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    if (locale.startsWith('tr')) return 'tr';
    if (locale.startsWith('en')) return 'en';
  } catch {
    // Intl yoksa yedek dile düş
  }
  return factory.app.fallbackLanguage;
}

/**
 * `initDatabase()` sonrasında, ilk ekran çizilmeden önce çağrılır. "Verileri sıfırla"
 * sonrasında da çağrılır; dil değiştiyse açık ekranlar yeniden çizilir.
 */
export function initI18n(): AppLanguage {
  const saved = getPref(LANGUAGE_PREF);
  const next: AppLanguage = saved === 'en' || saved === 'tr' ? saved : detectDeviceLanguage();
  if (next !== currentLanguage) {
    currentLanguage = next;
    listeners.forEach((listener) => listener());
  }
  return currentLanguage;
}

export function getLanguage(): AppLanguage {
  return currentLanguage;
}

export async function setLanguage(language: AppLanguage): Promise<void> {
  if (language === currentLanguage) return;
  currentLanguage = language;
  listeners.forEach((listener) => listener());
  await setPref(LANGUAGE_PREF, language);
}

export function subscribeLanguage(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type TranslationParams = Record<string, string | number>;

export function t(
  key: TranslationKey,
  params?: TranslationParams,
  language: AppLanguage = currentLanguage
): string {
  const template = dictionaries[language][key] ?? en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
}

/** Dil değişince yeniden çizilen bileşenler için. */
export function useI18n() {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
  return {
    language,
    t: (key: TranslationKey, params?: TranslationParams) => t(key, params, language),
    setLanguage,
  };
}

/** Uygulama adı / stüdyo gibi config değerlerini otomatik ekleyen yardımcı. */
export function brandParams(extra?: TranslationParams): TranslationParams {
  return {
    app: factory.app.name,
    studio: factory.studio.name,
    email: factory.studio.supportEmail,
    ...extra,
  };
}

export function localeTag(language: AppLanguage = currentLanguage): string {
  return language === 'tr' ? 'tr-TR' : 'en-US';
}

/** Para birimi ISO kodu ile biçimlendirme (ör. `TRY` → ₺1.250,00). Sembol saklamayın, kod saklayın. */
export function formatMoney(
  amount: number,
  currencyCode: string = factory.app.defaultCurrency,
  language: AppLanguage = currentLanguage
): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(localeTag(language), {
      style: 'currency',
      currency: currencyCode,
    }).format(safe);
  } catch {
    return `${safe.toFixed(2)} ${currencyCode}`;
  }
}

export function formatDate(
  value: Date | string,
  language: AppLanguage = currentLanguage
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString(localeTag(language), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
