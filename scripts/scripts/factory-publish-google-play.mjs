#!/usr/bin/env node
/**
 * ============================================================================
 * MOBILE FACTORY — GOOGLE PLAY CONSOLE FULL AUTOMATION BOT
 * ============================================================================
 * One-time setup: Put your ObAppStudio Google Cloud Service Account JSON at:
 *   D:\MobileFactory\play-service-account.json
 *
 * What this bot automates for EVERY app in the factory:
 * 1. Authenticates with Google Play Android Publisher API v3 (Zero external deps)
 * 2. Uploads the .aab bundle & assigns it to the release track with TR/EN release notes
 * 3. Updates Store Listing (TR & EN Title, Short Description, Full ASO Description)
 * 4. Creates & Activates Subscriptions (Weekly, Monthly, Annual) with regional prices
 * 5. Creates & Activates One-Time Lifetime Product (veloquote_lifetime)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SERVICE_ACCOUNT_PATH =
  process.env.PLAY_SERVICE_ACCOUNT_JSON ||
  process.argv[2] ||
  'D:\\MobileFactory\\play-service-account.json';

const PACKAGE_NAME = process.env.APP_PACKAGE_NAME || 'com.mobilefactory.veloquote';
const AAB_PATH =
  process.env.AAB_PATH ||
  path.join(process.cwd(), 'veloquote-production.aab');

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
    const err = new Error(
      `Play API ${method} ${endpoint} (${res.status}): ${JSON.stringify(data)}`
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function uploadAabBundle(token, editId, aabFilePath) {
  const stat = fs.statSync(aabFilePath);
  console.log(
    `📦 Uploading AAB (${(stat.size / (1024 * 1024)).toFixed(2)} MB): ${aabFilePath}...`
  );
  const fileBuffer = fs.readFileSync(aabFilePath);

  const res = await fetch(
    `${UPLOAD_BASE}/applications/${PACKAGE_NAME}/edits/${editId}/bundles?uploadType=media`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(fileBuffer.length),
      },
      body: fileBuffer,
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`AAB Upload failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function setupSubscriptions(token) {
  console.log('\n💳 Configuring Subscriptions in Google Play Console...');

  const subs = [
    {
      productId: 'veloquote_weekly',
      basePlanId: 'weekly-base',
      billingPeriodDuration: 'P1W',
      titleTr: 'VeloQuote Haftalık Başlangıç',
      titleEn: 'VeloQuote Weekly Starter',
      descTr: 'Sınırsız kurumsal PDF teklif, filigransız çıktı ve reklamsız kullanım.',
      descEn: 'Unlimited corporate PDF quotes, no watermark, and ad-free experience.',
      priceTryUnits: '79',
      priceTryNanos: 990000000,
      priceUsdUnits: '2',
      priceUsdNanos: 990000000,
    },
    {
      productId: 'veloquote_monthly',
      basePlanId: 'monthly-base',
      billingPeriodDuration: 'P1M',
      titleTr: 'VeloQuote Aylık Pro Paket',
      titleEn: 'VeloQuote Monthly Pro Plan',
      descTr: 'Her ay sınırsız kurumsal PDF teklif, kaşe/imza ve reklamsız kullanım.',
      descEn: 'Monthly unlimited corporate PDF quotes, stamp/signature, and ad-free.',
      priceTryUnits: '199',
      priceTryNanos: 990000000,
      priceUsdUnits: '6',
      priceUsdNanos: 990000000,
    },
    {
      productId: 'veloquote_annual',
      basePlanId: 'annual-base',
      billingPeriodDuration: 'P1Y',
      titleTr: 'VeloQuote Yıllık Pro Paket',
      titleEn: 'VeloQuote Annual Pro Plan',
      descTr: '%75 indirimli yıllık sınırsız kurumsal PDF teklif ve reklamsız deneyim.',
      descEn: '75% off annual unlimited corporate PDF quotes and ad-free experience.',
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
            'Filigransız Kurumsal PDF Teklif',
            'Tamamen Reklamsız Kullanım',
            'Firma Logosu, IBAN ve Kaşe/İmza',
          ],
        },
        {
          languageCode: 'en-US',
          title: s.titleEn,
          description: s.descEn,
          benefits: [
            'Watermark-Free Corporate PDF Quotes',
            '100% Ad-Free Experience',
            'Company Logo, IBAN & Signature Block',
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
  console.log('\n💎 Configuring One-Time Lifetime Product (veloquote_lifetime) via new oneTimeProducts API...');
  const body = {
    packageName: PACKAGE_NAME,
    productId: 'veloquote_lifetime',
    listings: [
      {
        languageCode: 'tr-TR',
        title: 'VeloQuote Ömür Boyu Sınırsız PRO',
        description: 'Tek seferlik ödeme ile ömür boyu reklamsız ve sınırsız PDF teklif.',
      },
      {
        languageCode: 'en-US',
        title: 'VeloQuote Lifetime Unlimited PRO',
        description: 'One-time payment for lifetime ad-free and unlimited PDF quotes.',
      },
    ],
    purchaseOptions: [
      {
        purchaseOptionId: 'default',
        buyOption: {
          legacyCompatible: true,
        },
        regionalPricingAndAvailabilityConfigs: [
          {
            regionCode: 'TR',
            price: {
              currencyCode: 'TRY',
              units: '1499',
              nanos: 990000000,
            },
            availability: 'AVAILABLE',
          },
          {
            regionCode: 'US',
            price: {
              currencyCode: 'USD',
              units: '49',
              nanos: 990000000,
            },
            availability: 'AVAILABLE',
          },
        ],
      },
    ],
  };

  try {
    await playApi(
      token,
      'PATCH',
      `/applications/${PACKAGE_NAME}/onetimeproducts/veloquote_lifetime`,
      body,
      {
        allowMissing: true,
        updateMask: 'listings,purchaseOptions',
        'regionsVersion.version': '2022/02',
      }
    );
    console.log('✅ Created/Updated One-Time Product: veloquote_lifetime');

    await playApi(
      token,
      'POST',
      `/applications/${PACKAGE_NAME}/onetimeproducts/veloquote_lifetime/purchaseoptions:batchUpdateStates`,
      {
        requests: [
          {
            activatePurchaseOptionRequest: {
              packageName: PACKAGE_NAME,
              productId: 'veloquote_lifetime',
              purchaseOptionId: 'default',
            },
          },
        ],
      }
    );
    console.log('✅ Activated One-Time Product: veloquote_lifetime');
  } catch (e) {
    console.warn('⚠️ Lifetime product warning:', e.message);
  }
}

async function setupStoreListingsAndRelease(token) {
  console.log('\n📝 Opening Google Play Edit Session...');
  const edit = await playApi(token, 'POST', `/applications/${PACKAGE_NAME}/edits`, {});
  const editId = edit.id;
  console.log(`✅ Edit Session ID: ${editId}`);

  // 1. Update TR & EN Store Listings
  const listings = [
    {
      lang: 'tr-TR',
      title: 'VeloQuote: PDF Teklif & Fatura',
      shortDescription:
        '1 dakikada PDF fiyat teklifi, proforma fatura ve iş takip programı.',
      fullDescription: `Müşterilerinize WhatsApp'tan düz mesajla fiyat vermekten veya saatlerce Excel ile uğraşmaktan yoruldunuz mu?

VeloQuote, ustalar, esnaflar, müteahhitler, teknik servisler, ajanslar ve freelancer çalışanlar için özel olarak geliştirilmiş en hızlı PDF Fiyat Teklifi, Proforma Fatura ve İş Takip uygulamasıdır.

Sadece 60 saniye içinde müşterinizin adını seçin, hazır malzeme ve işçilik kataloğunuzdan kalemleri ekleyin, KDV ve iskonto oranını belirleyin; firmanızın logosu, IBAN bilgisi ve kaşe/imza alanıyla hazır Kurumsal PDF Fiyat Teklifinizi tek tuşla paylaşın!

ÖNE ÇIKAN ÖZELLİKLER:
• 60 Saniyede Profesyonel PDF Teklif ve Proforma Fatura
• Otomatik KDV (%0, %1, %10, %20) ve İskonto Hesaplama
• Hazır Malzeme & İşçilik Kataloğu (Fiyatlarınızı 1 kez kaydedin, tek tıkla ekleyin)
• Süresi Yaklaşan Teklifler İçin Otomatik Hatırlatıcı ve Tek Tuşla WhatsApp Takip Mesajı
• 3 Farklı Kurumsal PDF Renk Teması ve Kaşe / İmza Alanı
• Çoklu Para Birimi (₺ TL, $ USD, € EUR, £ GBP) ve Çift Dil (TR / EN) Desteği
• İnternetsiz (Offline) Çalışabilme — Tüm verileriniz cihazınızda güvende kalır.`,
    },
    {
      lang: 'en-US',
      title: 'VeloQuote: PDF Quote Maker',
      shortDescription:
        'Create professional PDF quotes, estimates & proforma invoices in 60s.',
      fullDescription: `Stop sending plain text estimates or struggling with complex spreadsheets on the job site!

VeloQuote is the fastest, cleanest PDF Estimate, Quote & Proforma Invoice Maker built specifically for contractors, tradespeople, agencies, and freelancers.

KEY FEATURES:
• Create corporate PDF quotes & proforma invoices in under 60 seconds
• Automatic Tax (VAT) & Discount calculation
• Reusable Item & Labor Price Catalog
• Expiring Quote Reminders with 1-tap WhatsApp client follow-up
• 3 Executive PDF Color Themes + Customer Signature & Stamp block
• Multi-Currency (₺, $, €, £) & Bilingual (EN/TR) support`,
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

    // Upload Store Graphics (icon, featureGraphic, phoneScreenshots) if present
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

      // Clear existing screenshots first to avoid duplicates
      for (const imgType of ['phoneScreenshots', 'sevenInchScreenshots', 'tenInchScreenshots']) {
        try {
          await playApi(
            token,
            'DELETE',
            `/applications/${PACKAGE_NAME}/edits/${editId}/listings/${l.lang}/${imgType}`
          );
        } catch {
          // Ignore
        }
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
      console.log(`🖼️ Uploaded 3D Store Icon, Feature Graphic, 4 Phone & 4 Tablet Screenshots (${l.lang})`);
    }
  }

  // 2. Upload AAB if not already in bundle library
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
    // Assign to internal/production track
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
                text: 'VeloQuote v1.0.0 — Kurumsal PDF fiyat teklifi, katalog yönetimi ve WhatsApp teklif hatırlatıcı sistemi.',
              },
              {
                language: 'en-US',
                text: 'VeloQuote v1.0.0 — Corporate PDF quote maker, item catalog, and WhatsApp follow-up reminders.',
              },
            ],
          },
        ],
      }
    );
    console.log(`✅ Assigned VersionCode ${targetVersionCode} to '${targetTrack}' track!`);
  }

  // Commit Edit
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
