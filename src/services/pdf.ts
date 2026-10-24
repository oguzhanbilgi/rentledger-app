import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { factory, getPlayStoreUrl } from '@/config';
import { localeTag, type AppLanguage } from '@/services/i18n';

/**
 * PDF çıktı altyapısı (expo-print → expo-sharing).
 * Kullanıcı girdisi HTML'e her zaman `escapeHtml` ile girer.
 */

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Çok satırlı metni güvenle `<br>` ile böler. */
export function escapeMultiline(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

export interface PdfDocumentOptions {
  title: string;
  bodyHtml: string;
  language: AppLanguage;
  /** Ücretsiz kullanıcıda belge altına mağaza bağlantısı eklenir (viral dağıtım). */
  showInstallFooter: boolean;
}

const FOOTER_TEXT: Record<AppLanguage, string> = {
  en: 'Created with {app} — free on Google Play',
  tr: '{app} ile oluşturuldu — Google Play\'de ücretsiz',
};

const BASE_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, 'Segoe UI', Arial, sans-serif; color: #0F172A; font-size: 11pt; line-height: 1.45; margin: 0; }
  h1 { font-size: 20pt; margin: 0 0 4mm; letter-spacing: -0.01em; }
  h2 { font-size: 12pt; margin: 6mm 0 2mm; color: #334155; text-transform: uppercase; letter-spacing: 0.04em; }
  table { width: 100%; border-collapse: collapse; margin-top: 2mm; }
  th, td { text-align: left; padding: 2.2mm 2mm; border-bottom: 0.3mm solid #E2E8F0; vertical-align: top; }
  th { font-size: 9pt; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; }
  .muted { color: #64748B; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .signatures { display: flex; gap: 10mm; margin-top: 14mm; }
  .signature { flex: 1; border-top: 0.3mm solid #94A3B8; padding-top: 2mm; font-size: 9pt; color: #475569; }
  .footer { margin-top: 12mm; padding-top: 3mm; border-top: 0.3mm solid #E2E8F0; font-size: 8.5pt; color: #64748B; text-align: center; }
  .footer a { color: #2563EB; text-decoration: none; }
`;

export function buildPdfHtml(options: PdfDocumentOptions): string {
  const footer = options.showInstallFooter
    ? `<div class="footer"><a href="${escapeHtml(getPlayStoreUrl())}">${escapeHtml(
        FOOTER_TEXT[options.language].replace('{app}', factory.app.name)
      )}</a></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${localeTag(options.language)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(options.title)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
${options.bodyHtml}
${footer}
</body>
</html>`;
}

export interface ExportResult {
  uri: string;
  shared: boolean;
}

/** HTML'i A4 PDF'e çevirir ve paylaşım penceresini açar. */
export async function exportPdf(html: string, dialogTitle: string): Promise<ExportResult> {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return { uri: '', shared: true };
  }
  // A4: 595 x 842 pt
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  if (!(await Sharing.isAvailableAsync())) {
    return { uri, shared: false };
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle,
  });
  return { uri, shared: true };
}
