import { factory } from '@/config';
import {
  BACKUP_COUNTER_TABLES,
  USER_DATA_TABLES,
  getDb,
  getSchemaVersion,
  isCounterPref,
  isProtectedPref,
  reloadPreferences,
} from '@/services/database';
import { pickTextFile, shareTextFile } from '@/services/files';
import { t } from '@/services/i18n';
import { toLocalDateKey } from '@/utils/date';

/**
 * Ücretsiz yedekleme ve geri yükleme (her zaman ücretsiz; asla paywall'a konmaz).
 *
 * - Yedek, kullanıcı tablolarının ve tercihlerin tek bir JSON dosyasıdır; kullanıcı
 *   paylaşım penceresinden Drive'a / e-postaya kaydeder. Sunucu yok.
 * - Kota ve bonus sayaçları (`quota_` / `bonus_`) yedeğe yazılmaz ve yedekten okunmaz:
 *   eski bir yedeği geri yüklemek ücretsiz hakları sıfırlamamalı.
 * - Belge numarası sayaçları (`BACKUP_COUNTER_TABLES`, sayaç tercihleri) yedeğe girer ama
 *   asla küçülmez: geri yüklemede cihazdaki ile yedekteki değerin büyüğü kalır.
 * - Satın alımlar mağazada tutulur; yeni cihazda "Satın alımları geri yükle" ile açılır.
 * - Geri yükleme tek işlemde yapılır: herhangi bir satır başarısız olursa hiçbir şey değişmez.
 */

const BACKUP_FORMAT = 'obappstudio-backup';
const BACKUP_FORMAT_VERSION = 1;

type CellValue = string | number | null;
type Row = Record<string, CellValue>;

interface BackupFile {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  app: string;
  appVersion: string;
  /** Yedeğin alındığı veritabanının `PRAGMA user_version` değeri. */
  schemaVersion: number;
  createdAt: string;
  tables: Record<string, Row[]>;
  preferences: Record<string, string>;
}

export type BackupErrorReason = 'invalid' | 'other_app' | 'too_new';

export class BackupError extends Error {
  constructor(readonly reason: BackupErrorReason) {
    super(`backup_${reason}`);
    this.name = 'BackupError';
  }
}

export interface PickedBackup {
  createdAt: string;
  /** Kullanıcı tablolarındaki toplam satır sayısı (onay penceresi için). */
  recordCount: number;
  data: BackupFile;
}

const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

/** Yedeğe yazılan / yedekten okunan tercih: korunanlar hariç, sayaçlar dahil. */
const isPortablePref = (key: string) => !isProtectedPref(key) || isCounterPref(key);

function toCounter(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '0', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function createBackup(): Promise<'shared' | 'unavailable'> {
  const database = getDb();
  const tables: Record<string, Row[]> = {};
  const tableNames = [...USER_DATA_TABLES, ...BACKUP_COUNTER_TABLES.map((counter) => counter.table)];
  for (const table of tableNames) {
    tables[table] = await database.getAllAsync<Row>(`SELECT * FROM ${quoteIdent(table)}`);
  }
  const prefRows = await database.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM kv_preferences'
  );

  const backup: BackupFile = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    app: factory.app.androidPackage,
    appVersion: factory.app.version,
    schemaVersion: await getSchemaVersion(),
    createdAt: new Date().toISOString(),
    tables,
    preferences: Object.fromEntries(
      prefRows.filter((row) => isPortablePref(row.key)).map((row) => [row.key, row.value])
    ),
  };

  return shareTextFile({
    fileName: `${factory.app.slug}-backup-${toLocalDateKey()}.json`,
    content: JSON.stringify(backup),
    mimeType: 'application/json',
    uti: 'public.json',
    dialogTitle: t('backupCreate'),
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCell(value: unknown): value is CellValue {
  return value === null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
}

function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('invalid');
  }
  if (!isObject(raw) || raw.format !== BACKUP_FORMAT || typeof raw.formatVersion !== 'number') {
    throw new BackupError('invalid');
  }
  if (raw.formatVersion > BACKUP_FORMAT_VERSION) throw new BackupError('too_new');
  if (raw.app !== factory.app.androidPackage) throw new BackupError('other_app');
  if (
    typeof raw.schemaVersion !== 'number' ||
    typeof raw.createdAt !== 'string' ||
    !isObject(raw.tables) ||
    !isObject(raw.preferences)
  ) {
    throw new BackupError('invalid');
  }

  for (const rows of Object.values(raw.tables)) {
    const valid =
      Array.isArray(rows) && rows.every((row) => isObject(row) && Object.values(row).every(isCell));
    if (!valid) throw new BackupError('invalid');
  }
  if (!Object.values(raw.preferences).every((value) => typeof value === 'string')) {
    throw new BackupError('invalid');
  }
  return raw as unknown as BackupFile;
}

