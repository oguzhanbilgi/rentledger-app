import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export type CurrencyCode = 'TRY' | 'USD' | 'EUR' | 'GBP';

export interface PropertyRecord {
  id: string;
  name: string; // e.g. "Kadıköy 2+1 Daire"
  address: string;
  propertyType: 'apartment' | 'house' | 'shop' | 'office' | 'storage';
  notes?: string;
  createdAt: string;
}

export interface TenantRecord {
  id: string;
  propertyId: string;
  propertyName?: string;
  name: string; // Tenant full name
  phone: string;
  email?: string;
  tcOrId?: string; // TC Identity or Tax No for receipt
  rentAmount: number;
  depositAmount: number;
  currency: CurrencyCode;
  paymentDueDay: number; // 1 - 31
  leaseStartDate: string;
  leaseEndDate?: string;
  status: 'active' | 'past';
  notes?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  propertyId: string;
  tenantName: string;
  propertyName: string;
  receiptNo: string; // e.g. "MK-2026-001"
  paymentDate: string; // DD.MM.YYYY
  periodMonthYear: string; // e.g. "Ekim 2026"
  amount: number;
  currency: CurrencyCode;
  paymentMethod: 'bank_transfer' | 'cash' | 'credit_card';
  status: 'paid' | 'partial' | 'pending';
  notes?: string;
  createdAt: string;
}

export interface LandlordProfile {
  fullName: string;
  phone: string;
  email: string;
  iban: string;
  bankName: string;
  address: string;
  companyTitle?: string;
}

export const DEFAULT_LANDLORD_PROFILE: LandlordProfile = {
  fullName: '',
  phone: '',
  email: '',
  iban: '',
  bankName: '',
  address: '',
  companyTitle: '',
};

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('rentledger_factory.db');
  return dbInstance;
}

export async function initLocalDatabase(): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      propertyType TEXT NOT NULL DEFAULT 'apartment',
      notes TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY NOT NULL,
      propertyId TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      tcOrId TEXT,
      rentAmount REAL NOT NULL DEFAULT 0,
      depositAmount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'TRY',
      paymentDueDay INTEGER NOT NULL DEFAULT 1,
      leaseStartDate TEXT NOT NULL,
      leaseEndDate TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY NOT NULL,
      tenantId TEXT NOT NULL,
      propertyId TEXT NOT NULL,
      tenantName TEXT NOT NULL,
      propertyName TEXT NOT NULL,
      receiptNo TEXT NOT NULL,
      paymentDate TEXT NOT NULL,
      periodMonthYear TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'TRY',
      paymentMethod TEXT NOT NULL DEFAULT 'bank_transfer',
      status TEXT NOT NULL DEFAULT 'paid',
      notes TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS landlord_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      fullName TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      iban TEXT NOT NULL DEFAULT '',
      bankName TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      companyTitle TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO landlord_profile (id, fullName, phone, email, iban, bankName, address, companyTitle)
    VALUES (1, '', '', '', '', '', '', '');
  `);
}

// Properties CRUD
export async function getProperties(): Promise<PropertyRecord[]> {
  if (Platform.OS === 'web') return [];
  const db = await getDatabase();
  return await db.getAllAsync<PropertyRecord>(
    'SELECT * FROM properties ORDER BY createdAt DESC'
  );
}

export async function saveProperty(property: PropertyRecord): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO properties (id, name, address, propertyType, notes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      property.id,
      property.name,
      property.address,
      property.propertyType,
      property.notes || '',
      property.createdAt || new Date().toISOString(),
    ]
  );
}

export async function deleteProperty(propertyId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getDatabase();
  await db.runAsync('DELETE FROM properties WHERE id = ?', [propertyId]);
  await db.runAsync('DELETE FROM tenants WHERE propertyId = ?', [propertyId]);
}

// Tenants CRUD
export async function getTenants(): Promise<TenantRecord[]> {
  if (Platform.OS === 'web') return [];
  const db = await getDatabase();
  return await db.getAllAsync<TenantRecord>(
    `SELECT t.*, p.name as propertyName 
     FROM tenants t 
     LEFT JOIN properties p ON t.propertyId = p.id 
     ORDER BY t.createdAt DESC`
  );
}

export async function saveTenant(tenant: TenantRecord): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO tenants 
     (id, propertyId, name, phone, email, tcOrId, rentAmount, depositAmount, currency, paymentDueDay, leaseStartDate, leaseEndDate, status, notes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tenant.id,
      tenant.propertyId,
      tenant.name,
      tenant.phone,
      tenant.email || '',
      tenant.tcOrId || '',
      tenant.rentAmount,
      tenant.depositAmount,
      tenant.currency,
      tenant.paymentDueDay,
      tenant.leaseStartDate,
      tenant.leaseEndDate || '',
      tenant.status,
      tenant.notes || '',
      tenant.createdAt || new Date().toISOString(),
    ]
  );
}

export async function deleteTenant(tenantId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getDatabase();
  await db.runAsync('DELETE FROM tenants WHERE id = ?', [tenantId]);
}

// Payments / Receipts CRUD
export async function getPayments(): Promise<PaymentRecord[]> {
  if (Platform.OS === 'web') return [];
  const db = await getDatabase();
  return await db.getAllAsync<PaymentRecord>(
    'SELECT * FROM payments ORDER BY createdAt DESC'
  );
}

export async function savePayment(payment: PaymentRecord): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO payments 
     (id, tenantId, propertyId, tenantName, propertyName, receiptNo, paymentDate, periodMonthYear, amount, currency, paymentMethod, status, notes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payment.id,
      payment.tenantId,
      payment.propertyId,
      payment.tenantName,
      payment.propertyName,
      payment.receiptNo,
      payment.paymentDate,
      payment.periodMonthYear,
      payment.amount,
      payment.currency,
      payment.paymentMethod,
      payment.status,
      payment.notes || '',
      payment.createdAt || new Date().toISOString(),
    ]
  );
}

export async function deletePayment(paymentId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getDatabase();
  await db.runAsync('DELETE FROM payments WHERE id = ?', [paymentId]);
}

export async function generateNextReceiptNo(): Promise<string> {
  const year = new Date().getFullYear();
  if (Platform.OS === 'web') return `MK-${year}-001`;
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM payments'
  );
  const nextNum = (row?.count || 0) + 1;
  return `MK-${year}-${String(nextNum).padStart(3, '0')}`;
}

// Landlord Profile CRUD
export async function getLandlordProfile(): Promise<LandlordProfile> {
  if (Platform.OS === 'web') return DEFAULT_LANDLORD_PROFILE;
  const db = await getDatabase();
  const row = await db.getFirstAsync<LandlordProfile>(
    'SELECT fullName, phone, email, iban, bankName, address, companyTitle FROM landlord_profile WHERE id = 1'
  );
  return row || DEFAULT_LANDLORD_PROFILE;
}

export async function saveLandlordProfile(profile: LandlordProfile): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE landlord_profile 
     SET fullName = ?, phone = ?, email = ?, iban = ?, bankName = ?, address = ?, companyTitle = ?
     WHERE id = 1`,
    [
      profile.fullName,
      profile.phone,
      profile.email,
      profile.iban,
      profile.bankName,
      profile.address,
      profile.companyTitle || '',
    ]
  );
}

