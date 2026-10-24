#!/usr/bin/env node
/**
 * Yayın öncesi kontrol (bağımlılıksız — EAS'ta `npm install` öncesi çalışır).
 *
 *   npm run verify:release          → yerel kontrol (hatada çıkış kodu 1)
 *   eas-build-pre-install hook'u    → yalnızca production profilinde build'i durdurur
 *
 * Kontroller: factory.config.js eksikleri, Google örnek (test) AdMob kimlikleri,
 * RevenueCat anahtarı, gizlilik URL'si, depoya yazılmış gizli anahtarlar.
 * Ortam değişkeni FACTORY_ALLOW_NO_ADS=1 reklamsız yayına izin verir.
 */
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const isEas = process.argv.includes('--eas');
const profile = process.env.EAS_BUILD_PROFILE ?? '';
const enforce = !isEas || profile === 'production';
const allowNoAds = process.env.FACTORY_ALLOW_NO_ADS === '1';

const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

const SAMPLE_PUBLISHER = 'ca-app-pub-3940256099942544';
const APP_ID_RE = /^ca-app-pub-\d{16}~\d{10}$/;
const UNIT_ID_RE = /^ca-app-pub-\d{16}\/\d{10}$/;

let factory;
try {
  factory = require(path.join(root, 'factory.config.js'));
} catch (error) {
  console.error('❌ factory.config.js okunamadı:', error.message);
  process.exit(1);
}

const { app, studio, monetization, eas } = factory;

// --- Kimlik ---
if (app.androidPackage === 'com.mobilefactory.template') fail('app.androidPackage hâlâ şablon değeri.');
if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(app.androidPackage)) fail(`app.androidPackage geçersiz: ${app.androidPackage}`);
if (app.name === 'Factory Starter') fail('app.name hâlâ şablon değeri.');
if (!/^\d+\.\d+\.\d+$/.test(app.version)) fail(`app.version "1.2.3" biçiminde olmalı: ${app.version}`);
if (!eas.projectId) fail('eas.projectId boş (eas init çalıştırın).');

// --- Yasal ---
if (!/^https:\/\//.test(studio.privacyPolicyUrl)) fail('studio.privacyPolicyUrl https ile başlamalı.');
if (!/^https:\/\//.test(studio.termsUrl)) fail('studio.termsUrl https ile başlamalı.');
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(studio.supportEmail)) fail('studio.supportEmail geçersiz.');
if (studio.privacyPolicyUrl === 'https://oguzhanbilgi.github.io/obappstudio-legal/privacy.html') {
  warn('studio.privacyPolicyUrl genel stüdyo sayfasını gösteriyor; uygulamaya özel politika sayfası önerilir.');
}

// --- RevenueCat ---
const rc = monetization.revenueCat;
if (!rc.androidApiKey) fail('monetization.revenueCat.androidApiKey boş — satın alma kapalı olur.');
else if (!rc.androidApiKey.startsWith('goog_')) fail('androidApiKey "goog_" ile başlamalı (public SDK key).');
if (/^(sk_|atk_)/.test(rc.androidApiKey) || /^(sk_|atk_)/.test(rc.iosApiKey)) {
  fail('RevenueCat GİZLİ anahtarı (sk_/atk_) config içinde! Yalnızca public SDK key kullanın.');
}
if (!rc.iosApiKey) warn('iOS RevenueCat anahtarı yok — iOS derlemesinde satın alma kapalı olur.');
if (!rc.entitlementId) fail('monetization.revenueCat.entitlementId boş.');

// --- AdMob ---
const admob = monetization.admob;
const checkAppId = (label, value) => {
  if (!value) return allowNoAds ? warn(`${label} boş (reklamsız yayın).`) : fail(`${label} boş.`);
  if (value.startsWith(SAMPLE_PUBLISHER)) return fail(`${label} Google ÖRNEK kimliği — gerçek kimliği girin.`);
  if (!APP_ID_RE.test(value)) fail(`${label} biçimi geçersiz: ${value}`);
};
const checkUnit = (label, value) => {
  if (!value) return allowNoAds ? warn(`${label} boş.`) : fail(`${label} boş — bu reklam türü gösterilmez.`);
  if (value.startsWith(SAMPLE_PUBLISHER)) return fail(`${label} Google TEST birimi — yayında gelir getirmez.`);
  if (!UNIT_ID_RE.test(value)) fail(`${label} biçimi geçersiz: ${value}`);
};
checkAppId('admob.androidAppId', admob.androidAppId);
for (const kind of ['banner', 'interstitial', 'rewarded']) {
  checkUnit(`admob.android.${kind}`, admob.android[kind]);
}
const androidPublisher = admob.androidAppId.split('~')[0];
for (const kind of ['banner', 'interstitial', 'rewarded']) {
  const unit = admob.android[kind];
  if (unit && androidPublisher && !unit.startsWith(androidPublisher)) {
    fail(`admob.android.${kind} farklı bir yayıncı hesabına ait (${unit.split('/')[0]}).`);
  }
}
// iOS: app.config.ts boş kimlik yerine Google örnek kimliğini gömer; iOS build'inde bu yayına çıkmamalı.
const buildPlatform = process.env.EAS_BUILD_PLATFORM ?? '';
if (admob.iosAppId) {
  checkAppId('admob.iosAppId', admob.iosAppId);
  const iosPublisher = admob.iosAppId.split('~')[0];
  for (const kind of ['banner', 'interstitial', 'rewarded']) {
    checkUnit(`admob.ios.${kind}`, admob.ios[kind]);
    const unit = admob.ios[kind];
    if (unit && !unit.startsWith(iosPublisher)) fail(`admob.ios.${kind} farklı bir yayıncı hesabına ait.`);
  }
} else if (buildPlatform === 'ios' && !allowNoAds) {
  fail('admob.iosAppId boş — iOS build\'i Google örnek kimliğiyle çıkar. Kimliği girin veya FACTORY_ALLOW_NO_ADS=1 kullanın.');
} else {
  warn('admob.iosAppId boş — iOS build alınacaksa doldurun.');
}

// --- Kota ---
const q = monetization.quota;
if (q.freeUnits < 0 || q.maxShareBonusesPerDay > 3) warn('Kota/paylaşım sınırları olağan dışı; factory.config.js kontrol edin.');

// --- Varsayılan (Expo/şablon) görseller yayına çıkmasın ---
const DEFAULT_ASSET_HASHES = new Set([
  '7a667804bb80a6a424a5daf18a2599c4f32237cf06fe78fc0de45dbb09e0eccf', // Expo varsayılan icon/splash
  '9e3d0315a33c6799de601dd34cd8bf8cc3a8d16f3bf75592baec2ceb7240b391', // Expo varsayılan adaptive foreground
  'fb139c2dee362ebf2070e23b96da6fc0d43f8492de38b8af1fd7223e19b5861d', // Expo varsayılan adaptive background (ızgara)
  '6371fc2c12e33ad2215a86c281db3d682a81bebe7c957a842c13b8bf00cceb83', // Expo varsayılan monochrome (Expo logosu)
]);
const assetHash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const asset of ['icon.png', 'splash-icon.png', 'android-icon-foreground.png', 'android-icon-background.png']) {
  const file = path.join(root, 'assets', 'images', asset);
  if (!fs.existsSync(file)) {
    fail(`assets/images/${asset} eksik.`);
    continue;
  }
  if (DEFAULT_ASSET_HASHES.has(assetHash(file))) fail(`assets/images/${asset} hâlâ Expo varsayılan görseli — uygulamanın kendi ikonunu koyun.`);
}
// İsteğe bağlı katman: varsa Expo varsayılanı olmamalı (temalı ikonda Expo logosu görünür).
const monochrome = path.join(root, 'assets', 'images', 'android-icon-monochrome.png');
if (fs.existsSync(monochrome) && DEFAULT_ASSET_HASHES.has(assetHash(monochrome))) {
  fail('assets/images/android-icon-monochrome.png Expo varsayılanı — kendi glifinizi koyun veya dosyayı silin.');
}

