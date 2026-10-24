/**
 * Web önizlemesi: SQLite yok, tercihler localStorage'da tutulur.
 * Mağaza uygulamaları native çalışır; web yalnızca hızlı arayüz önizlemesi içindir.
 */

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [];
export const USER_DATA_TABLES = [] as const;

const PREFIX = 'factory_pref:';
const PROTECTED_PREF_PREFIXES = ['quota_', 'bonus_', 'receipt_seq_'];
const prefCache = new Map<string, string>();
let initialized = false;

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export async function initDatabase(): Promise<void> {
  if (initialized) return;
  const store = storage();
  if (store) {
    for (let i = 0; i < store.length; i += 1) {
      const fullKey = store.key(i);
      if (fullKey?.startsWith(PREFIX)) {
        prefCache.set(fullKey.slice(PREFIX.length), store.getItem(fullKey) ?? '');
      }
    }
  }
  initialized = true;
}

export function getDb(): never {
  throw new Error('[database] SQLite web önizlemesinde kullanılamaz.');
}

export function getPref(key: string): string | null {
  return prefCache.get(key) ?? null;
}

export async function setPref(key: string, value: string): Promise<void> {
  prefCache.set(key, value);
  storage()?.setItem(PREFIX + key, value);
}

export async function removePref(key: string): Promise<void> {
  prefCache.delete(key);
  storage()?.removeItem(PREFIX + key);
}

export async function getPreference(key: string): Promise<string | null> {
  await initDatabase();
  return getPref(key);
}

export const setPreference = setPref;

export async function resetLocalData(): Promise<void> {
  for (const key of [...prefCache.keys()]) {
    if (!PROTECTED_PREF_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      await removePref(key);
    }
  }
}
