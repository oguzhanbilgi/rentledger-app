import { Linking, Share } from 'react-native';

/**
 * WhatsApp bağlantıları `https://wa.me/<numara>?text=…` ile açılır: Android'de
 * `<queries>` bildirimi gerektirmez, WhatsApp kurulu değilse tarayıcıya düşer.
 */

/**
 * Telefon numarasını wa.me biçimine (yalnız rakam, ülke kodu ile) çevirir.
 *   "+90 532 123 45 67" → "905321234567"
 *   "0532 123 45 67"    → "905321234567"  (Türkiye ulusal biçimi)
 *   "0044 20 7946 0000" → "442079460000"
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (trimmed.startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `90${digits.slice(1)}`;
  return digits;
}

export function whatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

/** WhatsApp'ı hazır mesajla açar; açılamazsa sistem paylaşım penceresine düşer. */
export async function openWhatsApp(phone: string, message: string): Promise<void> {
  try {
    await Linking.openURL(whatsAppUrl(phone, message));
  } catch {
    await Share.share({ message }).catch(() => undefined);
  }
}
