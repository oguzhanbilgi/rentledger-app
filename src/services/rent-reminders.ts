import { Linking, Share } from 'react-native';
import { LandlordProfile, PaymentRecord, PropertyRecord, TenantRecord } from './database';
import { AppLanguage, formatMoney } from './i18n';

export interface RentDueAlert {
  tenant: TenantRecord;
  property?: PropertyRecord;
  dueDay: number;
  daysRemaining: number; // < 0 overdue, 0 today, > 0 upcoming
  status: 'overdue' | 'due_today' | 'upcoming';
  statusTextTr: string;
  statusTextEn: string;
}

export function getTodayFormatted(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function getCurrentPeriodMonthYear(lang: AppLanguage = 'tr'): string {
  const now = new Date();
  const monthsTr = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];
  const monthsEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthName = lang === 'tr' ? monthsTr[now.getMonth()] : monthsEn[now.getMonth()];
  return `${monthName} ${now.getFullYear()}`;
}

export function getRentDueAlerts(
  tenants: TenantRecord[],
  properties: PropertyRecord[],
  payments: PaymentRecord[],
  withinDays = 5
): RentDueAlert[] {
  const now = new Date();
  const currentDay = now.getDate();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  const alerts: RentDueAlert[] = [];

  for (const tenant of tenants) {
    if (tenant.status !== 'active') continue;

    const prop = properties.find((p) => p.id === tenant.propertyId);
    const dueDay = Math.min(tenant.paymentDueDay || 1, 28);

    // Check if tenant already paid for current month
    const hasPaidCurrentMonth = payments.some((p) => {
      if (p.tenantId !== tenant.id) return false;
      // Check if payment was made in this month or marked for this period
      const pDate = new Date(p.createdAt);
      return (
        p.status === 'paid' &&
        pDate.getFullYear() === currentYear &&
        pDate.getMonth() === currentMonth
      );
    });

    if (hasPaidCurrentMonth) continue;

    const diffDays = dueDay - currentDay;

    if (diffDays < 0) {
      // Overdue
      const daysAgo = Math.abs(diffDays);
      alerts.push({
        tenant,
        property: prop,
        dueDay,
        daysRemaining: diffDays,
        status: 'overdue',
        statusTextTr: `${daysAgo} gün gecikmede!`,
        statusTextEn: `${daysAgo} day(s) overdue!`,
      });
    } else if (diffDays === 0) {
      // Due Today
      alerts.push({
        tenant,
        property: prop,
        dueDay,
        daysRemaining: 0,
        status: 'due_today',
        statusTextTr: 'Bugün kira günü!',
        statusTextEn: 'Rent due today!',
      });
    } else if (diffDays <= withinDays) {
      // Upcoming
      alerts.push({
        tenant,
        property: prop,
        dueDay,
        daysRemaining: diffDays,
        status: 'upcoming',
        statusTextTr: `${diffDays} gün kaldı (Ayın ${dueDay}'i)`,
        statusTextEn: `${diffDays} day(s) left (Due on ${dueDay}th)`,
      });
    }
  }

  // Sort by priority: overdue first, then due today, then upcoming
  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export async function sendRentReminderWhatsApp(
  alert: RentDueAlert,
  landlord: LandlordProfile,
  lang: AppLanguage = 'tr'
): Promise<void> {
  const tenant = alert.tenant;
  const propName = alert.property?.name || 'Kiralık Mülk';
  const rentFormatted = formatMoney(tenant.rentAmount, tenant.currency);
  const period = getCurrentPeriodMonthYear(lang);
  const landlordName = landlord.fullName?.trim() || 'Ev Sahibi / Yönetim';

  let ibanBlock = '';
  if (landlord.iban?.trim()) {
    ibanBlock =
      lang === 'tr'
        ? `\n\n📌 *Ödeme Bilgileri:*\nBanka: *${landlord.bankName || 'Banka'}*\nIBAN: *${landlord.iban}*\nAlıcı: *${landlord.fullName || landlordName}*`
        : `\n\n📌 *Payment Details:*\nBank: *${landlord.bankName || 'Bank'}*\nIBAN: *${landlord.iban}*\nBeneficiary: *${landlord.fullName || landlordName}*`;
  }

  let message = '';
  if (lang === 'tr') {
    if (alert.status === 'overdue') {
      message = `Merhaba *${tenant.name}*,\n\n*${propName}* için *${period}* dönemi kira ödemenizin (*${rentFormatted}*) vadesi üzerinden ${Math.abs(alert.daysRemaining)} gün geçmiştir.\n\nMüsait olduğunuzda ödemenizi iletmenizi rica ederiz.${ibanBlock}\n\nİyi günler dileriz,\n*${landlordName}*`;
    } else if (alert.status === 'due_today') {
      message = `Merhaba *${tenant.name}*,\n\n*${propName}* için *${period}* dönemi kira ödeme gününüz (*${rentFormatted}*) bugündür.${ibanBlock}\n\nÖdemeniz sonrasında resmi dijital makbuzunuz iletilecektir. Teşekkürler,\n*${landlordName}*`;
    } else {
      message = `Merhaba *${tenant.name}*,\n\n*${propName}* için *${period}* dönemi kira ödemenizin (*${rentFormatted}*) vadesine ${alert.daysRemaining} gün kalmıştır.${ibanBlock}\n\nİyi günler dileriz,\n*${landlordName}*`;
    }
  } else {
    message = `Hello *${tenant.name}*,\n\nThis is a friendly reminder regarding your rent of *${rentFormatted}* for *${propName}* (${period}).${ibanBlock}\n\nThank you,\n*${landlordName}*`;
  }

  const cleanPhone = tenant.phone.replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(message);
  const whatsappUrl = cleanPhone
    ? `whatsapp://send?phone=${cleanPhone}&text=${encoded}`
    : `whatsapp://send?text=${encoded}`;

  try {
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
      return;
    }
  } catch {}

  await Share.share({ message });
}

export async function sendPaymentConfirmationWhatsApp(
  payment: PaymentRecord,
  landlord: LandlordProfile,
  lang: AppLanguage = 'tr'
): Promise<void> {
  const amountFormatted = formatMoney(payment.amount, payment.currency);
  const landlordName = landlord.fullName?.trim() || 'Ev Sahibi / Yönetim';
  const methodText =
    payment.paymentMethod === 'bank_transfer'
      ? lang === 'tr' ? 'Banka Havale/EFT' : 'Bank Transfer'
      : lang === 'tr' ? 'Nakit Tahsilat' : 'Cash';

  const message =
    lang === 'tr'
      ? `Sayın *${payment.tenantName}*,\n\n*${payment.propertyName}* taşınmazı için *${payment.periodMonthYear}* dönemi kira bedeli olan *${amountFormatted}* tutarındaki ödemeniz *${payment.paymentDate}* tarihinde (${methodText}) başarıyla tahsil edilmiştir.\n\nMakbuz No: *${payment.receiptNo}*\n\nTeşekkür eder, iyi günler dileriz.\n*${landlordName}*`
      : `Dear *${payment.tenantName}*,\n\nYour rent payment of *${amountFormatted}* for *${payment.propertyName}* (${payment.periodMonthYear}) has been received on *${payment.paymentDate}* via ${methodText}.\n\nReceipt No: *${payment.receiptNo}*\n\nThank you,\n*${landlordName}*`;

  const encoded = encodeURIComponent(message);
  const whatsappUrl = `whatsapp://send?text=${encoded}`;

  try {
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
      return;
    }
  } catch {}

  await Share.share({ message });
}
