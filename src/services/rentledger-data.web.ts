import { getPref, setPref } from '@/services/database';
import {
  EMPTY_LANDLORD_PROFILE,
  type LandlordProfile,
  type PaymentRecord,
  type PropertyRecord,
  type TenantRecord,
} from '@/services/rentledger-types';

/**
 * Web önizlemesi: SQLite yok, kayıtlar bellekte tutulur (sayfa yenilenince silinir).
 * Mağaza uygulaması native çalışır ve verileri SQLite'ta saklar; API native sürümle aynıdır.
 */

let properties: PropertyRecord[] = [];
let tenants: TenantRecord[] = [];
let payments: PaymentRecord[] = [];
let landlord: LandlordProfile = { ...EMPTY_LANDLORD_PROFILE };

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function getProperties(): Promise<PropertyRecord[]> {
  return [...properties];
}

export async function deleteProperty(propertyId: string): Promise<void> {
  properties = properties.filter((item) => item.id !== propertyId);
  tenants = tenants.filter((item) => item.propertyId !== propertyId);
}

export async function getTenants(): Promise<TenantRecord[]> {
  return tenants.map((tenant) => ({
    ...tenant,
    propertyName: properties.find((item) => item.id === tenant.propertyId)?.name ?? null,
  }));
}

export async function savePropertyWithTenant(property: PropertyRecord, tenant: TenantRecord): Promise<void> {
  properties = [property, ...properties.filter((item) => item.id !== property.id)];
  tenants = [tenant, ...tenants.filter((item) => item.id !== tenant.id)];
}

export async function getPayments(): Promise<PaymentRecord[]> {
  return [...payments];
}

export async function savePayment(payment: PaymentRecord): Promise<void> {
  payments = [payment, ...payments.filter((item) => item.id !== payment.id)];
}

export async function deletePayment(paymentId: string): Promise<void> {
  payments = payments.filter((item) => item.id !== paymentId);
}

export async function reserveNextReceiptNo(date: Date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const prefKey = `receipt_seq_${year}`;
  const next = (Number.parseInt(getPref(prefKey) ?? '0', 10) || 0) + 1;
  await setPref(prefKey, String(next));
  return `RL-${year}-${String(next).padStart(4, '0')}`;
}

export async function getLandlordProfile(): Promise<LandlordProfile> {
  return { ...landlord };
}

export async function saveLandlordProfile(profile: LandlordProfile): Promise<void> {
  landlord = { ...profile };
}

export async function prepareRentLedgerData(): Promise<void> {}
