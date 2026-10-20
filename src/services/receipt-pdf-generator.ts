import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { LandlordProfile, PaymentRecord, PropertyRecord, TenantRecord } from './database';
import { AppLanguage, formatMoney } from './i18n';

export interface GenerateReceiptPdfOptions {
  payment: PaymentRecord;
  tenant?: TenantRecord;
  property?: PropertyRecord;
  landlord: LandlordProfile;
  lang?: AppLanguage;
  isPro?: boolean;
  themeColor?: 'emerald' | 'indigo' | 'slate';
}

function numberToTurkishWords(num: number): string {
  if (!num || num === 0) return 'Sıfır';
  const birler = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
  const onlar = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
  const basamaklar = ['', 'Bin', 'Milyon', 'Milyar'];

  const intPart = Math.floor(num);
  if (intPart === 0) return 'Sıfır';

  let str = '';
  let temp = intPart;
  let groupIndex = 0;

  while (temp > 0) {
    const chunk = temp % 1000;
    if (chunk > 0) {
      let chunkStr = '';
      const b = chunk % 10;
      const o = Math.floor((chunk % 100) / 10);
      const y = Math.floor(chunk / 100);

      if (y > 1) chunkStr += birler[y] + ' Yüz ';
      else if (y === 1) chunkStr += 'Yüz ';

      if (o > 0) chunkStr += onlar[o] + ' ';
      if (b > 0) {
        if (!(groupIndex === 1 && chunk === 1 && y === 0 && o === 0)) {
          chunkStr += birler[b] + ' ';
        }
      }

      chunkStr += basamaklar[groupIndex] + ' ';
      str = chunkStr + str;
    }
    temp = Math.floor(temp / 1000);
    groupIndex++;
  }

  return str.trim();
}

