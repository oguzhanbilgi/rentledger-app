#!/usr/bin/env node
/**
 * Google Play yayın otomasyonu — Android Publisher API v3 (bağımlılıksız).
 *
 * Sırasıyla:
 *   1. Edit oturumu açar; listing dosyasındaki her dil için mağaza metnini (başlık, kısa/tam açıklama) yazar.
 *   2. AAB verildiyse yükler (verilmediyse Play'deki en yüksek versionCode kullanılır) ve sürümü
 *      PLAY_TRACK kanalına "draft" olarak, sürüm notlarıyla atar. Edit'i commit eder.
 *   3. <önek>_weekly | <önek>_monthly | <önek>_annual aboneliklerini oluşturur/günceller, temel planları etkinleştirir.
 *   4. <önek>_lifetime tek seferlik ürününü oluşturur/günceller ve etkinleştirir.
 *
 * Paket adı, uygulama adı, sürüm ve ürün kimlikleri factory.config.js'ten; metinler ve fiyatlar
 * store-listing/listing.json'dan okunur (şablon: store-listing/listing.example.json).
 *
 * Kullanım (uygulama kök dizininden):
 *   node scripts/factory-publish-google-play.mjs --dry-run            # ağ çağrısı yok, plan yazdırılır
 *   node scripts/factory-publish-google-play.mjs --aab build.aab      # gerçek yayın
 *   Seçenekler: --listing <yol>  --aab <yol> (veya ilk argüman)  --verbose (dry-run'da istek gövdeleri)
 *
 * Ortam değişkenleri (kökte .env varsa otomatik yüklenir, mevcut değişkenleri ezmez):
 *   PLAY_SERVICE_ACCOUNT_JSON  service account JSON dosyasının yolu — gerçek çalıştırmada ZORUNLU
 *   AAB_PATH                   yüklenecek .aab (CLI argümanı önceliklidir)
 *   PLAY_TRACK                 internal (varsayılan) | alpha | beta | production | <kapalı test kanalı>
 *   LISTING_PATH               listing JSON yolu (varsayılan: store-listing/listing.json)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  BASE_PLAN_IDS,
  blockNetwork,
  isTemplatePackage,
  loadDotEnv,
  loadFactoryConfig,
  parseArgs,
  productIds,
} from './lib/factory.mjs';

const API_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const UPLOAD_BASE = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3';

const ROOT = process.cwd();
const DEFAULT_LISTING = path.join(ROOT, 'store-listing', 'listing.json');
const EXAMPLE_LISTING = path.join(ROOT, 'store-listing', 'listing.example.json');

/** Play Console karakter sınırları. */
const LIMITS = {
  title: 30,
  shortDescription: 80,
  fullDescription: 4000,
  releaseNotes: 500,
  subscriptionTitle: 55,
  subscriptionDescription: 80,
  benefitCount: 4,
  benefit: 40,
  oneTimeTitle: 55,
  oneTimeDescription: 200,
};

const SUBSCRIPTIONS = [
  { key: 'weekly', billingPeriodDuration: 'P1W' },
  { key: 'monthly', billingPeriodDuration: 'P1M' },
  { key: 'annual', billingPeriodDuration: 'P1Y' },
];
const PRODUCT_KEYS = ['weekly', 'monthly', 'annual', 'lifetime'];

/** Doğrulanamayan iddialar (docs/FACTORY_RULES.md §1, §5) — yalnızca uyarı. */
const RISKY_CLAIMS = [
  /\bofficial\b/i,
  /\bapproved\b/i,
  /legally binding/i,
  /bulletproof/i,
  /audit-proof/i,
  /\bguaranteed?\b/i,
  /5[ -]stars?/i,
  /\bresmi\b/i,
  /onaylı/i,
  /yasal olarak geçerli/i,
  /garanti/i,
  /5 yıldız/i,
];

const USAGE = `Kullanım: node scripts/factory-publish-google-play.mjs [--dry-run] [--aab <yol>] [--listing <yol>] [--verbose]
Ortam: PLAY_SERVICE_ACCOUNT_JSON (zorunlu), AAB_PATH, PLAY_TRACK (internal), LISTING_PATH
Ayrıntılar: scripts/README.md`;

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

