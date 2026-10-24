import { factory, getPlayStoreUrl } from '@/config';
import { formatMoney, t, type AppLanguage } from '@/services/i18n';
import {
  displayPaymentDate,
  displayPeriod,
  formatPeriod,
  paymentMethodLabel,
  toPeriodKey,
} from '@/services/rent-format';
import type {
  LandlordProfile,
  PaymentRecord,
  PropertyRecord,
  TenantRecord,
} from '@/services/rentledger-types';
import { openWhatsApp } from '@/services/whatsapp';

/**
 * Vade uyarıları (uygulama içi "vadesi gelen / geciken" listesi) ve WhatsApp mesajları.
 * Bir kiracının bu ayki kirası, o döneme (`periodKey`) kaydedilmiş tahsilatların
 * toplamı kira bedelini karşılıyorsa ödenmiş sayılır.
 */

export type DueStatus = 'overdue' | 'due_today' | 'upcoming';

export interface RentDueAlert {
  tenant: TenantRecord;
  property?: PropertyRecord;
  periodKey: string;
  dueDay: number;
  /** < 0 gecikmiş, 0 bugün, > 0 kalan gün. */
  daysRemaining: number;
  status: DueStatus;
  /** Bu dönem için kalan tutar (kısmi ödeme düşülmüş). */
  amountDue: number;
}

const CENT = 0.005;

export function paidForPeriod(payments: PaymentRecord[], tenantId: string, periodKey: string): number {
  return payments
    .filter((p) => p.tenantId === tenantId && p.periodKey === periodKey && p.status !== 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
}

export function getRentDueAlerts(
  tenants: TenantRecord[],
  properties: PropertyRecord[],
  payments: PaymentRecord[],
  withinDays = 5,
  now: Date = new Date()
): RentDueAlert[] {
  const periodKey = toPeriodKey(now);
  const today = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const alerts: RentDueAlert[] = [];

  for (const tenant of tenants) {
    if (tenant.status !== 'active' || !(tenant.rentAmount > 0)) continue;
    const amountDue = tenant.rentAmount - paidForPeriod(payments, tenant.id, periodKey);
    if (amountDue <= CENT) continue;

    const dueDay = Math.min(Math.max(Math.trunc(tenant.paymentDueDay) || 1, 1), daysInMonth);
    const diff = dueDay - today;
    if (diff > withinDays) continue;

    alerts.push({
      tenant,
      property: properties.find((p) => p.id === tenant.propertyId),
      periodKey,
      dueDay,
      daysRemaining: diff,
      status: diff < 0 ? 'overdue' : diff === 0 ? 'due_today' : 'upcoming',
      amountDue,
    });
  }

  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function dueStatusLabel(alert: RentDueAlert, language?: AppLanguage): string {
  if (alert.status === 'overdue') return t('dueOverdue', { count: Math.abs(alert.daysRemaining) }, language);
  if (alert.status === 'due_today') return t('dueToday', undefined, language);
  return t('dueInDays', { count: alert.daysRemaining }, language);
}

// ----------------------------- Mesaj metinleri -----------------------------

export interface MessageOptions {
  language: AppLanguage;
  /** Ücretsiz kullanıcının mesajı mağaza bağlantısıyla biter; Pro'da bağlantı yok. */
  isPro: boolean;
}

function landlordSignature(landlord: LandlordProfile, language: AppLanguage): string {
  return landlord.fullName.trim() || landlord.companyTitle.trim() || t('waSignatureFallback', undefined, language);
}

function bankBlock(landlord: LandlordProfile, language: AppLanguage): string {
  const iban = landlord.iban.trim();
  if (!iban) return '';
  const lines = [t('waBankHeader', undefined, language)];
  const bank = landlord.bankName.trim();
  if (bank) lines.push(t('waBankName', { bank }, language));
  lines.push(t('waIban', { iban }, language));
  const beneficiary = landlord.companyTitle.trim() || landlord.fullName.trim();
  if (beneficiary) lines.push(t('waBeneficiary', { name: beneficiary }, language));
  return `\n\n${lines.join('\n')}`;
}

function withFooter(message: string, { language, isPro }: MessageOptions): string {
  if (isPro) return message;
  return `${message}\n\n${t('waFooter', { app: factory.app.name, url: getPlayStoreUrl() }, language)}`;
}

export function buildReminderMessage(
  alert: RentDueAlert,
  landlord: LandlordProfile,
  options: MessageOptions
): string {
  const { language } = options;
  const params = {
    tenant: alert.tenant.name,
    property: alert.property?.name || alert.tenant.propertyName || t('unknownProperty', undefined, language),
    period: formatPeriod(alert.periodKey, language),
    amount: formatMoney(alert.amountDue, alert.tenant.currency, language),
    days: Math.abs(alert.daysRemaining),
    bank: bankBlock(landlord, language),
    landlord: landlordSignature(landlord, language),
  };
  const key =
    alert.status === 'overdue'
      ? 'waReminderOverdue'
      : alert.status === 'due_today'
        ? 'waReminderToday'
        : 'waReminderUpcoming';
  return withFooter(t(key, params, language), options);
}

export function buildConfirmationMessage(
  payment: PaymentRecord,
  landlord: LandlordProfile,
  options: MessageOptions
): string {
  const { language } = options;
  const message = t(
    'waConfirmation',
    {
      tenant: payment.tenantName,
      property: payment.propertyName,
      period: displayPeriod(payment, language),
      amount: formatMoney(payment.amount, payment.currency, language),
      date: displayPaymentDate(payment.paymentDate, language),
      method: paymentMethodLabel(payment.paymentMethod, language).toLocaleLowerCase(
        language === 'tr' ? 'tr-TR' : 'en-US'
      ),
      receiptNo: payment.receiptNo,
      landlord: landlordSignature(landlord, language),
    },
    language
  );
  return withFooter(message, options);
}

// ----------------------------- Gönderim -----------------------------

export async function sendRentReminderWhatsApp(
  alert: RentDueAlert,
  landlord: LandlordProfile,
  options: MessageOptions
): Promise<void> {
  await openWhatsApp(alert.tenant.phone, buildReminderMessage(alert, landlord, options));
}

export async function sendPaymentConfirmationWhatsApp(
  payment: PaymentRecord,
  tenantPhone: string,
  landlord: LandlordProfile,
  options: MessageOptions
): Promise<void> {
  await openWhatsApp(tenantPhone, buildConfirmationMessage(payment, landlord, options));
}

export async function openTenantChat(tenant: TenantRecord, language: AppLanguage): Promise<void> {
  await openWhatsApp(tenant.phone, t('waChatHello', { tenant: tenant.name }, language));
}
