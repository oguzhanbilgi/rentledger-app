import { buildCsv } from '@/services/csv';
import { t } from '@/services/i18n';
import { paymentMethodLabel } from '@/services/rent-format';
import { getPayments, getTenants } from '@/services/rentledger-data';
import type { PaymentRecord, TenantRecord } from '@/services/rentledger-types';

/**
 * Ayarlar → Veriler: ödemeler ve kiracılar CSV'si. Her zaman ücretsizdir
 * (kota düşmez); tarihler makine okunur `YYYY-MM-DD` / `YYYY-MM` biçimindedir.
 */

const PAYMENT_STATUS = {
  paid: 'csvStatusPaid',
  partial: 'csvStatusPartial',
  pending: 'csvStatusPending',
} as const;

const headers = (key: 'csvPaymentHeaders' | 'csvTenantHeaders') => t(key).split('|');

export async function buildPaymentsCsv(): Promise<{ name: string; csv: string } | null> {
  const payments = await getPayments();
  if (payments.length === 0) return null;
  const h = headers('csvPaymentHeaders');
  const csv = buildCsv<PaymentRecord>(
    [
      { header: h[0] ?? '', value: (p) => p.receiptNo },
      { header: h[1] ?? '', value: (p) => p.paymentDate },
      { header: h[2] ?? '', value: (p) => p.periodKey || p.periodMonthYear },
      { header: h[3] ?? '', value: (p) => p.tenantName },
      { header: h[4] ?? '', value: (p) => p.propertyName },
      { header: h[5] ?? '', value: (p) => p.amount },
      { header: h[6] ?? '', value: (p) => p.currency },
      { header: h[7] ?? '', value: (p) => paymentMethodLabel(p.paymentMethod) },
      { header: h[8] ?? '', value: (p) => t(PAYMENT_STATUS[p.status] ?? 'csvStatusPaid') },
      { header: h[9] ?? '', value: (p) => p.notes },
    ],
    payments
  );
  return { name: 'payments', csv };
}

export async function buildTenantsCsv(): Promise<{ name: string; csv: string } | null> {
  const tenants = await getTenants();
  if (tenants.length === 0) return null;
  const h = headers('csvTenantHeaders');
  const csv = buildCsv<TenantRecord>(
    [
      { header: h[0] ?? '', value: (r) => r.name },
      { header: h[1] ?? '', value: (r) => r.phone },
      { header: h[2] ?? '', value: (r) => r.email },
      { header: h[3] ?? '', value: (r) => r.tcOrId },
      { header: h[4] ?? '', value: (r) => r.propertyName },
      { header: h[5] ?? '', value: (r) => r.rentAmount },
      { header: h[6] ?? '', value: (r) => r.depositAmount },
      { header: h[7] ?? '', value: (r) => r.currency },
      { header: h[8] ?? '', value: (r) => r.paymentDueDay },
      { header: h[9] ?? '', value: (r) => r.leaseStartDate },
      { header: h[10] ?? '', value: (r) => r.leaseEndDate },
      { header: h[11] ?? '', value: (r) => t(r.status === 'past' ? 'csvTenantPast' : 'csvTenantActive') },
      { header: h[12] ?? '', value: (r) => r.notes },
    ],
    tenants
  );
  return { name: 'tenants', csv };
}