/**
 * Dosya seçiciyi açar ve yedeği doğrular; henüz hiçbir şeyi değiştirmez.
 * Vazgeçilirse null, geçersiz dosyada `BackupError` döner.
 */
export async function pickBackup(): Promise<PickedBackup | null> {
  const text = await pickTextFile();
  if (text === null) return null;

  const data = parseBackup(text);
  if (data.schemaVersion > (await getSchemaVersion())) {
    // Daha yeni bir sürümün tabloları bu sürümde olmayabilir.
    throw new BackupError('too_new');
  }
  const recordCount = USER_DATA_TABLES.reduce(
    (sum, table) => sum + (data.tables[table]?.length ?? 0),
    0
  );
  return { createdAt: data.createdAt, recordCount, data };
}

/** Bu cihazdaki kullanıcı verilerini ve tercihleri yedektekilerle değiştirir. */
export async function restoreBackup(backup: PickedBackup): Promise<void> {
  const database = getDb();
  const { tables, preferences } = backup.data;

  const insertRows = async (table: string) => {
    const rows = tables[table] ?? [];
    if (rows.length === 0) return;
    // Yalnızca bu sürümde var olan sütunlar yazılır (eski yedekler yeni şemaya uyar).
    const columns = new Set(
      (await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${quoteIdent(table)})`)).map(
        (column) => column.name
      )
    );
    for (const row of rows) {
      const keys = Object.keys(row).filter((key) => columns.has(key));
      if (keys.length === 0) continue;
      await database.runAsync(
        `INSERT INTO ${quoteIdent(table)} (${keys.map(quoteIdent).join(', ')}) VALUES (${keys
          .map(() => '?')
          .join(', ')})`,
        keys.map((key) => row[key])
      );
    }
  };

  const mergeCounters = async ({ table, key, counter }: (typeof BACKUP_COUNTER_TABLES)[number]) => {
    for (const row of tables[table] ?? []) {
      const id = row[key];
      const value = row[counter];
      if (id === null || id === undefined || typeof value !== 'number') continue;
      const [tableId, keyId, counterId] = [quoteIdent(table), quoteIdent(key), quoteIdent(counter)];
      await database.runAsync(
        `INSERT INTO ${tableId} (${keyId}, ${counterId}) VALUES (?, ?) ON CONFLICT(${keyId}) DO UPDATE SET ${counterId} = MAX(${counterId}, excluded.${counterId})`,
        [id, value]
      );
    }
  };

  await database.withTransactionAsync(async () => {
    // Yabancı anahtar denetimi işlemin sonuna ertelenir: tablo sırası önemsizleşir,
    // tutarsız bir yedek ise commit'te reddedilir ve her şey geri alınır.
    await database.execAsync('PRAGMA defer_foreign_keys = ON');
    for (const table of USER_DATA_TABLES) {
      await database.execAsync(`DELETE FROM ${quoteIdent(table)}`);
    }
    for (const table of USER_DATA_TABLES) {
      await insertRows(table);
    }
    for (const counterTable of BACKUP_COUNTER_TABLES) {
      await mergeCounters(counterTable);
    }

    const existing = new Map(
      (await database.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM kv_preferences')).map(
        (row) => [row.key, row.value]
      )
    );
    for (const key of existing.keys()) {
      if (!isProtectedPref(key)) {
        await database.runAsync('DELETE FROM kv_preferences WHERE key = ?', key);
      }
    }
    for (const [key, value] of Object.entries(preferences)) {
      if (!isPortablePref(key)) continue;
      const next = isCounterPref(key)
        ? String(Math.max(toCounter(existing.get(key)), toCounter(value)))
        : value;
      await database.runAsync('INSERT OR REPLACE INTO kv_preferences (key, value) VALUES (?, ?)', key, next);
    }
  });

  await reloadPreferences();
}