const charCount = (value) => [...String(value)].length;
const rel = (file) => path.relative(ROOT, file) || file;

function microsToMoney(currencyCode, priceMicros) {
  const micros = BigInt(priceMicros);
  return {
    currencyCode,
    units: String(micros / 1000000n),
    nanos: Number(micros % 1000000n) * 1000,
  };
}

function formatMicros(priceMicros, currencyCode) {
  return `${(Number(priceMicros) / 1e6).toFixed(2)} ${currencyCode}`;
}

/** Listing metinlerindeki {appName}, {version}, {supportEmail} yer tutucularını doldurur. */
function fillPlaceholders(value, tokens) {
  if (typeof value === 'string') {
    return value.replace(/\{([A-Za-z]+)\}/g, (match, name) => (name in tokens ? tokens[name] : match));
  }
  if (Array.isArray(value)) return value.map((item) => fillPlaceholders(item, tokens));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillPlaceholders(v, tokens)]));
  }
  return value;
}

// ---------------------------------------------------------------------------
// Listing dosyası
// ---------------------------------------------------------------------------

function resolveListingPath(explicit, dryRun) {
  if (explicit) {
    const file = path.resolve(ROOT, explicit);
    if (!fs.existsSync(file)) throw new Error(`Listing dosyası bulunamadı: ${file}`);
    return { file, fallback: false };
  }
  if (fs.existsSync(DEFAULT_LISTING)) return { file: DEFAULT_LISTING, fallback: false };
  if (dryRun && fs.existsSync(EXAMPLE_LISTING)) return { file: EXAMPLE_LISTING, fallback: true };
  throw new Error(
    [
      'store-listing/listing.json bulunamadı.',
      '  Şablondan oluşturun ve metinleri uygulamaya göre doldurun:',
      '    PowerShell: Copy-Item store-listing/listing.example.json store-listing/listing.json',
      '    bash:       cp store-listing/listing.example.json store-listing/listing.json',
      '  Başka bir dosya için: --listing <yol> veya LISTING_PATH=<yol>.',
    ].join('\n')
  );
}

