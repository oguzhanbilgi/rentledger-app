import { amountInWords } from '@/services/amount-in-words';
import { formatMoney, t, type AppLanguage } from '@/services/i18n';
import { buildPdfHtml, escapeHtml, escapeMultiline, exportPdf, type ExportResult } from '@/services/pdf';
import { displayPaymentDate, displayPeriod, paymentMethodLabel } from '@/services/rent-format';
import type {
  LandlordProfile,
  PaymentRecord,
  PropertyRecord,
  TenantRecord,
} from '@/services/rentledger-types';

/**
 * A4 kira makbuzu. Tüm kullanıcı girdileri `escapeHtml` / `escapeMultiline` ile girer.
 * "Resmî belge" / doğrulama kodu gibi iddialar yoktur; makbuz numarası kalıcı sıradan gelir.
 * Ücretsiz kullanıcıda altta mağaza bağlantısı (buildPdfHtml) bulunur, Pro'da bulunmaz.
 */

export interface ReceiptOptions {
  payment: PaymentRecord;
  tenant?: TenantRecord;
  property?: PropertyRecord;
  landlord: LandlordProfile;
  language: AppLanguage;
  isPro: boolean;
}

const RECEIPT_CSS = `
  .rl-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm;
    border-bottom: 0.6mm solid #059669; padding-bottom: 4mm; margin-bottom: 6mm; }
  .rl-title { font-size: 22pt; font-weight: 800; margin: 0; }
  .rl-sub { color: #64748B; font-size: 10pt; margin-top: 1mm; }
  .rl-meta { text-align: right; font-size: 10pt; color: #334155; }
  .rl-no { font-family: 'Roboto Mono', Menlo, monospace; font-size: 13pt; font-weight: 700; color: #047857; margin-bottom: 1.5mm; }
  .rl-parties { display: flex; gap: 6mm; margin-bottom: 6mm; }
  .rl-party { flex: 1; border: 0.3mm solid #E2E8F0; border-radius: 3mm; padding: 4mm; }
  .rl-label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; font-weight: 700; margin-bottom: 1.5mm; }
  .rl-name { font-size: 12pt; font-weight: 700; margin-bottom: 1mm; }
  .rl-line { font-size: 9.5pt; color: #334155; margin-top: 0.6mm; }
  .rl-note { font-size: 9.5pt; color: #64748B; margin-top: 1mm; }
  .rl-total { display: flex; justify-content: space-between; align-items: center; gap: 6mm;
    background: #ECFDF5; border: 0.3mm solid #A7F3D0; border-radius: 3mm; padding: 4mm 5mm; margin-top: 5mm; }
  .rl-total-amount { font-size: 18pt; font-weight: 800; color: #047857; white-space: nowrap; }
  .rl-words { font-size: 10pt; font-style: italic; color: #334155; }
  .rl-disclaimer { margin-top: 8mm; font-size: 8.5pt; color: #64748B; }
`;

function line(label: string, value: string | undefined | null): string {
  const text = (value ?? '').trim();
  return text ? `<div class="rl-line">${escapeHtml(label)}: ${escapeHtml(text)}</div>` : '';
}

export function buildReceiptHtml({ payment, tenant, property, landlord, language, isPro }: ReceiptOptions): string {
  const tr = (key: Parameters<typeof t>[0], params?: Parameters<typeof t>[1]) => t(key, params, language);

  const company = landlord.companyTitle.trim();
  const person = landlord.fullName.trim();
  const landlordName = company || person || tr('landlordFallback');
  const amount = formatMoney(payment.amount, payment.currency, language);
  const period = displayPeriod(payment, language);
  const bank = [landlord.bankName.trim(), landlord.iban.trim()].filter(Boolean).join(' · ');
  const propertyAddress = property?.address?.trim() || payment.propertyName;

  const bodyHtml = `
<style>${RECEIPT_CSS}</style>
<div class="rl-head">
  <div>
    <h1 class="rl-title">${escapeHtml(tr('pdfTitle'))}</h1>
    <div class="rl-sub">${escapeHtml(landlordName)}</div>
  </div>
  <div class="rl-meta">
    <div class="rl-label">${escapeHtml(tr('pdfReceiptNo'))}</div>
    <div class="rl-no">${escapeHtml(payment.receiptNo)}</div>
    <div>${escapeHtml(tr('fieldPaymentDate'))}: <strong>${escapeHtml(displayPaymentDate(payment.paymentDate, language))}</strong></div>
    <div>${escapeHtml(tr('fieldPaymentMethod'))}: <strong>${escapeHtml(paymentMethodLabel(payment.paymentMethod, language))}</strong></div>
  </div>
</div>

<div class="rl-parties">
  <div class="rl-party">
    <div class="rl-label">${escapeHtml(tr('pdfLandlord'))}</div>
    <div class="rl-name">${escapeHtml(landlordName)}</div>
    ${company && person ? `<div class="rl-line">${escapeHtml(person)}</div>` : ''}
    ${line(tr('fieldPhone'), landlord.phone)}
    ${line(tr('fieldEmail'), landlord.email)}
    ${line(tr('fieldAddress'), landlord.address)}
    ${line(tr('pdfBank'), bank)}
  </div>
  <div class="rl-party">
    <div class="rl-label">${escapeHtml(tr('pdfTenant'))}</div>
    <div class="rl-name">${escapeHtml(payment.tenantName)}</div>
    ${line(tr('fieldPhone'), tenant?.phone)}
    ${line(tr('pdfIdNo'), tenant?.tcOrId)}
    ${line(tr('pdfProperty'), propertyAddress)}
  </div>
</div>

<table>
  <thead>
    <tr><th>${escapeHtml(tr('pdfDescription'))}</th><th class="num">${escapeHtml(tr('pdfAmount'))}</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <strong>${escapeHtml(payment.propertyName)}</strong><br />
        ${escapeHtml(tr('pdfRentFor', { period }))}
        ${payment.notes?.trim() ? `<div class="rl-note">${escapeHtml(tr('pdfNote'))}: ${escapeMultiline(payment.notes.trim())}</div>` : ''}
      </td>
      <td class="num"><strong>${escapeHtml(amount)}</strong></td>
    </tr>
  </tbody>
</table>

<div class="rl-total">
  <div>
    <div class="rl-label">${escapeHtml(tr('pdfAmountInWords'))}</div>
    <div class="rl-words">${escapeHtml(amountInWords(payment.amount, payment.currency, language))}</div>
  </div>
  <div class="rl-total-amount">${escapeHtml(amount)}</div>
</div>

<div class="signatures">
  <div class="signature">${escapeHtml(tr('pdfSignatureTenant'))}<br />${escapeHtml(payment.tenantName)}</div>
  <div class="signature">${escapeHtml(tr('pdfSignatureLandlord'))}<br />${escapeHtml(landlordName)}</div>
</div>

<p class="rl-disclaimer">${escapeHtml(tr('pdfDisclaimer'))}</p>`;

  return buildPdfHtml({
    title: `${tr('pdfTitle')} ${payment.receiptNo}`,
    bodyHtml,
    language,
    showInstallFooter: !isPro,
  });
}

/** Makbuzu A4 PDF olarak üretir ve paylaşım penceresini açar. */
export async function exportReceiptPdf(options: ReceiptOptions): Promise<ExportResult> {
  const html = buildReceiptHtml(options);
  return exportPdf(html, t('receiptDialogTitle', { number: options.payment.receiptNo }, options.language));
}