// --- Depoya girecek dosyalarda gizli anahtar taraması ---
// Yalnızca git'e eklenmiş veya eklenebilecek (ignore edilmemiş) dosyalar taranır;
// .gitignore'daki yerel .env gibi dosyalar meşrudur. git yoksa (ör. EAS arşivi) tüm ağaç taranır.
const SECRET_PATTERNS = [
  { re: /\bsk_[A-Za-z0-9]{20,}/, label: 'RevenueCat secret key' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, label: 'özel anahtar (private key)' },
  { re: /"private_key_id"\s*:/, label: 'Google service account JSON' },
  {
    re: /\b(storePassword|keyPassword|keystorePassword)\b["']?\s*[:=]?\s*["'][^"'\s]+["']/,
    label: 'keystore şifresi',
  },
];
const SENSITIVE_FILE_RE = /(\.(jks|keystore|p8|p12|pem|key)$|^credentials\.json$|service-account.*\.json$|^\.env(\..+)?$)/i;
const SKIP_DIRS = new Set(['node_modules', '.git', '.expo', 'dist', 'web-build', 'android', 'ios']);
const SCAN_EXT = /\.(m?js|cjs|ts|tsx|json|gradle|properties|md|txt|ya?ml|xml|plist)$/i;

function candidateFiles() {
  try {
    const out = execSync('git ls-files -co --exclude-standard', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.split(/\r?\n/).filter(Boolean);
  } catch {
    const files = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else files.push(path.relative(root, full));
      }
    };
    walk(root);
    return files;
  }
}

for (const relative of candidateFiles()) {
  const name = path.basename(relative);
  if (name === '.env.example') continue;
  if (SENSITIVE_FILE_RE.test(name)) {
    fail(`${relative} depoya girecek durumda (gizli dosya) — .gitignore'a ekleyin ve depodan çıkarın.`);
    continue;
  }
  if (!SCAN_EXT.test(name)) continue;
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, 'utf8');
  for (const { re, label } of SECRET_PATTERNS) {
    if (re.test(text)) fail(`${relative} içinde ${label} bulundu — dosyadan kaldırın, anahtarı yenileyin.`);
  }
}

// --- Rapor ---
const header = isEas ? `[verify-release] EAS profili: ${profile || '(yok)'}` : '[verify-release]';
console.log(header);
for (const message of warnings) console.log(`  ⚠️  ${message}`);
for (const message of errors) console.log(`  ❌ ${message}`);

if (errors.length === 0) {
  console.log(`  ✅ ${app.name} ${app.version} yayın kontrollerinden geçti.`);
  process.exit(0);
}

if (enforce) {
  console.log(`\n${errors.length} hata bulundu. Düzeltmeden production build alınamaz.`);
  process.exit(1);
}
console.log('\n(Production dışı profil — build devam ediyor.)');
process.exit(0);
