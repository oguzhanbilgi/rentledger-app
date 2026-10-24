import { factory } from '@/config';
import { shareTextFile } from '@/services/files';
import { getLanguage, t } from '@/services/i18n';
import { toLocalDateKey } from '@/utils/date';

/**
 * CSV dışa aktarma (her zaman ücretsiz; kota düşmez, paywall'a konmaz).
 *
 * Excel uyumu: UTF-8 BOM (Türkçe karakterler) ve dile göre ayraç. Türkçe Excel
 * ondalık virgül kullandığı için `tr` dilinde ayraç `;`, ondalık `,` olur.
 * Formül enjeksiyonuna karşı `= + - @` ile başlayan metinlerin başına `'` eklenir.
 */

export type CsvValue = string | number | null | undefined;

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => CsvValue;
}

export function buildCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const turkish = getLanguage() === 'tr';
  const delimiter = turkish ? ';' : ',';

  const cell = (value: CsvValue): string => {
    if (value === null || value === undefined) return '';
    let text: string;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return '';
      text = turkish ? String(value).replace('.', ',') : String(value);
    } else {
      text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    }
    return text.includes(delimiter) || /["\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const lines = [
    columns.map((column) => cell(column.header)).join(delimiter),
    ...rows.map((row) => columns.map((column) => cell(column.value(row))).join(delimiter)),
  ];
  return `﻿${lines.join('\r\n')}\r\n`;
}

/** `name` dosya adına girer: `<slug>-<name>-<tarih>.csv`. */
export function shareCsv(name: string, csv: string): Promise<'shared' | 'unavailable'> {
  return shareTextFile({
    fileName: `${factory.app.slug}-${name}-${toLocalDateKey()}.csv`,
    content: csv,
    mimeType: 'text/csv',
    uti: 'public.comma-separated-values-text',
    dialogTitle: t('csvExport'),
  });
}
