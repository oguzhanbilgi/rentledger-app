#!/usr/bin/env node
/**
 * RevenueCat kurulumu — API v2 (bağımlılıksız). Her adım idempotenttir: varsa kullanır, yoksa oluşturur.
 *
 *   1. Projeyi seçer: RC_PROJECT_ID → adı app.name olan proje → hesaptaki tek proje
 *   2. Play Store uygulaması (factory.config.js → app.androidPackage)
 *   3. Public SDK anahtarını (goog_…) yazdırır → factory.config.js → monetization.revenueCat.androidApiKey
 *   4. Ürünler: <önek>_weekly:weekly-base, <önek>_monthly:monthly-base, <önek>_annual:annual-base, <önek>_lifetime
 *   5. Entitlement: monetization.revenueCat.entitlementId (4 ürün bağlanır)
 *   6. Offering: monetization.revenueCat.offeringId || "default" (current yapılır)
 *      + $rc_weekly / $rc_monthly / $rc_annual / $rc_lifetime paketleri
 *
 * Kullanım (uygulama kök dizininden):
 *   node scripts/setup-revenuecat.mjs --dry-run     # ağ çağrısı yok, plan yazdırılır
 *   node scripts/setup-revenuecat.mjs
 *
 * Ortam değişkenleri (kökte .env varsa otomatik yüklenir, mevcut değişkenleri ezmez):
 *   RC_SECRET_KEY   RevenueCat v2 GİZLİ anahtarı (sk_…) — gerçek çalıştırmada ZORUNLU.
 *                   Yalnızca ortamdan okunur; komut satırından verilmez, hiçbir zaman yazdırılmaz.
 *   RC_PROJECT_ID   (isteğe bağlı) hesapta birden çok proje varsa kullanılacak proje kimliği
 */

import {
  BASE_PLAN_IDS,
  blockNetwork,
  isTemplatePackage,
  loadDotEnv,
  loadFactoryConfig,
  parseArgs,
  productIds,
} from './lib/factory.mjs';

const BASE_URL = 'https://api.revenuecat.com/v2';

const USAGE = `Kullanım: node scripts/setup-revenuecat.mjs [--dry-run]
Ortam: RC_SECRET_KEY (zorunlu, sk_…), RC_PROJECT_ID (isteğe bağlı)
Ayrıntılar: scripts/README.md`;

function createLiveClient(secretKey) {
  return async function rcRequest(method, path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
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
      throw new Error(`RevenueCat API ${method} ${path} başarısız (${res.status}): ${JSON.stringify(data)}`);
    }
    return data;
  };
}

