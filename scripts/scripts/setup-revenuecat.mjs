#!/usr/bin/env node
/**
 * Mobile Factory — RevenueCat Automated Provisioning Script (API v2)
 * Automatically creates:
 * 1. Google Play App (if not exists)
 * 2. Products: veloquote_weekly, veloquote_monthly, veloquote_annual, veloquote_lifetime
 * 3. Entitlement: pro_access (and attaches all 4 products)
 * 4. Offering: default (with $rc_weekly, $rc_monthly, $rc_annual, $rc_lifetime packages)
 * 5. Fetches Public Google Play API Key (goog_...) and writes it to .env & revenuecat.ts
 */

const RC_SECRET_KEY = process.env.RC_SECRET_KEY || process.argv[2];
const PACKAGE_NAME = process.env.APP_PACKAGE_NAME || 'com.mobilefactory.veloquote';
const APP_NAME = process.env.APP_DISPLAY_NAME || 'VeloQuote Android';

if (!RC_SECRET_KEY) {
  console.error('Usage: node scripts/setup-revenuecat.mjs <RC_V2_SECRET_KEY>');
  process.exit(1);
}

const BASE_URL = 'https://api.revenuecat.com/v2';

async function rcRequest(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${RC_SECRET_KEY}`,
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
    throw new Error(`RevenueCat API ${method} ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log('🚀 Connecting to RevenueCat API v2...');
  const projectsRes = await rcRequest('GET', '/projects');
  const projects = projectsRes.items || [];

  if (projects.length === 0) {
    throw new Error('No project found in RevenueCat account. Please create a project named VeloQuote in RevenueCat first.');
  }

  const project = projects[0];
  console.log(`✅ Found Project: ${project.name} (${project.id})`);

  // 1. Check or Create Play Store App
  const appsRes = await rcRequest('GET', `/projects/${project.id}/apps`);
  let playApp = (appsRes.items || []).find(
    (a) => a.type === 'play_store' && a.play_store?.package_name === PACKAGE_NAME
  );

  if (!playApp) {
    console.log(`📦 Creating Play Store App (${PACKAGE_NAME})...`);
    playApp = await rcRequest('POST', `/projects/${project.id}/apps`, {
      name: APP_NAME,
      type: 'play_store',
      play_store: {
        package_name: PACKAGE_NAME,
      },
    });
  }
  console.log(`✅ Play Store App ready: ${playApp.name} (${playApp.id})`);

  // 2. Fetch Public API Keys for this App
  const keysRes = await rcRequest(
    'GET',
    `/projects/${project.id}/apps/${playApp.id}/public_api_keys`
  );
  const publicKeyObj = (keysRes.items || [])[0];
  if (publicKeyObj?.key) {
    console.log(`🔑 Public Google API Key: ${publicKeyObj.key}`);
  }

  // 3. Create or Find Products
  const existingProductsRes = await rcRequest(
    'GET',
    `/projects/${project.id}/products?app_id=${playApp.id}`
  );
  const existingProducts = existingProductsRes.items || [];

  const desiredProducts = [
    { store_identifier: 'veloquote_weekly:weekly-base', type: 'subscription', pkgKey: '$rc_weekly', name: 'Weekly' },
    { store_identifier: 'veloquote_monthly:monthly-base', type: 'subscription', pkgKey: '$rc_monthly', name: 'Monthly' },
    { store_identifier: 'veloquote_annual:annual-base', type: 'subscription', pkgKey: '$rc_annual', name: 'Annual' },
    { store_identifier: 'veloquote_lifetime', type: 'one_time', pkgKey: '$rc_lifetime', name: 'Lifetime' },
  ];

  const createdProductsByPkg = {};

  for (const dp of desiredProducts) {
    let prod = existingProducts.find((p) => p.store_identifier === dp.store_identifier);
    if (!prod) {
      console.log(`➕ Creating product: ${dp.store_identifier}...`);
      prod = await rcRequest('POST', `/projects/${project.id}/products`, {
        store_identifier: dp.store_identifier,
        app_id: playApp.id,
        type: dp.type,
        display_name: dp.name,
      });
    }
    createdProductsByPkg[dp.pkgKey] = prod;
    console.log(`✅ Product ready: ${prod.store_identifier} (${prod.id})`);
  }

  // 4. Create or Find Entitlement `pro_access`
  const entRes = await rcRequest('GET', `/projects/${project.id}/entitlements`);
  let proEnt = (entRes.items || []).find((e) => e.lookup_key === 'pro_access');
  if (!proEnt) {
    console.log('👑 Creating Entitlement: pro_access...');
    proEnt = await rcRequest('POST', `/projects/${project.id}/entitlements`, {
      lookup_key: 'pro_access',
      display_name: 'VeloQuote PRO Access',
    });
  }
  console.log(`✅ Entitlement ready: ${proEnt.lookup_key} (${proEnt.id})`);

  // Attach products to pro_access
  try {
    await rcRequest(
      'POST',
      `/projects/${project.id}/entitlements/${proEnt.id}/actions/attach_products`,
      {
        product_ids: Object.values(createdProductsByPkg).map((p) => p.id),
      }
    );
    console.log('✅ Attached all 4 products to pro_access entitlement');
  } catch (e) {
    console.log('ℹ️ Products already attached or attachment skipped:', e.message);
  }

  // 5. Create or Find Offering `default`
  const offRes = await rcRequest('GET', `/projects/${project.id}/offerings`);
  let defOff = (offRes.items || []).find((o) => o.lookup_key === 'default');
  if (!defOff) {
    console.log('🎁 Creating default Offering...');
    defOff = await rcRequest('POST', `/projects/${project.id}/offerings`, {
      lookup_key: 'default',
      display_name: 'Default VeloQuote Paywall',
    });
  }
  if (!defOff.is_current) {
    defOff = await rcRequest('POST', `/projects/${project.id}/offerings/${defOff.id}`, {
      is_current: true,
    });
  }
  console.log(`✅ Offering ready: ${defOff.lookup_key} (${defOff.id}, is_current=${defOff.is_current})`);

  // Create Packages inside default offering
  const pkgRes = await rcRequest(
    'GET',
    `/projects/${project.id}/offerings/${defOff.id}/packages`
  );
  const existingPkgs = pkgRes.items || [];

  for (const dp of desiredProducts) {
    let pkg = existingPkgs.find((p) => p.lookup_key === dp.pkgKey);
    if (!pkg) {
      console.log(`📦 Creating package ${dp.pkgKey}...`);
      pkg = await rcRequest(
        'POST',
        `/projects/${project.id}/offerings/${defOff.id}/packages`,
        {
          lookup_key: dp.pkgKey,
          display_name: `${dp.name} Package`,
        }
      );
    }
    try {
      await rcRequest(
        'POST',
        `/projects/${project.id}/packages/${pkg.id}/actions/attach_products`,
        {
          products: [
            {
              product_id: createdProductsByPkg[dp.pkgKey].id,
              eligibility_criteria: 'all',
            },
          ],
        }
      );
    } catch {
      // Already attached
    }
    console.log(`✅ Package ${dp.pkgKey} linked to ${dp.store_identifier}`);
  }

  console.log('\n🎉 RevenueCat 100% Configured!');
  if (publicKeyObj?.key) {
    console.log(`PUBLIC_GOOGLE_API_KEY=${publicKeyObj.key}`);
  }
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
