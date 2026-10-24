import * as SQLite from 'expo-sqlite';

import { factory } from '@/config';

/**
 * Yerel veritabanı (expo-sqlite) + anahtar/değer tercihleri.
 *
 * - Şema değişiklikleri yalnızca MIGRATIONS listesine YENİ adım eklenerek yapılır.
 *   Yayınlanmış bir adımın SQL'i asla değiştirilmez; sürüm `PRAGMA user_version` ile izlenir.
 * - Tercihler açılışta belleğe yüklenir; `getPref` senkron okunabilir (tema/dil gibi
 *   ilk karede gereken değerler için). Yazma işlemleri önce önbelleği, sonra diski günceller.
 * - Üretim tabloları boş başlar; örnek veri yalnızca onboarding önizlemesinde (bellekte) yaşar.
 */

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'core_preferences',
    sql: `CREATE TABLE IF NOT EXISTS kv_preferences (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );`,
  },
  {
    // RentLedger v1 (user_version = 0) tabloları. Mevcut kurulumlarda tablolar zaten var;
    // her ifade IF NOT EXISTS / OR IGNORE olduğu için adım idempotenttir.
    version: 2,
    name: 'rentledger_tables',
    sql: `CREATE TABLE IF NOT EXISTS properties (
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
    INSERT OR IGNORE INTO kv_preferences (key, value) SELECT key, value FROM preferences;
    INSERT OR IGNORE INTO kv_preferences (key, value)
      SELECT 'app_language', value FROM preferences WHERE key = 'app_lang' AND value IN ('en', 'tr');
    INSERT OR IGNORE INTO kv_preferences (key, value)
      SELECT 'app_onboarding_done', 'true' FROM preferences WHERE key = 'has_seen_onboarding' AND value = 'true';
    UPDATE kv_preferences
      SET value = CASE value WHEN '₺' THEN 'TRY' WHEN '$' THEN 'USD' WHEN '€' THEN 'EUR' WHEN '£' THEN 'GBP' ELSE value END
      WHERE key = 'app_currency';
    -- Eski sürüm kiracı para birimini seçtirmeden hep 'TRY' yazıyordu; kullanıcının görüp seçtiği
    -- uygulama para birimi USD/EUR/GBP ise eski kayıtları ona taşı (yeni kurulumda tablo boştur).
    UPDATE tenants SET currency = (SELECT value FROM kv_preferences WHERE key = 'app_currency')
      WHERE currency = 'TRY'
        AND (SELECT value FROM kv_preferences WHERE key = 'app_currency') IN ('USD', 'EUR', 'GBP');
    UPDATE payments SET currency = (SELECT value FROM kv_preferences WHERE key = 'app_currency')
      WHERE currency = 'TRY'
        AND (SELECT value FROM kv_preferences WHERE key = 'app_currency') IN ('USD', 'EUR', 'GBP');`,
  },
  {
    // Kira dönemi artık makine-okunur anahtar (YYYY-MM) olarak saklanır; eski satırlar
    // açılışta `prepareRentLedgerData()` ile doldurulur.
    version: 3,
    name: 'payments_period_key',
    sql: `ALTER TABLE payments ADD COLUMN periodKey TEXT NOT NULL DEFAULT '';`,
  },
];

/** "Verileri sıfırla" ile temizlenen kullanıcı tabloları. */
export const USER_DATA_TABLES = ['payments', 'tenants', 'properties', 'landlord_profile'] as const;

/**
 * Sıfırlamada KORUNAN tercih önekleri: ücretsiz kota sayaçları ve bonus
 * geçmişi silinirse kullanıcı "verileri sıfırla" ile sınırsız hak kazanır.
 * `receipt_seq_`: makbuz numaraları sıfırlamadan sonra bile tekrar kullanılmaz.
 */
const PROTECTED_PREF_PREFIXES = ['quota_', 'bonus_', 'receipt_seq_'];

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;
const prefCache = new Map<string, string>();

export function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = openAndMigrate().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

async function openAndMigrate(): Promise<void> {
  const database = await SQLite.openDatabaseAsync(factory.storage.databaseName);
  await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await runMigrations(database);

  const rows = await database.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM kv_preferences'
  );
  prefCache.clear();
  for (const row of rows) {
    prefCache.set(row.key, row.value);
  }
  db = database;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  const pending = [...MIGRATIONS]
    .sort((a, b) => a.version - b.version)
    .filter((m) => m.version > current);

  // Not: withExclusiveTransactionAsync ayrı bir bağlantı açar; o bağlantıda
  // foreign_keys kapalıdır ve ana bağlantıyla kilit çakışması olabilir. Göçler
  // açılışta, başka sorgu yokken çalıştığı için ana bağlantıda işlem yeterlidir.
  for (const migration of pending) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migration.sql);
      // PRAGMA parametre almaz; sürüm sabit bir tamsayıdır.
      await database.execAsync(`PRAGMA user_version = ${Math.trunc(migration.version)}`);
    });
  }
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('[database] initDatabase() tamamlanmadan veritabanına erişildi.');
  }
  return db;
}

// ----------------------------- Tercihler -----------------------------

/** Senkron okuma — `initDatabase()` tamamlandıktan sonra güvenilirdir. */
export function getPref(key: string): string | null {
  return prefCache.get(key) ?? null;
}

export async function setPref(key: string, value: string): Promise<void> {
  prefCache.set(key, value);
  await getDb().runAsync(
    'INSERT OR REPLACE INTO kv_preferences (key, value) VALUES (?, ?)',
    key,
    value
  );
}

export async function removePref(key: string): Promise<void> {
  prefCache.delete(key);
  await getDb().runAsync('DELETE FROM kv_preferences WHERE key = ?', key);
}

/** Eski ekranlarla uyum için asenkron okuma. */
export async function getPreference(key: string): Promise<string | null> {
  await initDatabase();
  return getPref(key);
}

export const setPreference = setPref;

/**
 * Kullanıcı verilerini ve tercihleri siler; satın alma durumu (mağazada tutulur)
 * ve ücretsiz kota sayaçları korunur.
 */
export async function resetLocalData(): Promise<void> {
  const database = getDb();
  // Ana bağlantıda çalışır: foreign_keys açık kalır (ON DELETE CASCADE çalışır).
  await database.withTransactionAsync(async () => {
    for (const table of USER_DATA_TABLES) {
      await database.execAsync(`DELETE FROM ${table}`);
    }
    const keys = [...prefCache.keys()].filter(
      (key) => !PROTECTED_PREF_PREFIXES.some((prefix) => key.startsWith(prefix))
    );
    for (const key of keys) {
      await database.runAsync('DELETE FROM kv_preferences WHERE key = ?', key);
    }
  });
  for (const key of [...prefCache.keys()]) {
    if (!PROTECTED_PREF_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      prefCache.delete(key);
    }
  }
}