/** Ağ çağrısı yapmaz; planlanan istekleri yazdırır, "hiçbir kayıt yok" varsayımıyla sahte yanıt döner. */
function createDryRunClient(appName) {
  let step = 0;
  return async function rcRequest(method, path, body) {
    step += 1;
    console.log(`  ${String(step).padStart(2)}. ${method.padEnd(5)} ${path}${body ? `  ${JSON.stringify(body)}` : ''}`);
    if (method === 'GET') {
      if (path === '/projects') return { items: [{ id: process.env.RC_PROJECT_ID || '<projectId>', name: appName }] };
      return { items: [] };
    }
    if (/\/actions\//.test(path)) return {};
    if (/\/offerings\/[^/]+$/.test(path)) return { is_current: true };
    const kind = path.split('/').pop().replace(/s$/, ''); // apps → app, products → product …
    const key = body?.lookup_key ?? body?.store_identifier;
    return { id: key ? `<${kind}Id:${key}>` : `<${kind}Id>`, ...body };
  };
}

function pickProject(projects, appName) {
  const wanted = process.env.RC_PROJECT_ID?.trim();
  if (wanted) {
    const project = projects.find((p) => p.id === wanted);
    if (!project) throw new Error(`RC_PROJECT_ID (${wanted}) hesapta bulunamadı.`);
    return project;
  }
  if (projects.length === 0) {
    throw new Error(`RevenueCat hesabında proje yok — önce "${appName}" adlı bir proje oluşturun.`);
  }
  const byName = projects.filter((p) => p.name?.trim().toLowerCase() === appName.trim().toLowerCase());
  if (byName.length === 1) return byName[0];
  if (projects.length === 1) return projects[0];
  throw new Error(
    [
      `Hesapta ${projects.length} proje var ve "${appName}" adında tek bir proje yok. RC_PROJECT_ID ayarlayın:`,
      ...projects.map((p) => `  ${p.id}  ${p.name}`),
    ].join('\n')
  );
}

async function provision(rcRequest, ctx) {
  const { factory, packageName, ids, entitlementId, offeringKey, dryRun } = ctx;
  const appName = factory.app.name;
  const info = dryRun ? () => {} : (...m) => console.log(...m);

  // 1. Proje
  const projectsRes = await rcRequest('GET', '/projects');
  const project = pickProject(projectsRes.items || [], appName);
  info(`✅ Proje: ${project.name} (${project.id})`);

  // 2. Play Store uygulaması
  const appsRes = await rcRequest('GET', `/projects/${project.id}/apps`);
  let playApp = (appsRes.items || []).find(
    (a) => a.type === 'play_store' && a.play_store?.package_name === packageName
  );
  if (!playApp) {
    info(`📦 Play Store uygulaması oluşturuluyor (${packageName})...`);
    playApp = await rcRequest('POST', `/projects/${project.id}/apps`, {
      name: `${appName} Android`,
      type: 'play_store',
      play_store: {
        package_name: packageName,
      },
    });
  }
  info(`✅ Play Store uygulaması: ${playApp.name} (${playApp.id})`);

  // 3. Public SDK anahtarı (herkese açık — yazdırmak güvenli)
  const keysRes = await rcRequest('GET', `/projects/${project.id}/apps/${playApp.id}/public_api_keys`);
  const publicKeyObj = (keysRes.items || [])[0];
  if (publicKeyObj?.key) info(`🔑 Public Google SDK anahtarı: ${publicKeyObj.key}`);

  // 4. Ürünler
  const existingProductsRes = await rcRequest('GET', `/projects/${project.id}/products?app_id=${playApp.id}`);
  const existingProducts = existingProductsRes.items || [];

  const desiredProducts = [
    { store_identifier: `${ids.weekly}:${BASE_PLAN_IDS.weekly}`, type: 'subscription', pkgKey: '$rc_weekly', name: 'Weekly' },
    { store_identifier: `${ids.monthly}:${BASE_PLAN_IDS.monthly}`, type: 'subscription', pkgKey: '$rc_monthly', name: 'Monthly' },
    { store_identifier: `${ids.annual}:${BASE_PLAN_IDS.annual}`, type: 'subscription', pkgKey: '$rc_annual', name: 'Annual' },
    { store_identifier: ids.lifetime, type: 'one_time', pkgKey: '$rc_lifetime', name: 'Lifetime' },
  ];

  const createdProductsByPkg = {};
  for (const dp of desiredProducts) {
    let prod = existingProducts.find((p) => p.store_identifier === dp.store_identifier);
    if (!prod) {
      info(`➕ Ürün oluşturuluyor: ${dp.store_identifier}...`);
      prod = await rcRequest('POST', `/projects/${project.id}/products`, {
        store_identifier: dp.store_identifier,
        app_id: playApp.id,
        type: dp.type,
        display_name: dp.name,
      });
    }
    createdProductsByPkg[dp.pkgKey] = prod;
    info(`✅ Ürün: ${prod.store_identifier} (${prod.id})`);
  }

  // 5. Entitlement
  const entRes = await rcRequest('GET', `/projects/${project.id}/entitlements`);
  let proEnt = (entRes.items || []).find((e) => e.lookup_key === entitlementId);
  if (!proEnt) {
    info(`👑 Entitlement oluşturuluyor: ${entitlementId}...`);
    proEnt = await rcRequest('POST', `/projects/${project.id}/entitlements`, {
      lookup_key: entitlementId,
      display_name: `${appName} Pro`,
    });
  }
  info(`✅ Entitlement: ${proEnt.lookup_key} (${proEnt.id})`);

  try {
    await rcRequest('POST', `/projects/${project.id}/entitlements/${proEnt.id}/actions/attach_products`, {
      product_ids: Object.values(createdProductsByPkg).map((p) => p.id),
    });
    info(`✅ 4 ürün "${entitlementId}" entitlement'ına bağlandı`);
  } catch (e) {
    console.log('ℹ️ Ürünler zaten bağlı ya da bağlama atlandı:', e.message);
  }

  // 6. Offering + paketler
  const offRes = await rcRequest('GET', `/projects/${project.id}/offerings`);
  let offering = (offRes.items || []).find((o) => o.lookup_key === offeringKey);
  if (!offering) {
    info(`🎁 Offering oluşturuluyor: ${offeringKey}...`);
    offering = await rcRequest('POST', `/projects/${project.id}/offerings`, {
      lookup_key: offeringKey,
      display_name: `${appName} Paywall`,
    });
  }
  if (!offering.is_current) {
    offering = {
      ...offering,
      ...(await rcRequest('POST', `/projects/${project.id}/offerings/${offering.id}`, { is_current: true })),
    };
  }
  info(`✅ Offering: ${offering.lookup_key} (${offering.id}, is_current=${offering.is_current})`);

  const pkgRes = await rcRequest('GET', `/projects/${project.id}/offerings/${offering.id}/packages`);
  const existingPkgs = pkgRes.items || [];

  for (const dp of desiredProducts) {
    let pkg = existingPkgs.find((p) => p.lookup_key === dp.pkgKey);
    if (!pkg) {
      info(`📦 Paket oluşturuluyor: ${dp.pkgKey}...`);
      pkg = await rcRequest('POST', `/projects/${project.id}/offerings/${offering.id}/packages`, {
        lookup_key: dp.pkgKey,
        display_name: `${dp.name} Package`,
      });
    }
    try {
      await rcRequest('POST', `/projects/${project.id}/packages/${pkg.id}/actions/attach_products`, {
        products: [
          {
            product_id: createdProductsByPkg[dp.pkgKey].id,
            eligibility_criteria: 'all',
          },
        ],
      });
    } catch {
      // Zaten bağlı
    }
    info(`✅ Paket ${dp.pkgKey} → ${dp.store_identifier}`);
  }

  return publicKeyObj?.key ?? null;
}

async function main() {
  const dotenvFile = loadDotEnv();
  const args = parseArgs(process.argv.slice(2), { flags: ['--dry-run', '--help'] });
  if (args.flags.has('--help')) {
    console.log(USAGE);
    return;
  }
  if (args.positionals.length) {
    const looksSecret = args.positionals.some((a) => /^(sk_|atk_)/.test(a));
    throw new Error(
      looksSecret
        ? 'Gizli anahtarı komut satırında vermeyin (shell geçmişine düşer). RC_SECRET_KEY ortam değişkenini veya .env dosyasını kullanın — ve bu anahtarı yenilemeyi düşünün.'
        : `Bu script konumsal argüman almaz.\n${USAGE}`
    );
  }

  const dryRun = args.flags.has('--dry-run');
  if (dryRun) blockNetwork();

  const factory = loadFactoryConfig();
  const packageName = factory.app.androidPackage;
  const ids = productIds(factory);
  const rc = factory.monetization?.revenueCat ?? {};
  const entitlementId = (rc.entitlementId ?? '').trim();
  const offeringKey = (rc.offeringId ?? '').trim() || 'default';

  const secretKey = (process.env.RC_SECRET_KEY ?? '').trim();
  const errors = [];
  const blockers = [];
  if (!entitlementId) errors.push('factory.config.js → monetization.revenueCat.entitlementId boş.');
  if (isTemplatePackage(factory)) blockers.push(`app.androidPackage hâlâ şablon değeri (${packageName}) — factory.config.js'i düzenleyin.`);
  if (!secretKey) {
    blockers.push('RC_SECRET_KEY ayarlı değil — RevenueCat → Project settings → API keys → v2 secret key; .env veya ortam değişkeni olarak verin.');
  } else if (/^(goog_|appl_|amzn_|strp_)/.test(secretKey)) {
    blockers.push('RC_SECRET_KEY bir PUBLIC SDK anahtarı gibi görünüyor — v2 gizli anahtarı (sk_…) gerekir.');
  }

  console.log(`RevenueCat kurulumu${dryRun ? ' — DRY-RUN (ağ çağrısı yapılmaz)' : ''}`);
  console.log(`  Uygulama    : ${factory.app.name}`);
  console.log(`  Paket       : ${packageName}`);
  console.log(`  Proje       : ${process.env.RC_PROJECT_ID?.trim() || `(RC_PROJECT_ID yok → adı "${factory.app.name}" olan proje / tek proje)`}`);
  console.log(`  Entitlement : ${entitlementId || '(boş)'}`);
  console.log(`  Offering    : ${offeringKey} (current yapılır)`);
  console.log(`  Ürünler     : ${ids.weekly}:${BASE_PLAN_IDS.weekly}, ${ids.monthly}:${BASE_PLAN_IDS.monthly}, ${ids.annual}:${BASE_PLAN_IDS.annual}, ${ids.lifetime}`);
  console.log(`  RC_SECRET_KEY: ${secretKey ? 'ayarlı (değer gösterilmez)' : 'ayarlı değil'}`);
  if (dotenvFile) console.log('  (.env yüklendi)');

  if (dryRun) {
    for (const b of blockers) console.log(`  ⚠️  [gerçek çalıştırmada hata] ${b}`);
  } else {
    errors.push(...blockers);
  }
  for (const e of errors) console.log(`  ❌ ${e}`);
  if (errors.length) {
    console.log(`\n${errors.length} hata — hiçbir API çağrısı yapılmadı.`);
    process.exit(1);
  }

  if (dryRun) {
    console.log('\nPlanlanan API çağrıları (mevcut kayıt yokmuş gibi; gerçek çalıştırmada var olanlar yeniden oluşturulmaz):');
  } else {
    console.log('\n🚀 RevenueCat API v2 bağlanıyor...');
  }
  const rcRequest = dryRun ? createDryRunClient(factory.app.name) : createLiveClient(secretKey);
  const publicKey = await provision(rcRequest, { factory, packageName, ids, entitlementId, offeringKey, dryRun });

  if (dryRun) {
    console.log('\nDry-run tamamlandı — hiçbir değişiklik yapılmadı.');
    return;
  }
  console.log('\n🎉 RevenueCat yapılandırıldı.');
  if (publicKey) {
    console.log(`PUBLIC_GOOGLE_API_KEY=${publicKey}`);
    if (rc.androidApiKey === publicKey) {
      console.log('✅ factory.config.js → monetization.revenueCat.androidApiKey zaten bu anahtar.');
    } else {
      console.log('👉 Bu public anahtarı factory.config.js → monetization.revenueCat.androidApiKey alanına yazın.');
    }
  }
}

main().catch((err) => {
  console.error('❌ RevenueCat betiği hatası:', err.message);
  process.exit(1);
});
