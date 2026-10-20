#!/usr/bin/env node
/**
 * Mobile Factory — RentLedger Pro RevenueCat Setup Script (API v2)
 */

import fs from 'node:fs';
import path from 'node:path';

const RC_SECRET_KEY = process.env.RC_SECRET_KEY || 'sk_rEhxjPFEgoCwzyncuoHnhzmxyipHU';
const PACKAGE_NAME = 'com.mobilefactory.rentledger';
const APP_NAME = 'RentLedger Android';
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
  console.log('🚀 Connecting to RevenueCat API v2 for RentLedger Pro...');
  const projectsRes = await rcRequest('GET', '/projects');
  const project = (projectsRes.items || [])[0];
  if (!project) throw new Error('No project found in RevenueCat');
  console.log(`✅ Project: ${project.name} (${project.id})`);

  // 1. Get or Create Play Store App
  const appsRes = await rcRequest('GET', `/projects/${project.id}/apps`);
  let playApp = (appsRes.items || []).find(
    (a) => a.type === 'play_store' && a.play_store?.package_name === PACKAGE_NAME
  );

  if (!playApp) {
    console.log(`📦 Creating Play Store App (${PACKAGE_NAME})...`);
    playApp = await rcRequest('POST', `/projects/${project.id}/apps`, {
      name: APP_NAME,
      type: 'play_store',
      play_store: { package_name: PACKAGE_NAME },
    });
  }
  console.log(`✅ Play Store App: ${playApp.name} (${playApp.id})`);

  // 2. Fetch Public API Key
  const keysRes = await rcRequest(
    'GET',
    `/projects/${project.id}/apps/${playApp.id}/public_api_keys`
  );
  const publicKeyObj = (keysRes.items || [])[0];
  const publicKey = publicKeyObj?.key;
  console.log(`🔑 Public Google API Key: ${publicKey}`);

  // 3. Create Products for RentLedger
  const existingProductsRes = await rcRequest(
    'GET',
    `/projects/${project.id}/products?app_id=${playApp.id}`
  );
  const existingProducts = existingProductsRes.items || [];

  const desiredProducts = [
    { store_identifier: 'rentledger_weekly:weekly-base', type: 'subscription', pkgKey: '$rc_weekly', name: 'Weekly' },
    { store_identifier: 'rentledger_monthly:monthly-base', type: 'subscription', pkgKey: '$rc_monthly', name: 'Monthly' },
    { store_identifier: 'rentledger_annual:annual-base', type: 'subscription', pkgKey: '$rc_annual', name: 'Annual' },
    { store_identifier: 'rentledger_lifetime', type: 'one_time', pkgKey: '$rc_lifetime', name: 'Lifetime' },
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
    console.log(`✅ Product: ${prod.store_identifier} (${prod.id})`);
  }

  // 4. Entitlement pro_access
  const entRes = await rcRequest('GET', `/projects/${project.id}/entitlements`);
  let proEnt = (entRes.items || []).find((e) => e.lookup_key === 'pro_access');
  if (!proEnt) {
    proEnt = await rcRequest('POST', `/projects/${project.id}/entitlements`, {
      lookup_key: 'pro_access',
      display_name: 'PRO Access',
    });
  }
  console.log(`✅ Entitlement: ${proEnt.lookup_key} (${proEnt.id})`);

  try {
    await rcRequest(
      'POST',
      `/projects/${project.id}/entitlements/${proEnt.id}/actions/attach_products`,
      { product_ids: Object.values(createdProductsByPkg).map((p) => p.id) }
    );
    console.log('✅ Attached RentLedger products to pro_access');
  } catch (e) {
    console.log('ℹ️ Attachment notice:', e.message);
  }

  // 5. Link to default offering packages
  const offRes = await rcRequest('GET', `/projects/${project.id}/offerings`);
  const defOff = (offRes.items || []).find((o) => o.lookup_key === 'default');
  if (defOff) {
    const pkgRes = await rcRequest(
      'GET',
      `/projects/${project.id}/offerings/${defOff.id}/packages`
    );
    const pkgs = pkgRes.items || [];
    for (const dp of desiredProducts) {
      const pkg = pkgs.find((p) => p.lookup_key === dp.pkgKey);
      if (pkg && createdProductsByPkg[dp.pkgKey]) {
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
          console.log(`✅ Package ${dp.pkgKey} linked to ${dp.store_identifier}`);
        } catch (e) {
          console.log(`ℹ️ Package ${dp.pkgKey} already linked or notice:`, e.message);
        }
      }
    }
  }

  // 6. Write public key to .env and src/services/revenuecat.ts
  if (publicKey) {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    if (envContent.includes('EXPO_PUBLIC_RC_ANDROID_KEY=')) {
      envContent = envContent.replace(/EXPO_PUBLIC_RC_ANDROID_KEY=.*/g, `EXPO_PUBLIC_RC_ANDROID_KEY=${publicKey}`);
    } else {
      envContent += `\nEXPO_PUBLIC_RC_ANDROID_KEY=${publicKey}\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`✅ Saved ${publicKey} to .env`);

    // In src/services/revenuecat.ts
    const rcTsPath = path.join(process.cwd(), 'src/services/revenuecat.ts');
    if (fs.existsSync(rcTsPath)) {
      let rcTs = fs.readFileSync(rcTsPath, 'utf8');
      rcTs = rcTs.replace(/goog_[a-zA-Z0-9_-]+/g, publicKey);
      fs.writeFileSync(rcTsPath, rcTs, 'utf8');
      console.log(`✅ Updated src/services/revenuecat.ts with ${publicKey}`);
    }
  }

  console.log('\n🎉 RentLedger Pro RevenueCat Provisioning Complete!');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
