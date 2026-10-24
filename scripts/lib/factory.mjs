/**
 * Otomasyon scriptlerinin ortak yardımcıları (bağımlılıksız).
 *
 * Tüm uygulamaya özel değerler `factory.config.js` dosyasından okunur;
 * gizli anahtarlar yalnızca ortam değişkenlerinden (veya yerel `.env`) gelir.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Şablonun kendi paket adı — bu değerle mağazaya/RevenueCat'e işlem yapılmaz. */
export const TEMPLATE_ANDROID_PACKAGE = 'com.mobilefactory.template';

/** Play abonelik temel plan kimlikleri (RevenueCat ürün kimliği `<ürün>:<temel plan>` biçimindedir). */
export const BASE_PLAN_IDS = Object.freeze({
  weekly: 'weekly-base',
  monthly: 'monthly-base',
  annual: 'annual-base',
});

/** `<cwd>/factory.config.js` dosyasını (CommonJS) okur. */
export function loadFactoryConfig(root = process.cwd()) {
  const file = path.join(root, 'factory.config.js');
  if (!fs.existsSync(file)) {
    throw new Error(`factory.config.js bulunamadı: ${file} — scripti uygulama kök dizininden çalıştırın.`);
  }
  const factory = require(file);
  if (!factory?.app?.androidPackage || !factory?.app?.name) {
    throw new Error('factory.config.js içinde app.name / app.androidPackage eksik.');
  }
  return factory;
}

/** Ürün öneki: `app.androidPackage` son parçası (`com.mobilefactory.veloquote` → `veloquote`). */
export function productPrefix(factory) {
  const pkg = String(factory?.app?.androidPackage ?? '');
  const prefix = pkg.split('.').pop() ?? '';
  // Play ürün kimliği: küçük harf/rakam ile başlar; yalnızca küçük harf, rakam, `_` ve `.` içerir.
  if (!/^[a-z0-9][a-z0-9_.]*$/.test(prefix)) {
    throw new Error(
      `app.androidPackage son parçası ("${prefix}") Play ürün kimliği öneki olamaz — yalnızca küçük harf, rakam ve "_" kullanın.`
    );
  }
  return prefix;
}

/** Fabrika standardı ürün kimlikleri (docs/FACTORY_RULES.md §4.1). */
export function productIds(factory) {
  const p = productPrefix(factory);
  return {
    weekly: `${p}_weekly`,
    monthly: `${p}_monthly`,
    annual: `${p}_annual`,
    lifetime: `${p}_lifetime`,
  };
}

export function isTemplatePackage(factory) {
  return factory?.app?.androidPackage === TEMPLATE_ANDROID_PACKAGE;
}

/**
 * Yerel `.env` varsa ortam değişkenlerine yükler (önceden tanımlı değişkenler ezilmez).
 * Dönüş: yüklendiyse dosya yolu, aksi halde null.
 */
export function loadDotEnv(root = process.cwd()) {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file) || typeof process.loadEnvFile !== 'function') return null;
  process.loadEnvFile(file);
  return file;
}

/**
 * Basit argüman ayrıştırıcı.
 * @param {string[]} argv
 * @param {{ flags?: string[], options?: string[] }} spec  flags: `--dry-run`; options: `--listing <değer>`
 */
export function parseArgs(argv, { flags = [], options = [] } = {}) {
  const result = { flags: new Set(), options: {}, positionals: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      result.positionals.push(arg);
      continue;
    }
    const [name, inlineValue] = arg.split(/=(.*)/s, 2);
    if (flags.includes(name)) {
      result.flags.add(name);
    } else if (options.includes(name)) {
      const value = inlineValue ?? argv[++i];
      if (value === undefined || value.startsWith('--')) throw new Error(`${name} bir değer bekliyor.`);
      result.options[name] = value;
    } else {
      throw new Error(`Bilinmeyen argüman: ${name}`);
    }
  }
  return result;
}

/** Ağ çağrılarını tamamen engeller (dry-run güvencesi). */
export function blockNetwork() {
  globalThis.fetch = async (url) => {
    throw new Error(`dry-run: ağ çağrısı engellendi (${url})`);
  };
}
