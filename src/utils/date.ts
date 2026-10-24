/**
 * Yerel saat dilimine göre YYYY-MM-DD anahtarı.
 * `new Date().toISOString().slice(0, 10)` UTC verir; Türkiye'de 00:00–03:00 arası
 * yanlış güne düşer. Gün bazlı her hesapta bunu kullanın.
 */
export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
