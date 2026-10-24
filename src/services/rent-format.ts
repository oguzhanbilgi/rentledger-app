import type { TranslationKey } from '@/i18n/en';
import { formatDate, getLanguage, t, type AppLanguage } from '@/services/i18n';
import type { PaymentMethod, PaymentRecord, PropertyType } from '@/services/rentledger-types';
import { toLocalDateKey } from '@/utils/date';

/**
 * Kira dönemi (`YYYY-MM`), ödeme tarihi ve etiket yardımcıları.
 * "Ödendi / tahsil edildi" kararı her zaman `periodKey` ile verilir — kaydın
 * oluşturulduğu tarih (createdAt) ile değil.
 */

const PERIOD_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_KEYS: TranslationKey[] = [
  'month1', 'month2', 'month3', 'month4', 'month5', 'month6',
  'month7', 'month8', 'month9', 'month10', 'month11', 'month12',
];

export function toPeriodKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function isPeriodKey(value: unknown): value is string {
  return typeof value === 'string' && PERIOD_RE.test(value);
}

export function shiftPeriod(key: string, delta: number): string {
  const match = PERIOD_RE.exec(key);
  if (!match) return toPeriodKey();
  return toPeriodKey(new Date(Number(match[1]), Number(match[2]) - 1 + delta, 1));
}

/** `2026-10` → "October 2026" / "Ekim 2026". */
export function formatPeriod(key: string, language: AppLanguage = getLanguage()): string {
  const match = PERIOD_RE.exec(key);
  if (!match) return key;
  return `${t(MONTH_KEYS[Number(match[2]) - 1], undefined, language)} ${match[1]}`;
}

/** Ödemenin dönem etiketi: yeni kayıtlarda dile göre, eski kayıtlarda saklanan metin. */
export function displayPeriod(
  payment: Pick<PaymentRecord, 'periodKey' | 'periodMonthYear'>,
  language: AppLanguage = getLanguage()
): string {
  return isPeriodKey(payment.periodKey) ? formatPeriod(payment.periodKey, language) : payment.periodMonthYear;
}

// ----------------------------- Eski dönem metinleri -----------------------------

const FOLD_MAP: Record<string, string> = { ş: 's', ı: 'i', ğ: 'g', ü: 'u', ö: 'o', ç: 'c' };

function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/̇/g, '')
    .replace(/[şığüöç]/g, (ch) => FOLD_MAP[ch] ?? ch);
}

const MONTH_NAMES: string[][] = [
  ['ocak', 'january'],
  ['subat', 'february'],
  ['mart', 'march'],
  ['nisan', 'april'],
  ['mayis', 'may'],
  ['haziran', 'june'],
  ['temmuz', 'july'],
  ['agustos', 'august'],
  ['eylul', 'september'],
  ['ekim', 'october'],
  ['kasim', 'november'],
  ['aralik', 'december'],
];

function monthFromToken(token: string): number | null {
  if (token.length < 3) return null;
  for (let i = 0; i < MONTH_NAMES.length; i += 1) {
    if (MONTH_NAMES[i].some((name) => name === token || name.startsWith(token))) return i + 1;
  }
  return null;
}

/**
 * Eski sürümde serbest metin olarak girilen dönemi (`Ekim 2026`, `October 2026`,
 * `10/2026`, `2026-10`) `YYYY-MM` anahtarına çevirir; anlaşılamazsa null.
 */
export function parseLegacyPeriodLabel(label: string): string | null {
  const text = fold(label.trim());
  const numeric = /(\d{1,2})\s*[./-]\s*(\d{4})/.exec(text) ?? null;
  if (numeric) {
    const month = Number(numeric[1]);
    if (month >= 1 && month <= 12) return `${numeric[2]}-${String(month).padStart(2, '0')}`;
  }
  const isoLike = /(\d{4})\s*[./-]\s*(\d{1,2})(?!\d)/.exec(text);
  if (isoLike) {
    const month = Number(isoLike[2]);
    if (month >= 1 && month <= 12) return `${isoLike[1]}-${String(month).padStart(2, '0')}`;
  }
  const year = /(?:^|\D)((?:19|20)\d{2})(?:\D|$)/.exec(text)?.[1];
  if (!year) return null;
  const tokens = text.split(/[^a-z]+/).filter(Boolean);
  for (const token of tokens) {
    const month = monthFromToken(token);
    if (month) return `${year}-${String(month).padStart(2, '0')}`;
  }
  return null;
}

// ----------------------------- Ödeme tarihi -----------------------------

export function todayDateKey(): string {
  return toLocalDateKey();
}

export function dateKeyToDate(key: string): Date | null {
  const match = DATE_KEY_RE.exec(key);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function shiftDateKey(key: string, days: number): string {
  const date = dateKeyToDate(key) ?? new Date();
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
}

/** Yeni kayıtlar (`YYYY-MM-DD`) dile göre biçimlenir; eski serbest metin aynen gösterilir. */
export function displayPaymentDate(value: string, language: AppLanguage = getLanguage()): string {
  const date = dateKeyToDate(value);
  return date ? formatDate(date, language) : value;
}

// ----------------------------- Etiketler -----------------------------

const METHOD_KEYS: Record<PaymentMethod, TranslationKey> = {
  bank_transfer: 'methodBankTransfer',
  cash: 'methodCash',
  credit_card: 'methodCreditCard',
};

export const PAYMENT_METHODS: PaymentMethod[] = ['bank_transfer', 'cash', 'credit_card'];

export function paymentMethodLabel(method: string, language: AppLanguage = getLanguage()): string {
  const key = METHOD_KEYS[method as PaymentMethod] ?? 'methodBankTransfer';
  return t(key, undefined, language);
}

const PROPERTY_TYPE_KEYS: Record<PropertyType, TranslationKey> = {
  apartment: 'typeApartment',
  house: 'typeHouse',
  shop: 'typeShop',
  office: 'typeOffice',
  storage: 'typeStorage',
};

export const PROPERTY_TYPES: PropertyType[] = ['apartment', 'house', 'shop', 'office', 'storage'];

export function propertyTypeLabel(type: string, language: AppLanguage = getLanguage()): string {
  const key = PROPERTY_TYPE_KEYS[type as PropertyType] ?? 'typeApartment';
  return t(key, undefined, language);
}

/** Kullanıcı girişini sayıya çevirir (`1.250,50`, `1250.5`, `1 250`). Geçersizse NaN. */
export function parseAmountInput(raw: string): number {
  const cleaned = raw.replace(/\s/g, '');
  if (!cleaned) return Number.NaN;
  let normalized = cleaned;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    // Hangisi sonda ise o ondalık ayracıdır.
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '');
  } else if (lastComma > -1) {
    // Yalnız virgül: `25,000` / `1,250,000` binlik; `25,5` ondalık.
    normalized = /^\d{1,3}(,\d{3})+$/.test(cleaned) ? cleaned.replace(/,/g, '') : cleaned.replace(',', '.');
  } else if (lastDot > -1 && /^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    // Yalnız nokta ve 3'lü gruplar: Türkçe binlik ayracı (`25.000`, `1.250.000`).
    normalized = cleaned.replace(/\./g, '');
  }
  if (!/^\d+(\.\d+)?$/.test(normalized)) return Number.NaN;
  return Math.round(Number(normalized) * 100) / 100;
}
