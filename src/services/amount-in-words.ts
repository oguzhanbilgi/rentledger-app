import type { AppLanguage } from '@/services/i18n';

/**
 * Tutarı yazıya çevirir (makbuzdaki "Yazıyla" satırı). Türkçe ve İngilizce,
 * TRY / USD / EUR / GBP için doğru para birimi adı ve kuruş/cent kısmı ile.
 *   1250.5 TRY (tr) → "Bin iki yüz elli Türk lirası elli kuruş"
 *   1250.5 USD (en) → "One thousand two hundred fifty US dollars and fifty cents"
 */

interface CurrencyNames {
  major: [singular: string, plural: string];
  minor: [singular: string, plural: string];
}

const CURRENCY_NAMES: Record<AppLanguage, Record<string, CurrencyNames>> = {
  tr: {
    TRY: { major: ['Türk lirası', 'Türk lirası'], minor: ['kuruş', 'kuruş'] },
    USD: { major: ['ABD doları', 'ABD doları'], minor: ['sent', 'sent'] },
    EUR: { major: ['avro', 'avro'], minor: ['sent', 'sent'] },
    GBP: { major: ['İngiliz sterlini', 'İngiliz sterlini'], minor: ['peni', 'peni'] },
  },
  en: {
    TRY: { major: ['Turkish lira', 'Turkish lira'], minor: ['kuruş', 'kuruş'] },
    USD: { major: ['US dollar', 'US dollars'], minor: ['cent', 'cents'] },
    EUR: { major: ['euro', 'euros'], minor: ['cent', 'cents'] },
    GBP: { major: ['pound sterling', 'pounds sterling'], minor: ['penny', 'pence'] },
  },
};

// ----------------------------- Türkçe -----------------------------

const TR_ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TR_TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
const TR_SCALES = ['', 'bin', 'milyon', 'milyar', 'trilyon'];

function trBelowThousand(n: number): string[] {
  const words: string[] = [];
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;
  if (hundreds > 1) words.push(TR_ONES[hundreds]);
  if (hundreds > 0) words.push('yüz');
  if (tens > 0) words.push(TR_TENS[tens]);
  if (ones > 0) words.push(TR_ONES[ones]);
  return words;
}

function trInteger(n: number): string {
  if (n === 0) return 'sıfır';
  const groups: string[] = [];
  let rest = n;
  let scale = 0;
  while (rest > 0 && scale < TR_SCALES.length) {
    const chunk = rest % 1000;
    if (chunk > 0) {
      // "bir bin" denmez: 1000 → "bin", ama 1.000.000 → "bir milyon".
      const words = scale === 1 && chunk === 1 ? [] : trBelowThousand(chunk);
      if (TR_SCALES[scale]) words.push(TR_SCALES[scale]);
      groups.unshift(words.join(' '));
    }
    rest = Math.floor(rest / 1000);
    scale += 1;
  }
  return groups.join(' ');
}

// ----------------------------- English -----------------------------

const EN_ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const EN_SCALES = ['', 'thousand', 'million', 'billion', 'trillion'];

function enBelowThousand(n: number): string[] {
  const words: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds > 0) words.push(EN_ONES[hundreds], 'hundred');
  if (rest >= 20) {
    const ones = rest % 10;
    words.push(ones > 0 ? `${EN_TENS[Math.floor(rest / 10)]}-${EN_ONES[ones]}` : EN_TENS[Math.floor(rest / 10)]);
  } else if (rest > 0) {
    words.push(EN_ONES[rest]);
  }
  return words;
}

function enInteger(n: number): string {
  if (n === 0) return 'zero';
  const groups: string[] = [];
  let rest = n;
  let scale = 0;
  while (rest > 0 && scale < EN_SCALES.length) {
    const chunk = rest % 1000;
    if (chunk > 0) {
      const words = enBelowThousand(chunk);
      if (EN_SCALES[scale]) words.push(EN_SCALES[scale]);
      groups.unshift(words.join(' '));
    }
    rest = Math.floor(rest / 1000);
    scale += 1;
  }
  return groups.join(' ');
}

// ----------------------------- Genel -----------------------------

function capitalize(text: string, language: AppLanguage): string {
  if (!text) return text;
  const first = text.charAt(0);
  const upper = language === 'tr' && first === 'i' ? 'İ' : first.toUpperCase();
  return upper + text.slice(1);
}

export function amountInWords(amount: number, currency: string, language: AppLanguage): string {
  const totalCents = Math.round(Math.abs(Number.isFinite(amount) ? amount : 0) * 100);
  const major = Math.floor(totalCents / 100);
  const minor = totalCents % 100;
  const toWords = language === 'tr' ? trInteger : enInteger;
  const names = CURRENCY_NAMES[language][currency];

  const majorWords = toWords(major);
  if (!names) {
    const base = `${majorWords} ${currency}`;
    return capitalize(minor > 0 ? `${base} ${String(minor).padStart(2, '0')}/100` : base, language);
  }

  const majorName = major === 1 ? names.major[0] : names.major[1];
  let text = `${majorWords} ${majorName}`;
  if (minor > 0) {
    const minorName = minor === 1 ? names.minor[0] : names.minor[1];
    text += language === 'tr' ? ` ${toWords(minor)} ${minorName}` : ` and ${toWords(minor)} ${minorName}`;
  }
  return capitalize(text, language);
}