// Receipt Allowance & Free Limit Tracking
export interface ReceiptAllowanceInfo {
  usedCount: number;
  bonusEarned: number;
  remainingFree: number;
  totalFreeAllowed: number;
}

const INITIAL_FREE_RECEIPTS = 3;

export async function getReceiptAllowanceInfo(): Promise<ReceiptAllowanceInfo> {
  const [usedStr, bonusStr] = await Promise.all([
    getPreference('receipts_used_count'),
    getPreference('receipts_bonus_earned'),
  ]);
  const usedCount = parseInt(usedStr || '0', 10);
  const bonusEarned = parseInt(bonusStr || '0', 10);
  const totalFreeAllowed = INITIAL_FREE_RECEIPTS + bonusEarned;
  const remainingFree = Math.max(0, totalFreeAllowed - usedCount);

  return { usedCount, bonusEarned, remainingFree, totalFreeAllowed };
}

export async function incrementReceiptUsage(): Promise<void> {
  const info = await getReceiptAllowanceInfo();
  await setPreference('receipts_used_count', String(info.usedCount + 1));
}

export async function grantBonusReceipt(): Promise<number> {
  const info = await getReceiptAllowanceInfo();
  const newBonus = info.bonusEarned + 1;
  await setPreference('receipts_bonus_earned', String(newBonus));
  return newBonus;
}

// Preferences KV store
export async function getPreference(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(`rentledger_${key}`);
    } catch {
      return null;
    }
  }
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM preferences WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setPreference(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(`rentledger_${key}`, value);
    } catch {}
    return;
  }
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function resetAllLocalData(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.clear();
    } catch {}
    return;
  }
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM payments;
    DELETE FROM tenants;
    DELETE FROM properties;
    DELETE FROM preferences;
    UPDATE landlord_profile SET fullName = '', phone = '', email = '', iban = '', bankName = '', address = '', companyTitle = '' WHERE id = 1;
  `);
}
