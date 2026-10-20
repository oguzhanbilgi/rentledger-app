#!/usr/bin/env node
/**
 * ============================================================================
 * MOBILE FACTORY — RENTLEDGER PRO GOOGLE PLAY CONSOLE AUTOMATION BOT
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SERVICE_ACCOUNT_PATH =
  process.env.PLAY_SERVICE_ACCOUNT_JSON ||
  process.argv[2] ||
  'D:\\MobileFactory\\play-service-account.json';

const PACKAGE_NAME = process.env.APP_PACKAGE_NAME || 'com.mobilefactory.rentledger';
const AAB_PATH =
  process.env.AAB_PATH ||
  path.join(process.cwd(), 'rentledger-production.aab');

const API_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const UPLOAD_BASE = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3';

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
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

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload)
  )}`;
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
    throw new Error(`OAuth2 Token Error: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function playApi(token, method, endpoint, body, queryParams = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(queryParams)) {
    if (v !== undefined) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
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
    const err = new Error(
      `Play API ${method} ${endpoint} failed (${res.status}): ${JSON.stringify(data)}`
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function uploadAabBundle(token, editId, filePath) {
  console.log(`📦 Uploading AAB Bundle from: ${filePath}...`);
  const fileStream = fs.readFileSync(filePath);
  const uploadUrl = `${UPLOAD_BASE}/applications/${PACKAGE_NAME}/edits/${editId}/bundles?uploadType=media`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(fileStream.length),
    },
    body: fileStream,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`AAB Upload failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function setupSubscriptions(token) {
  console.log('\n💳 Configuring RentLedger Subscriptions in Google Play Console...');

  const subs = [
    {
      productId: 'rentledger_weekly',
      basePlanId: 'weekly-base',
      billingPeriodDuration: 'P1W',
      titleTr: 'RentLedger Haftalık Başlangıç',
      titleEn: 'RentLedger Weekly Starter',
      descTr: 'Sınırsız mülk & kiracı, filigransız resmi PDF kira makbuzu ve reklamsız kullanım.',
      descEn: 'Unlimited properties & tenants, watermark-free official PDF receipts, and ad-free experience.',
      priceTryUnits: '79',
      priceTryNanos: 990000000,
      priceUsdUnits: '2',
      priceUsdNanos: 990000000,
    },
    {
      productId: 'rentledger_monthly',
      basePlanId: 'monthly-base',
      billingPeriodDuration: 'P1M',
      titleTr: 'RentLedger Aylık Pro Paket',
      titleEn: 'RentLedger Monthly Pro Plan',
      descTr: 'Her ay sınırsız mülk & kiracı, yasal geçerli PDF kira makbuzu ve reklamsız kullanım.',
      descEn: 'Monthly unlimited properties & tenants, official rent receipts, and ad-free.',
      priceTryUnits: '199',
      priceTryNanos: 990000000,
      priceUsdUnits: '6',
      priceUsdNanos: 990000000,
    },
    {
      productId: 'rentledger_annual',
      basePlanId: 'annual-base',
      billingPeriodDuration: 'P1Y',
      titleTr: 'RentLedger Yıllık Pro Paket',
      titleEn: 'RentLedger Annual Pro Plan',
      descTr: '%75 indirimli yıllık sınırsız mülk kaydı, resmi kira makbuzu ve reklamsız kullanım.',
      descEn: '75% off annual unlimited property management, official rent receipts, and ad-free.',
      priceTryUnits: '799',
      priceTryNanos: 990000000,
      priceUsdUnits: '24',
      priceUsdNanos: 990000000,
    },
  ];

  for (const s of subs) {
    const subscriptionBody = {
      packageName: PACKAGE_NAME,
      productId: s.productId,
      listings: [
        {
          languageCode: 'tr-TR',
          title: s.titleTr,
          description: s.descTr,
          benefits: [
            'Sınırsız Mülk & Kiracı Kaydı',
            'Filigransız Resmi PDF Kira Makbuzu',
            'Tamamen Reklamsız Kullanım Deneyimi',
          ],
        },
        {
          languageCode: 'en-US',
          title: s.titleEn,
          description: s.descEn,
          benefits: [
            'Unlimited Properties & Tenants',
            'Official Watermark-Free Receipts',
            '100% Ad-Free Experience',
          ],
        },
      ],
      basePlans: [
        {
          basePlanId: s.basePlanId,
          autoRenewingBasePlanType: {
            billingPeriodDuration: s.billingPeriodDuration,
            gracePeriodDuration: 'P3D',
            resubscribeState: 'RESUBSCRIBE_STATE_ACTIVE',
          },
          regionalConfigs: [
            {
              regionCode: 'TR',
              newSubscriberAvailability: true,
              price: {
                currencyCode: 'TRY',
                units: s.priceTryUnits,
                nanos: s.priceTryNanos,
              },
            },
            {
              regionCode: 'US',
              newSubscriberAvailability: true,
              price: {
                currencyCode: 'USD',
                units: s.priceUsdUnits,
                nanos: s.priceUsdNanos,
              },
            },
          ],
          otherRegionsConfig: {
            usdPrice: {
              currencyCode: 'USD',
              units: s.priceUsdUnits,
              nanos: s.priceUsdNanos,
            },
            eurPrice: {
              currencyCode: 'EUR',
              units: s.priceUsdUnits,
              nanos: s.priceUsdNanos,
            },
            newSubscriberAvailability: true,
          },
        },
      ],
    };

    try {
      await playApi(
        token,
        'POST',
        `/applications/${PACKAGE_NAME}/subscriptions`,
        subscriptionBody,
        {
          productId: s.productId,
          'regionsVersion.version': '2022/02',
        }
      );
      console.log(`✅ Created Subscription: ${s.productId}`);
    } catch (e) {
      if (e.status === 409 || String(e.message).includes('ALREADY_EXISTS')) {
        console.log(`ℹ️ Subscription ${s.productId} already exists, updating...`);
        await playApi(
          token,
          'PATCH',
          `/applications/${PACKAGE_NAME}/subscriptions/${s.productId}`,
          subscriptionBody,
          {
            updateMask: 'listings,basePlans',
            'regionsVersion.version': '2022/02',
          }
        );
      } else {
        console.warn(`⚠️ Subscription ${s.productId} warning:`, e.message);
      }
    }

    // Activate Base Plan
    try {
      await playApi(
        token,
        'POST',
        `/applications/${PACKAGE_NAME}/subscriptions/${s.productId}/basePlans/${s.basePlanId}:activate`,
        {}
      );
      console.log(`✅ Activated Base Plan: ${s.productId}:${s.basePlanId}`);
    } catch (e) {
      console.log(`ℹ️ Base plan activation status (${s.basePlanId}):`, e.message);
    }
  }
}

async function setupLifetimeInAppProduct(token) {
  console.log('\n💎 Configuring One-Time Lifetime Product (rentledger_lifetime)...');
  const sku = 'rentledger_lifetime';
  const inAppBody = {
    packageName: PACKAGE_NAME,
    sku,
    status: 'active',
    purchaseType: 'managedUser',
    defaultPrice: {
      currency: 'USD',
      priceMicros: '79990000',
    },
    prices: {
      TR: {
        currency: 'TRY',
        priceMicros: '1499990000',
      },
    },
    listings: {
      'en-US': {
        title: 'RentLedger Lifetime Unlimited',
        description: 'One-time payment for lifetime ad-free, unlimited properties & receipts.',
      },
      'tr-TR': {
        title: 'RentLedger Ömür Boyu Sınırsız',
        description: 'Tek seferlik ödeme ile ömür boyu reklamsız ve sınırsız mülk & kira makbuzu.',
      },
    },
    defaultLanguage: 'en-US',
  };

  try {
    try {
      await playApi(token, 'POST', `/applications/${PACKAGE_NAME}/inappproducts`, inAppBody);
      console.log('✅ Created In-App Product: rentledger_lifetime');
    } catch (e) {
      if (e.status === 409 || e.message?.includes('already exists') || e.message?.includes('400')) {
        await playApi(token, 'PUT', `/applications/${PACKAGE_NAME}/inappproducts/${sku}`, inAppBody);
        console.log('✅ Updated In-App Product: rentledger_lifetime');
      } else {
        throw e;
      }
    }
  } catch (e) {
    console.warn('⚠️ Lifetime product warning:', e.message);
  }
}

async function setupStoreListingsAndRelease(token) {
  console.log('\n📝 Opening Google Play Edit Session...');
  const edit = await playApi(token, 'POST', `/applications/${PACKAGE_NAME}/edits`, {});
  const editId = edit.id;
  console.log(`✅ Edit Session ID: ${editId}`);

  const listingMd = fs.readFileSync(
    path.join(process.cwd(), 'store-listing', 'PLAY_STORE_LISTING_TR_EN.md'),
    'utf8'
  );

  const listings = [
    {
      lang: 'en-US',
      title: 'RentLedger: Rent & Tenant Book',
      shortDescription: 'Track rent payments, tenants, overdue alerts and generate official PDF receipts.',
      fullDescription: `RentLedger Pro is the ultimate property management and rent tracking app designed for landlords, real estate investors, and property managers.

Ditch complex spreadsheets and lost paper slips! Record rent collections in 15 seconds, generate official PDF Rent Payment Receipts, send 1-tap WhatsApp rent reminders with payment info, and keep total control over your rental cashflow.

KEY FEATURES:
• Track apartments, commercial shops, and houses in one place
• 15-second rent collection entry (Bank Transfer, Cash, Card, Check)
• Official A4 format rent payment receipts with bank & signature boxes
• Overdue rent alerts and polite 1-tap WhatsApp rent reminder messages
• Monthly collected rent, pending rent, and collection percentage analytics
• Multi-currency support ($, ₺, €, £) & Bilingual (EN/TR) support
• 100% Private & Offline-first with local SQLite storage.`,
    },
    {
      lang: 'tr-TR',
      title: 'RentLedger: Kira Takip Makbuz',
      shortDescription: 'Kiracı ve kira takibi, resmi PDF kira makbuzu ve 1 tıkla WhatsApp hatırlatma.',
      fullDescription: `Ev sahipleri, mülk yöneticileri ve gayrimenkul sahipleri için tasarlanan RentLedger Pro, daire, dükkan ve konutlarınızın kira gelirlerini, kiracı ödemelerini ve gecikmiş alacaklarını tek bir yerden kolayca takip etmenizi sağlar.

Excel tabloları ve kaybolan kağıt makbuzlar yerine; 15 saniyede kira tahsilatını kaydedin, yasal geçerliliğe uygun Türkçe ve İngilizce A4 PDF Kira Tahsilat Makbuzu oluşturun ve doğrudan kiracınıza WhatsApp veya e-posta ile gönderin!

ÖNE ÇIKAN GÜÇLÜ ÖZELLİKLER:
• Tüm daire, iş yeri ve konutlarınızı tek ekranda listeleyin
• 15 saniyede kira tahsilatı kaydedin (Havale/EFT, Nakit, Kart, Çek)
• Türk Borçlar Kanunu'na uygun resmi A4 PDF Kira Tahsilat Makbuzu
• Tutarı otomatik yazıya çevirme (Örn: On Sekiz Bin Türk Lirası)
• Ev Sahibi IBAN ve Kaşe/İmza ile Kiracı İmza Alanları
• Geciken kiralar için tek tıkla profesyonel WhatsApp ödeme hatırlatıcı mesajı
• Aylık toplam tahsilat ve geciken alacak finansal dashboard özeti
• Çoklu para birimi desteği (₺ TRY, $ USD, € EUR, £ GBP)
• %100 Çevrimdışı (Offline) ve cihazınızda güvenli yerel SQLite veritabanı.`,
    },
  ];

  for (const l of listings) {
    await playApi(
      token,
      'PUT',
      `/applications/${PACKAGE_NAME}/edits/${editId}/listings/${l.lang}`,
      {
        language: l.lang,
        title: l.title,
        shortDescription: l.shortDescription,
        fullDescription: l.fullDescription,
      }
    );
    console.log(`✅ Updated Store Listing (${l.lang})`);

    // Upload Store Graphics
    const graphicsDir = path.join(process.cwd(), 'store-listing', 'graphics');
    if (fs.existsSync(graphicsDir)) {
      const uploadImage = async (imageType, filePath) => {
        const buf = fs.readFileSync(filePath);
        const res = await fetch(
          `${UPLOAD_BASE}/applications/${PACKAGE_NAME}/edits/${editId}/listings/${l.lang}/${imageType}?uploadType=media`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'image/png',
              'Content-Length': String(buf.length),
            },
            body: buf,
          }
        );
        if (!res.ok) {
          const errTxt = await res.text();
          console.warn(`⚠️ Image upload (${imageType}) warning:`, errTxt);
        }
      };

      for (const imgType of ['phoneScreenshots', 'sevenInchScreenshots', 'tenInchScreenshots']) {
        try {
          await playApi(
            token,
            'DELETE',
            `/applications/${PACKAGE_NAME}/edits/${editId}/listings/${l.lang}/${imgType}`
          );
        } catch {}
      }

      const iconPath = path.join(graphicsDir, 'icon-512.png');
      const fgPath = path.join(graphicsDir, 'feature-graphic-1024x500.png');
      if (fs.existsSync(iconPath)) await uploadImage('icon', iconPath);
      if (fs.existsSync(fgPath)) await uploadImage('featureGraphic', fgPath);

      for (let i = 1; i <= 4; i++) {
        const ssPath = path.join(graphicsDir, `screenshot-${i}.png`);
        if (fs.existsSync(ssPath)) {
          await uploadImage('phoneScreenshots', ssPath);
        }
      }

      for (let i = 1; i <= 2; i++) {
        const tabPath = path.join(graphicsDir, `tablet-${i}.png`);
        if (fs.existsSync(tabPath)) {
          await uploadImage('sevenInchScreenshots', tabPath);
          await uploadImage('tenInchScreenshots', tabPath);
        }
      }
      console.log(`🖼️ Uploaded 3D Store Icon, Feature Graphic, 4 Phone & 2 Tablet Screenshots (${l.lang})`);
    }
  }

  // Upload AAB if available
  const existingBundlesRes = await playApi(
    token,
    'GET',
    `/applications/${PACKAGE_NAME}/edits/${editId}/bundles`
  );
  const existingBundles = existingBundlesRes?.bundles || [];
  let targetVersionCode = existingBundles.length
    ? existingBundles[existingBundles.length - 1].versionCode
    : null;

  if (!targetVersionCode && fs.existsSync(AAB_PATH)) {
    const bundle = await uploadAabBundle(token, editId, AAB_PATH);
    targetVersionCode = bundle.versionCode;
    console.log(`✅ Uploaded AAB Bundle! VersionCode: ${targetVersionCode}`);
  } else if (targetVersionCode) {
    console.log(`✅ Found existing AAB Bundle in Play Console! VersionCode: ${targetVersionCode}`);
  }

  if (targetVersionCode) {
    const targetTrack = process.env.PLAY_TRACK || 'internal';
    await playApi(
      token,
      'PUT',
      `/applications/${PACKAGE_NAME}/edits/${editId}/tracks/${targetTrack}`,
      {
        track: targetTrack,
        releases: [
          {
            name: `1.0.0 (${targetVersionCode})`,
            versionCodes: [String(targetVersionCode)],
            status: 'draft',
            releaseNotes: [
              {
                language: 'tr-TR',
                text: 'RentLedger Pro v1.0.0 — Mülk ve kiracı takibi, resmi PDF kira makbuzu ve 1 tıkla WhatsApp hatırlatıcı.',
              },
              {
                language: 'en-US',
                text: 'RentLedger Pro v1.0.0 — Property & tenant tracker, official PDF rent payment receipts, and WhatsApp reminders.',
              },
            ],
          },
        ],
      }
    );
    console.log(`✅ Assigned VersionCode ${targetVersionCode} to '${targetTrack}' track!`);
  }

  await playApi(token, 'POST', `/applications/${PACKAGE_NAME}/edits/${editId}:commit`, {});
  console.log('🎉 Google Play Edit Committed Successfully!');
}

async function main() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`❌ Service Account JSON not found at: ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  console.log(`🔐 Authenticating as Service Account: ${serviceAccount.client_email}`);
  const token = await getAccessToken(serviceAccount);
  console.log('✅ Authenticated with Google Play Android Publisher API!');

  await setupStoreListingsAndRelease(token);
  await setupSubscriptions(token);
  await setupLifetimeInAppProduct(token);

  console.log('\n🚀 ALL GOOGLE PLAY CONSOLE SETUP COMPLETED AUTOMATICALLY!');
}

main().catch((err) => {
  console.error('\n❌ Google Play Bot Error:', err.message);
  process.exit(1);
});