export function buildReceiptHtml(options: GenerateReceiptPdfOptions): string {
  const { payment, tenant, property, landlord, lang = 'tr', isPro = false, themeColor = 'emerald' } = options;

  const colorPalettes = {
    emerald: {
      primary: '#059669',
      primaryDark: '#047857',
      primaryLight: '#ecfdf5',
      accent: '#10b981',
      border: '#a7f3d0',
    },
    indigo: {
      primary: '#4f46e5',
      primaryDark: '#4338ca',
      primaryLight: '#eef2ff',
      accent: '#6366f1',
      border: '#c7d2fe',
    },
    slate: {
      primary: '#1e293b',
      primaryDark: '#0f172a',
      primaryLight: '#f8fafc',
      accent: '#475569',
      border: '#cbd5e1',
    },
  };

  const theme = colorPalettes[themeColor] || colorPalettes.emerald;
  const isTr = lang === 'tr';

  const amountFormatted = formatMoney(payment.amount, payment.currency);
  const wordsTr = numberToTurkishWords(payment.amount);
  const wordsFormatted = isTr ? `Yalnızca ${wordsTr} Türk Lirasıdır.` : `Net payment amount of ${amountFormatted}.`;

  const methodLabel =
    payment.paymentMethod === 'bank_transfer'
      ? isTr ? 'Banka Havalesi / EFT' : 'Bank Transfer'
      : payment.paymentMethod === 'cash'
        ? isTr ? 'Nakit Tahsilat' : 'Cash'
        : isTr ? 'Kredi Kartı' : 'Credit Card';

  const landlordTitle = landlord.companyTitle?.trim() || landlord.fullName?.trim() || (isTr ? 'Ev Sahibi / Mülk Yönetimi' : 'Landlord / Property Management');
  const propertyAddress = property?.address || payment.propertyName;

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>Kira Makbuzu - ${payment.receiptNo}</title>
  <style>
    @page { size: A4 portrait; margin: 18mm 16mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
      line-height: 1.5;
    }
    .receipt-container {
      border: 2px solid ${theme.primary};
      border-radius: 16px;
      padding: 24px;
      position: relative;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid ${theme.border};
      padding-bottom: 18px;
      margin-bottom: 20px;
    }
    .app-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${theme.primary};
      background: ${theme.primaryLight};
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 6px;
    }
    .title {
      font-size: 24px;
      font-weight: 900;
      color: ${theme.primaryDark};
      letter-spacing: -0.5px;
    }
    .receipt-meta {
      text-align: right;
    }
    .receipt-no {
      font-size: 18px;
      font-weight: 900;
      color: ${theme.primary};
      font-family: monospace;
    }
    .receipt-date {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
    }
    .parties-grid {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }
    .party-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
    }
    .party-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: ${theme.primary};
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    .party-name {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .party-sub {
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    .details-table th {
      background: ${theme.primary};
      color: #ffffff;
      font-size: 12px;
      font-weight: 800;
      text-align: left;
      padding: 12px 16px;
      text-transform: uppercase;
    }
    .details-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    .details-table tr:last-child td {
      border-bottom: none;
    }
    .amount-highlight-box {
      background: ${theme.primaryLight};
      border: 1.5px dashed ${theme.accent};
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .amount-label {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      color: ${theme.primaryDark};
      margin-bottom: 2px;
    }
    .amount-words {
      font-size: 13px;
      font-style: italic;
      color: #334155;
      font-weight: 600;
    }
    .amount-val {
      font-size: 26px;
      font-weight: 900;
      color: ${theme.primaryDark};
      letter-spacing: -0.5px;
    }
    .signatures-grid {
      display: flex;
      gap: 24px;
      margin-top: 30px;
      padding-top: 15px;
    }
    .sign-box {
      flex: 1;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      background: #fafafa;
      min-height: 125px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .sign-title {
      font-size: 12px;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 6px;
    }
    .sign-name {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }
    .sign-sub {
      font-size: 11px;
      color: #94a3b8;
    }
    .footer-watermark {
      margin-top: 24px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
    }
    .legal-notice {
      font-size: 10px;
      color: #64748b;
      margin-top: 16px;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 8px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div class="app-badge">RentLedger Pro • Resmi Belge</div>
          <div class="title">${isTr ? 'KİRA TAHSİLAT MAKBUZU' : 'RENT PAYMENT RECEIPT'}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            ${isTr ? 'Taşınmaz Kira Bedeli Ödeme Onay Belgesi' : 'Official Proof of Rent Payment'}
          </div>
        </td>
        <td class="receipt-meta" style="vertical-align: top;">
          <div class="receipt-no">${payment.receiptNo}</div>
          <div class="receipt-date">${isTr ? 'Tahsilat Tarihi:' : 'Date:'} <strong>${payment.paymentDate}</strong></div>
          <div class="receipt-date">${isTr ? 'Ödeme Türü:' : 'Method:'} <strong>${methodLabel}</strong></div>
        </td>
      </tr>
    </table>

    <div class="parties-grid">
      <div class="party-card">
        <div class="party-title">${isTr ? 'KİRALAYAN (MÜLK SAHİBİ / YÖNETİM)' : 'LESSOR (LANDLORD / MANAGER)'}</div>
        <div class="party-name">${landlordTitle}</div>
        ${landlord.phone ? `<div class="party-sub">Tel: ${landlord.phone}</div>` : ''}
        ${landlord.iban ? `<div class="party-sub">Banka / IBAN: ${landlord.bankName ? landlord.bankName + ' - ' : ''}${landlord.iban}</div>` : ''}
        ${landlord.address ? `<div class="party-sub">Adres: ${landlord.address}</div>` : ''}
      </div>

      <div class="party-card">
        <div class="party-title">${isTr ? 'KİRACI (ÖDEMEYİ YAPAN)' : 'TENANT (PAYER)'}</div>
        <div class="party-name">${payment.tenantName}</div>
        ${tenant?.phone ? `<div class="party-sub">Tel: ${tenant.phone}</div>` : ''}
        ${tenant?.tcOrId ? `<div class="party-sub">TC / Kimlik No: ${tenant.tcOrId}</div>` : ''}
        <div class="party-sub">Kiralanan Taşınmaz: <strong>${propertyAddress}</strong></div>
      </div>
    </div>

    <table class="details-table">
      <thead>
        <tr>
          <th>${isTr ? 'ÖDEME AÇIKLAMASI & DÖNEMİ' : 'PAYMENT DETAILS & PERIOD'}</th>
          <th style="text-align: right; width: 140px;">${isTr ? 'TUTAR' : 'AMOUNT'}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${payment.propertyName}</strong> — ${payment.periodMonthYear} ${isTr ? 'Dönemi Kira Bedeli' : 'Rent Period'}
            ${payment.notes ? `<br/><span style="color: #64748b; font-size: 12px;">Not: ${payment.notes}</span>` : ''}
          </td>
          <td style="text-align: right; font-weight: 700; font-size: 15px;">
            ${amountFormatted}
          </td>
        </tr>
      </tbody>
    </table>

    <div class="amount-highlight-box">
      <div>
        <div class="amount-label">${isTr ? 'TAHSİL EDİLEN NET TUTAR (YAZIYLA)' : 'COLLECTED AMOUNT IN WORDS'}</div>
        <div class="amount-words">${wordsFormatted}</div>
      </div>
      <div class="amount-val">
        ${amountFormatted}
      </div>
    </div>

    <div class="legal-notice">
      ${isTr
        ? 'İşbu makbuz, yukarıda belirtilen kiralanan taşınmaza ait ilgili dönem kira bedelinin eksiksiz olarak tahsil edildiğini tevsik eder. Banka dekontu veya tarafların imzasıyla birlikte yasal tahsilat kanıtı hükmündedir.'
        : 'This official document certifies that the rent for the designated property and period has been received in full. It serves as legal confirmation of payment when signed or accompanied by bank transfer slip.'}
    </div>

    <div class="signatures-grid">
      <div class="sign-box">
        <div class="sign-title">${isTr ? 'ÖDEMEYİ YAPAN (KİRACI)' : 'PAYER (TENANT)'}</div>
        <div>
          <div class="sign-name">${payment.tenantName}</div>
          <div class="sign-sub">${isTr ? 'İmza:' : 'Signature:'}</div>
        </div>
      </div>

      <div class="sign-box">
        <div class="sign-title">${isTr ? 'TAHSİL EDEN (EV SAHİBİ / YÖNETİCİ)' : 'RECEIVER (LANDLORD / MANAGER)'}</div>
        <div>
          <div class="sign-name">${landlordTitle}</div>
          <div class="sign-sub">${isTr ? 'Kaşe & İmza:' : 'Stamp & Signature:'}</div>
        </div>
      </div>
    </div>

    <div class="footer-watermark">
      ${!isPro
        ? 'RentLedger Pro — Dijital Kira & Mülk Takip Uygulaması ile oluşturuldu.'
        : `Resmi Tahsilat Makbuzu • Belge Doğrulama Kodu: RLP-${payment.id.slice(0, 8).toUpperCase()}`}
    </div>
  </div>
</body>
</html>
  `;
}

export async function generateAndShareReceiptPdf(
  options: GenerateReceiptPdfOptions
): Promise<string> {
  const html = buildReceiptHtml(options);

  if (Platform.OS === 'web') {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
    return '';
  }

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `${options.payment.receiptNo} - Kira Makbuzu`,
    });
  }

  return uri;
}
