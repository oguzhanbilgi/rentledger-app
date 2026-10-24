import { getDb, getPref, setPref } from '@/services/database';
import { isPeriodKey, parseLegacyPeriodLabel, toPeriodKey } from '@/services/rent-format';
import {
  EMPTY_LANDLORD_PROFILE,
  type LandlordProfile,
  type PaymentRecord,
  type PropertyRecord,
  type TenantRecord,
} from '@/services/rentledger-types';

/**
 * RentLedger deposu (SQLite). Tablolar `database.ts` → MIGRATIONS ile oluşturulur;
 * bu dosya yalnızca `getDb()` kullanır — `bootstrapApp()` tamamlanmadan çağrılmaz.
 * İşlemler ana bağlantıda (`withTransactionAsync`) yapılır; ayrı bağlantı açılmaz.
 */

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ----------------------------- Mülkler -----------------------------

export async function getProperties(): Promise<PropertyRecord[]> {
  return getDb().getAllAsync<PropertyRecord>('SELECT * FROM properties ORDER BY createdAt DESC');
}

/** Mülkü ve kiracısını siler; tahsilat geçmişi korunur. */
export async function deleteProperty(propertyId: string): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM tenants WHERE propertyId = ?', propertyId);
    await db.runAsync('DELETE FROM properties WHERE id = ?', propertyId);
  });
}

// ----------------------------- Kiracılar -----------------------------

export async function getTenants(): Promise<TenantRecord[]> {
  return getDb().getAllAsync<TenantRecord>(
    `SELECT t.*, p.name AS propertyName
     FROM tenants t
     LEFT JOIN properties p ON t.propertyId = p.id
     ORDER BY t.createdAt DESC`
  );
}

/** Mülk + kiracı tek işlemde (yarım kayıt kalmaz). */
export async function savePropertyWithTenant(property: PropertyRecord, tenant: TenantRecord): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT OR REPLACE INTO properties (id, name, address, propertyType, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      property.id,
      property.name,
      property.address,
      property.propertyType,
      property.notes ?? '',
      property.createdAt
    );
    await db.runAsync(
      `INSERT OR REPLACE INTO tenants
       (id, propertyId, name, phone, email, tcOrId, rentAmount, depositAmount, currency, paymentDueDay,
        leaseStartDate, leaseEndDate, status, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      tenant.id,
      tenant.propertyId,
      tenant.name,
      tenant.phone,
      tenant.email ?? '',
      tenant.tcOrId ?? '',
      tenant.rentAmount,
      tenant.depositAmount,
      tenant.currency,
      tenant.paymentDueDay,
      tenant.leaseStartDate,
      tenant.leaseEndDate ?? '',
      tenant.status,
      tenant.notes ?? '',
      tenant.createdAt
    );
  });
}

// ----------------------------- Tahsilatlar -----------------------------

export async function getPayments(): Promise<PaymentRecord[]> {
  return getDb().getAllAsync<PaymentRecord>('SELECT * FROM payments ORDER BY createdAt DESC');
}

export async function savePayment(payment: PaymentRecord): Promise<void> {
  await getDb().runAsync(
    `INSERT OR REPLACE INTO payments
     (id, tenantId, propertyId, tenantName, propertyName, receiptNo, paymentDate, periodMonthYear, periodKey,
      amount, currency, paymentMethod, status, notes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payment.id,
    payment.tenantId,
    payment.propertyId,
    payment.tenantName,
    payment.propertyName,
    payment.receiptNo,
    payment.paymentDate,
    payment.periodMonthYear,
    payment.periodKey,
    payment.amount,
    payment.currency,
    payment.paymentMethod,
    payment.status,
    payment.notes ?? '',
    payment.createdAt
  );
}

export async function deletePayment(paymentId: string): Promise<void> {
  await getDb().runAsync('DELETE FROM payments WHERE id = ?', paymentId);
}

// ----------------------------- Makbuz numarası -----------------------------

const RECEIPT_PREFIX = 'RL';

function trailingSequence(receiptNo: string, year: number): number {
  const match = new RegExp(`-${year}-(\\d+)$`).exec(receiptNo.trim());
  return match ? Number.parseInt(match[1], 10) || 0 : 0;
}

/**
 * Yıllık kalıcı sıradan bir sonraki makbuz numarasını AYIRIR (`RL-2026-0001`).
 * Sayaç `receipt_seq_<yıl>` tercihinde tutulur ve "verileri sıfırla" ile silinmez;
 * silinen tahsilatların numarası asla tekrar verilmez. İlk kullanımda eski
 * (`MK-2026-005`) numaraların devamından başlar.
 */
export async function reserveNextReceiptNo(date: Date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const prefKey = `receipt_seq_${year}`;
  let last = Number.parseInt(getPref(prefKey) ?? '0', 10) || 0;

  const rows = await getDb().getAllAsync<{ receiptNo: string }>(
    'SELECT receiptNo FROM payments WHERE receiptNo LIKE ?',
    `%-${year}-%`
  );
  for (const row of rows) {
    last = Math.max(last, trailingSequence(row.receiptNo, year));
  }

  const next = last + 1;
  await setPref(prefKey, String(next));
  return `${RECEIPT_PREFIX}-${year}-${String(next).padStart(4, '0')}`;
}

// ----------------------------- Ev sahibi -----------------------------

export async function getLandlordProfile(): Promise<LandlordProfile> {
  const row = await getDb().getFirstAsync<LandlordProfile>(
    'SELECT fullName, companyTitle, phone, email, address, bankName, iban FROM landlord_profile WHERE id = 1'
  );
  return row ? { ...EMPTY_LANDLORD_PROFILE, ...row } : { ...EMPTY_LANDLORD_PROFILE };
}

export async function saveLandlordProfile(profile: LandlordProfile): Promise<void> {
  await getDb().runAsync(
    `INSERT OR REPLACE INTO landlord_profile (id, fullName, companyTitle, phone, email, address, bankName, iban)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
    profile.fullName.trim(),
    profile.companyTitle.trim(),
    profile.phone.trim(),
    profile.email.trim(),
    profile.address.trim(),
    profile.bankName.trim(),
    profile.iban.trim()
  );
}

// ----------------------------- Açılış düzeltmeleri -----------------------------

/**
 * `bootstrapApp()` sonrasında bir kez çalışır: eski tahsilatların `periodKey`
 * alanını serbest metin dönemden (yoksa kayıt tarihinden) doldurur. İdempotenttir.
 */
export async function prepareRentLedgerData(): Promise<void> {
  const db = getDb();
  const rows = await db.getAllAsync<{ id: string; periodMonthYear: string; createdAt: string }>(
    "SELECT id, periodMonthYear, createdAt FROM payments WHERE periodKey = ''"
  );
  if (rows.length === 0) return;

  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      const created = new Date(row.createdAt);
      const fallback = Number.isNaN(created.getTime()) ? toPeriodKey() : toPeriodKey(created);
      const parsed = parseLegacyPeriodLabel(row.periodMonthYear ?? '');
      const key = parsed && isPeriodKey(parsed) ? parsed : fallback;
      await db.runAsync('UPDATE payments SET periodKey = ? WHERE id = ?', key, row.id);
    }
  });
}
