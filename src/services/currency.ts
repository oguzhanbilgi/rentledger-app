import { useSyncExternalStore } from 'react';

import { factory } from '@/config';
import { getPref, setPref } from '@/services/database';
import { getLanguage, subscribeLanguage } from '@/services/i18n';

/**
 * Kiracı başına para birimi. Değerler ISO 4217 kodudur; biçimlendirme her zaman
 * `formatMoney(amount, code)` ile yapılır. Eski sürümün sembol tercihleri
 * (₺ $ € £) veritabanı göçünde koda çevrilir.
 */

export const SUPPORTED_CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

const SYMBOLS: Record<CurrencyCode, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const DEFAULT_CURRENCY_PREF = 'app_currency';

type Listener = () => void;
const listeners = new Set<Listener>();

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Seçim düğmeleri için kısa etiket (ör. `₺ TRY`). */
export function currencyOptionLabel(code: CurrencyCode): string {
  return `${SYMBOLS[code]} ${code}`;
}

/**
 * Yeni kiracı formunun varsayılan para birimi: kullanıcının seçtiği değer, yoksa
 * Türkçe kullanımda TRY, aksi halde factory.config.js → app.defaultCurrency.
 * (Bileşenler render sırasında `useDefaultCurrency()` kullanır.)
 */
export function getDefaultCurrency(): CurrencyCode {
  const saved = getPref(DEFAULT_CURRENCY_PREF);
  if (isCurrencyCode(saved)) return saved;
  if (getLanguage() === 'tr') return 'TRY';
  return isCurrencyCode(factory.app.defaultCurrency) ? factory.app.defaultCurrency : 'USD';
}

export async function setDefaultCurrency(code: CurrencyCode): Promise<void> {
  await setPref(DEFAULT_CURRENCY_PREF, code);
  notifyDefaultCurrency();
}

/** Tercih dışarıdan değiştiğinde (ör. "verileri sıfırla") dinleyicileri bilgilendirir. */
export function notifyDefaultCurrency(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const unsubscribeLanguage = subscribeLanguage(listener);
  return () => {
    listeners.delete(listener);
    unsubscribeLanguage();
  };
}

export function useDefaultCurrency(): CurrencyCode {
  return useSyncExternalStore(subscribe, getDefaultCurrency, getDefaultCurrency);
}
