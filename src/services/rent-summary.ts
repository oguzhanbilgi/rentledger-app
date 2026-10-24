import { paidForPeriod } from '@/services/rent-reminders';
import type { PaymentRecord, TenantRecord } from '@/services/rentledger-types';

/**
 * Dönem özeti — farklı para birimleri ASLA toplanmaz; her para birimi ayrı satırdır.
 * "Tahsil edilen", ödemenin hangi döneme ait olduğuna (`periodKey`) göre hesaplanır.
 */
export interface CurrencyTotals {
  currency: string;
  expected: number;
  collected: number;
  outstanding: number;
}

export function summarizePeriod(
  tenants: TenantRecord[],
  payments: PaymentRecord[],
  periodKey: string
): CurrencyTotals[] {
  const totals = new Map<string, CurrencyTotals>();
  const row = (currency: string) => {
    let entry = totals.get(currency);
    if (!entry) {
      entry = { currency, expected: 0, collected: 0, outstanding: 0 };
      totals.set(currency, entry);
    }
    return entry;
  };

  for (const tenant of tenants) {
    if (tenant.status !== 'active') continue;
    const entry = row(tenant.currency);
    const rent = tenant.rentAmount || 0;
    entry.expected += rent;
    entry.outstanding += Math.max(0, rent - paidForPeriod(payments, tenant.id, periodKey));
  }

  for (const payment of payments) {
    if (payment.periodKey !== periodKey || payment.status === 'pending') continue;
    row(payment.currency).collected += payment.amount || 0;
  }

  return [...totals.values()].sort((a, b) => b.expected - a.expected || a.currency.localeCompare(b.currency));
}