function loadListing(file, factory) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${rel(file)} okunamadı / geçersiz JSON: ${error.message}`);
  }
  const tokens = {
    appName: factory.app.name,
    version: factory.app.version,
    supportEmail: factory.studio?.supportEmail ?? '',
  };
  return { locales: fillPlaceholders(raw.locales, tokens), pricing: raw.pricing };
}

/** Tüm sınırları API çağrısından ÖNCE kontrol eder. */
function validateListing(listing) {
  const errors = [];
  const warnings = [];
  const todos = [];

  const checkText = (label, value, max, { required = true } = {}) => {
    if (value === undefined || value === null || value === '') {
      if (required) errors.push(`${label} boş.`);
      return;
    }
    if (typeof value !== 'string') {
      errors.push(`${label} metin olmalı.`);
      return;
    }
    const n = charCount(value);
    if (n > max) errors.push(`${label} ${n} karakter (sınır ${max}).`);
    const leftover = value.match(/\{[A-Za-z]+\}/g);
    if (leftover) errors.push(`${label} bilinmeyen yer tutucu içeriyor: ${[...new Set(leftover)].join(', ')}`);
    if (/\bTODO\b/.test(value)) todos.push(label);
    for (const re of RISKY_CLAIMS) {
      const hit = value.match(re);
      if (hit) warnings.push(`${label} doğrulanamayan iddia içerebilir: "${hit[0]}" (FACTORY_RULES §1).`);
    }
  };

  const locales = listing.locales;
  if (!locales || typeof locales !== 'object' || Object.keys(locales).length === 0) {
    errors.push('"locales" en az bir dil içermeli (ör. "en-US", "tr-TR").');
  } else {
    for (const [code, l] of Object.entries(locales)) {
      if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,4})?$/.test(code)) errors.push(`Geçersiz Play dil kodu: "${code}" (ör. en-US, tr-TR).`);
      if (!l || typeof l !== 'object') {
        errors.push(`${code}: nesne olmalı.`);
        continue;
      }
      checkText(`${code}.title`, l.title, LIMITS.title);
      checkText(`${code}.shortDescription`, l.shortDescription, LIMITS.shortDescription);
      checkText(`${code}.fullDescription`, l.fullDescription, LIMITS.fullDescription);
      checkText(`${code}.releaseNotes`, l.releaseNotes, LIMITS.releaseNotes, { required: false });

      const benefits = l.subscriptionBenefits ?? [];
      if (!Array.isArray(benefits)) errors.push(`${code}.subscriptionBenefits dizi olmalı.`);
      else {
        if (benefits.length > LIMITS.benefitCount) {
          errors.push(`${code}.subscriptionBenefits en fazla ${LIMITS.benefitCount} madde olabilir (${benefits.length}).`);
        }
        benefits.forEach((b, i) => checkText(`${code}.subscriptionBenefits[${i}]`, b, LIMITS.benefit));
      }

      for (const key of PRODUCT_KEYS) {
        const p = l.products?.[key];
        const isSub = key !== 'lifetime';
        if (!p) {
          errors.push(`${code}.products.${key} eksik (title + description).`);
          continue;
        }
        checkText(`${code}.products.${key}.title`, p.title, isSub ? LIMITS.subscriptionTitle : LIMITS.oneTimeTitle);
        checkText(
          `${code}.products.${key}.description`,
          p.description,
          isSub ? LIMITS.subscriptionDescription : LIMITS.oneTimeDescription
        );
      }
    }
  }

  const pricing = listing.pricing;
  for (const key of PRODUCT_KEYS) {
    const p = pricing?.[key];
    if (!p || !Array.isArray(p.regions) || p.regions.length === 0) {
      errors.push(`pricing.${key}.regions en az bir bölge içermeli (ör. US/USD).`);
      continue;
    }
    const seen = new Set();
    p.regions.forEach((r, i) => {
      const label = `pricing.${key}.regions[${i}]`;
      if (!/^[A-Z]{2}$/.test(r?.regionCode ?? '')) errors.push(`${label}.regionCode iki harfli ülke kodu olmalı (ör. US).`);
      if (seen.has(r?.regionCode)) errors.push(`${label}.regionCode tekrar ediyor: ${r.regionCode}`);
      seen.add(r?.regionCode);
      if (!/^[A-Z]{3}$/.test(r?.currencyCode ?? '')) errors.push(`${label}.currencyCode ISO 4217 olmalı (ör. USD).`);
      if (!/^[1-9]\d*$/.test(String(r?.priceMicros ?? ''))) errors.push(`${label}.priceMicros pozitif tam sayı olmalı (3.99 → "3990000").`);
    });
    if (p.otherRegions !== undefined) {
      if (key === 'lifetime') {
        warnings.push('pricing.lifetime.otherRegions kullanılmaz (yalnızca aboneliklerde geçerli).');
      } else {
        for (const field of ['usdPriceMicros', 'eurPriceMicros']) {
          if (!/^[1-9]\d*$/.test(String(p.otherRegions?.[field] ?? ''))) {
            errors.push(`pricing.${key}.otherRegions.${field} pozitif tam sayı olmalı.`);
          }
        }
      }
    }
  }

  return { errors, warnings, todos };
}

// ---------------------------------------------------------------------------
// Play API istemcisi
// ---------------------------------------------------------------------------

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  const signature = signer.sign(serviceAccount.private_key);
  const jwt = `${unsignedToken}.${base64UrlEncode(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`OAuth2 token hatası: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

function createLiveClient(token) {
  async function call(method, endpoint, body, queryParams = {}) {
    const url = new URL(`${API_BASE}${endpoint}`);
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const err = new Error(`Play API ${method} ${endpoint} (${res.status}): ${JSON.stringify(data)}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function uploadBundle(packageName, editId, aabFilePath) {
    const stat = fs.statSync(aabFilePath);
    console.log(`📦 AAB yükleniyor (${(stat.size / (1024 * 1024)).toFixed(2)} MB): ${aabFilePath}`);
    const fileBuffer = fs.readFileSync(aabFilePath);

    const res = await fetch(`${UPLOAD_BASE}/applications/${packageName}/edits/${editId}/bundles?uploadType=media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(fileBuffer.length),
      },
      body: fileBuffer,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`AAB yükleme başarısız (${res.status}): ${JSON.stringify(data)}`);
    }
    return data;
  }

  return { call, uploadBundle };
}

/** Ağ çağrısı yapmaz; planlanan istekleri yazdırır ve sahte yanıt döner. */
function createDryRunClient({ verbose }) {
  let step = 0;
  const log = (method, url, body) => {
    step += 1;
    console.log(`  ${String(step).padStart(2)}. ${method.padEnd(5)} ${url}`);
    if (verbose && body !== undefined) {
      console.log(JSON.stringify(body, null, 2).replace(/^/gm, '        '));
    }
  };

  async function call(method, endpoint, body, queryParams = {}) {
    const query = new URLSearchParams(
      Object.entries(queryParams)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    log(method, `${endpoint}${query ? `?${decodeURIComponent(query)}` : ''}`, body);
    if (method === 'POST' && endpoint.endsWith('/edits')) return { id: '<editId>' };
    if (method === 'GET' && endpoint.endsWith('/bundles')) return { bundles: [{ versionCode: '<mevcut-en-yüksek-versionCode>' }] };
    return {};
  }

  async function uploadBundle(packageName, editId, aabFilePath) {
    const size = (fs.statSync(aabFilePath).size / (1024 * 1024)).toFixed(2);
    log('POST', `[upload] /applications/${packageName}/edits/${editId}/bundles?uploadType=media  (${rel(aabFilePath)}, ${size} MB)`);
    return { versionCode: '<yüklenen-AAB-versionCode>' };
  }

  return { call, uploadBundle };
}

// ---------------------------------------------------------------------------
// Adımlar
// ---------------------------------------------------------------------------

async function setupStoreListingsAndRelease(client, ctx) {
  const { packageName, locales, aabPath, track, version, info } = ctx;
  console.log('\n📝 Mağaza metni + sürüm (edit oturumu)');
  const edit = await client.call('POST', `/applications/${packageName}/edits`, {});
  const editId = edit.id;
  info(`✅ Edit ID: ${editId}`);

  // 1. Mağaza metinleri
  for (const [lang, l] of Object.entries(locales)) {
    await client.call('PUT', `/applications/${packageName}/edits/${editId}/listings/${lang}`, {
      language: lang,
      title: l.title,
      shortDescription: l.shortDescription,
      fullDescription: l.fullDescription,
    });
    info(`✅ Mağaza metni güncellendi (${lang})`);
  }

  // 2. AAB: verildiyse yükle; verilmediyse Play'deki en yüksek versionCode
  let targetVersionCode = null;
  if (aabPath) {
    const bundle = await client.uploadBundle(packageName, editId, aabPath);
    targetVersionCode = bundle.versionCode;
    info(`✅ AAB yüklendi. versionCode: ${targetVersionCode}`);
  } else {
    const existingBundlesRes = await client.call('GET', `/applications/${packageName}/edits/${editId}/bundles`);
    const existingBundles = existingBundlesRes?.bundles || [];
    const latest = existingBundles.reduce(
      (best, b) => (best === null || Number(b.versionCode) > Number(best.versionCode) ? b : best),
      null
    );
    targetVersionCode = latest?.versionCode ?? null;
    if (targetVersionCode) info(`✅ Play'deki mevcut paket kullanılacak. versionCode: ${targetVersionCode}`);
    else console.warn('⚠️ AAB verilmedi ve Play\'de yüklü paket yok — kanal ataması atlandı.');
  }

  if (targetVersionCode) {
    const releaseNotes = Object.entries(locales)
      .filter(([, l]) => l.releaseNotes)
      .map(([lang, l]) => ({ language: lang, text: l.releaseNotes }));
    await client.call('PUT', `/applications/${packageName}/edits/${editId}/tracks/${track}`, {
      track,
      releases: [
        {
          name: `${version} (${targetVersionCode})`,
          versionCodes: [String(targetVersionCode)],
          status: 'draft',
          ...(releaseNotes.length ? { releaseNotes } : {}),
        },
      ],
    });
    info(`✅ versionCode ${targetVersionCode} → '${track}' kanalı (draft)`);
  }

  await client.call('POST', `/applications/${packageName}/edits/${editId}:commit`, {});
  info('🎉 Edit commit edildi.');
}

async function setupSubscriptions(client, ctx) {
  const { packageName, locales, pricing, ids, info, dryRun } = ctx;
  console.log('\n💳 Abonelikler');

  for (const { key, billingPeriodDuration } of SUBSCRIPTIONS) {
    const productId = ids[key];
    const basePlanId = BASE_PLAN_IDS[key];
    const price = pricing[key];

    const subscriptionBody = {
      packageName,
      productId,
      listings: Object.entries(locales).map(([lang, l]) => ({
        languageCode: lang,
        title: l.products[key].title,
        description: l.products[key].description,
        ...(l.subscriptionBenefits?.length ? { benefits: l.subscriptionBenefits } : {}),
      })),
      basePlans: [
        {
          basePlanId,
          autoRenewingBasePlanType: {
            billingPeriodDuration,
            gracePeriodDuration: 'P3D',
            resubscribeState: 'RESUBSCRIBE_STATE_ACTIVE',
          },
          regionalConfigs: price.regions.map((r) => ({
            regionCode: r.regionCode,
            newSubscriberAvailability: true,
            price: microsToMoney(r.currencyCode, r.priceMicros),
          })),
          ...(price.otherRegions
            ? {
                otherRegionsConfig: {
                  usdPrice: microsToMoney('USD', price.otherRegions.usdPriceMicros),
                  eurPrice: microsToMoney('EUR', price.otherRegions.eurPriceMicros),
                  newSubscriberAvailability: true,
                },
              }
            : {}),
        },
      ],
    };

    try {
      await client.call('POST', `/applications/${packageName}/subscriptions`, subscriptionBody, {
        productId,
        'regionsVersion.version': '2022/02',
      });
      info(`✅ Abonelik oluşturuldu: ${productId}`);
      if (dryRun) console.log(`        (zaten varsa 409 → PATCH .../subscriptions/${productId}?updateMask=listings,basePlans)`);
    } catch (e) {
      if (e.status === 409 || String(e.message).includes('ALREADY_EXISTS')) {
        console.log(`ℹ️ ${productId} zaten var, güncelleniyor...`);
        await client.call('PATCH', `/applications/${packageName}/subscriptions/${productId}`, subscriptionBody, {
          updateMask: 'listings,basePlans',
          'regionsVersion.version': '2022/02',
        });
      } else {
        console.warn(`⚠️ Abonelik ${productId} uyarısı:`, e.message);
      }
    }

    try {
      await client.call(
        'POST',
        `/applications/${packageName}/subscriptions/${productId}/basePlans/${basePlanId}:activate`,
        {}
      );
      info(`✅ Temel plan etkin: ${productId}:${basePlanId}`);
    } catch (e) {
      console.log(`ℹ️ Temel plan etkinleştirme durumu (${basePlanId}):`, e.message);
    }
  }
}

async function setupLifetimeInAppProduct(client, ctx) {
  const { packageName, locales, pricing, ids, info } = ctx;
  const productId = ids.lifetime;
  console.log(`\n💎 Tek seferlik ürün (${productId})`);

  const body = {
    packageName,
    productId,
    listings: Object.entries(locales).map(([lang, l]) => ({
      languageCode: lang,
      title: l.products.lifetime.title,
      description: l.products.lifetime.description,
    })),
    purchaseOptions: [
      {
        purchaseOptionId: 'default',
        buyOption: {
          legacyCompatible: true,
        },
        regionalPricingAndAvailabilityConfigs: pricing.lifetime.regions.map((r) => ({
          regionCode: r.regionCode,
          price: microsToMoney(r.currencyCode, r.priceMicros),
          availability: 'AVAILABLE',
        })),
      },
    ],
  };

  try {
    await client.call('PATCH', `/applications/${packageName}/onetimeproducts/${productId}`, body, {
      allowMissing: true,
      updateMask: 'listings,purchaseOptions',
      'regionsVersion.version': '2022/02',
    });
    info(`✅ Tek seferlik ürün oluşturuldu/güncellendi: ${productId}`);

    await client.call('POST', `/applications/${packageName}/onetimeproducts/${productId}/purchaseoptions:batchUpdateStates`, {
      requests: [
        {
          activatePurchaseOptionRequest: {
            packageName,
            productId,
            purchaseOptionId: 'default',
          },
        },
      ],
    });
    info(`✅ Tek seferlik ürün etkin: ${productId}`);
  } catch (e) {
    console.warn('⚠️ Tek seferlik ürün uyarısı:', e.message);
  }
}

// ---------------------------------------------------------------------------
// Ana akış
// ---------------------------------------------------------------------------

function readServiceAccount(file) {
  const sa = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!sa.client_email || !sa.private_key) throw new Error('client_email / private_key alanları yok.');
  return sa;
}

function printSummary(ctx) {
  const { factory, packageName, ids, track, aabPath, listingFile, locales, pricing, saStatus, dryRun } = ctx;
  console.log(`Google Play yayını${dryRun ? ' — DRY-RUN (ağ çağrısı yapılmaz)' : ''}`);
  console.log(`  Uygulama : ${factory.app.name} ${factory.app.version}`);
  console.log(`  Paket    : ${packageName}`);
  console.log(`  Kanal    : ${track} (sürüm durumu: draft)`);
  console.log(`  AAB      : ${aabPath ? rel(aabPath) : "(verilmedi → Play'deki en yüksek versionCode kullanılır)"}`);
  console.log(`  Listing  : ${rel(listingFile)}`);
  console.log(`  Hesap    : ${saStatus}`);
  if (locales && typeof locales === 'object') {
    console.log('  Diller   :');
    for (const [lang, l] of Object.entries(locales)) {
      const c = (v) => (typeof v === 'string' ? charCount(v) : 0);
      console.log(
        `    ${lang.padEnd(6)} "${l?.title ?? ''}"  başlık ${c(l?.title)}/${LIMITS.title} · kısa ${c(l?.shortDescription)}/${LIMITS.shortDescription} · tam ${c(l?.fullDescription)}/${LIMITS.fullDescription} · notlar ${c(l?.releaseNotes)}/${LIMITS.releaseNotes}`
      );
    }
  }
  console.log('  Ürünler  :');
  for (const key of PRODUCT_KEYS) {
    const p = pricing?.[key];
    const regions = Array.isArray(p?.regions)
      ? p.regions.map((r) => `${r.regionCode} ${formatMicros(r.priceMicros, r.currencyCode)}`).join(' · ')
      : '(fiyat yok)';
    const other =
      key !== 'lifetime' && p?.otherRegions
        ? ` · diğer bölgeler ${formatMicros(p.otherRegions.usdPriceMicros, 'USD')} / ${formatMicros(p.otherRegions.eurPriceMicros, 'EUR')}`
        : '';
    const kind = key === 'lifetime' ? 'tek seferlik' : `abonelik ${BASE_PLAN_IDS[key]}`;
    console.log(`    ${ids[key].padEnd(28)} ${kind.padEnd(23)} ${regions}${other}`);
  }
}

async function main() {
  const dotenvFile = loadDotEnv(ROOT);
  const args = parseArgs(process.argv.slice(2), {
    flags: ['--dry-run', '--verbose', '--help'],
    options: ['--listing', '--aab'],
  });
  if (args.flags.has('--help')) {
    console.log(USAGE);
    return;
  }
  if (args.positionals.length > 1) throw new Error(`Fazla argüman: ${args.positionals.join(' ')}\n${USAGE}`);

  const dryRun = args.flags.has('--dry-run');
  if (dryRun) blockNetwork();

  const factory = loadFactoryConfig(ROOT);
  const packageName = factory.app.androidPackage;
  const ids = productIds(factory);
  const track = (process.env.PLAY_TRACK || 'internal').trim();
  const aabInput = args.options['--aab'] ?? args.positionals[0] ?? process.env.AAB_PATH ?? '';
  const aabPath = aabInput ? path.resolve(ROOT, aabInput) : '';

  const { file: listingFile, fallback } = resolveListingPath(args.options['--listing'] || process.env.LISTING_PATH, dryRun);
  const { locales, pricing } = loadListing(listingFile, factory);
  const { errors, warnings, todos } = validateListing({ locales, pricing });

  // Gerçek çalıştırmada hata, dry-run'da uyarı olan durumlar
  const blockers = [];
  if (fallback) warnings.push('store-listing/listing.json yok — dry-run için listing.example.json kullanıldı.');
  if (path.basename(listingFile) === 'listing.example.json') blockers.push('Örnek listing dosyası yayına gönderilemez — store-listing/listing.json oluşturun.');
  if (todos.length) blockers.push(`Doldurulmamış (TODO) metinler: ${todos.join(', ')}`);
  if (isTemplatePackage(factory)) blockers.push(`app.androidPackage hâlâ şablon değeri (${packageName}) — factory.config.js'i düzenleyin.`);
  if (!track) errors.push('PLAY_TRACK boş olamaz.');

  if (aabPath) {
    if (!fs.existsSync(aabPath)) errors.push(`AAB bulunamadı: ${aabPath}`);
    else if (!aabPath.toLowerCase().endsWith('.aab')) warnings.push(`AAB uzantısı .aab değil: ${rel(aabPath)}`);
  }

  // Service account: YALNIZCA PLAY_SERVICE_ACCOUNT_JSON
  const saFile = process.env.PLAY_SERVICE_ACCOUNT_JSON ? path.resolve(ROOT, process.env.PLAY_SERVICE_ACCOUNT_JSON) : '';
  let serviceAccount = null;
  let saStatus;
  if (!saFile) {
    saStatus = 'PLAY_SERVICE_ACCOUNT_JSON ayarlı değil';
    blockers.push(
      'PLAY_SERVICE_ACCOUNT_JSON ayarlı değil — service account JSON dosyasının yolunu .env içine veya ortam değişkeni olarak verin (depoya koymayın).'
    );
  } else if (!fs.existsSync(saFile)) {
    saStatus = `dosya yok: ${saFile}`;
    blockers.push(`PLAY_SERVICE_ACCOUNT_JSON dosyası bulunamadı: ${saFile}`);
  } else {
    try {
      serviceAccount = readServiceAccount(saFile);
      saStatus = `${serviceAccount.client_email}`;
    } catch (error) {
      saStatus = 'geçersiz JSON';
      blockers.push(`PLAY_SERVICE_ACCOUNT_JSON geçersiz: ${error.message}`);
    }
  }

  const ctx = {
    factory,
    packageName,
    ids,
    track,
    aabPath,
    listingFile,
    locales,
    pricing,
    saStatus,
    dryRun,
    version: factory.app.version,
    // Dry-run'da başarı mesajları yazılmaz; yalnızca planlanan çağrılar listelenir.
    info: dryRun ? () => {} : (...m) => console.log(...m),
  };
  printSummary(ctx);
  if (dotenvFile) console.log('  (.env yüklendi)');

  if (dryRun) warnings.push(...blockers.map((b) => `[gerçek çalıştırmada hata] ${b}`));
  else errors.push(...blockers);

  for (const w of warnings) console.log(`  ⚠️  ${w}`);
  for (const e of errors) console.log(`  ❌ ${e}`);
  if (errors.length) {
    console.log(`\n${errors.length} hata — hiçbir API çağrısı yapılmadı.`);
    process.exit(1);
  }

  let client;
  if (dryRun) {
    console.log('\nPlanlanan API çağrıları (sıralı; mevcut kayıtlar bilinmediği için hepsi "oluşturulacak" gibi gösterilir):');
    client = createDryRunClient({ verbose: args.flags.has('--verbose') });
  } else {
    console.log(`\n🔐 Service account ile kimlik doğrulanıyor: ${serviceAccount.client_email}`);
    const token = await getAccessToken(serviceAccount);
    console.log('✅ Android Publisher API kimlik doğrulaması tamam.');
    client = createLiveClient(token);
  }

  await setupStoreListingsAndRelease(client, ctx);
  await setupSubscriptions(client, ctx);
  await setupLifetimeInAppProduct(client, ctx);

  console.log(dryRun ? '\nDry-run tamamlandı — hiçbir değişiklik yapılmadı.' : '\n🚀 Google Play kurulumu tamamlandı.');
}

main().catch((err) => {
  console.error('\n❌ Google Play betiği hatası:', err.message);
  process.exit(1);
});
