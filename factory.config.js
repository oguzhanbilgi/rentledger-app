// @ts-check

/**
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  TEK YAPILANDIRMA DOSYASI — RentLedger Pro                           │
 * │  `npm run verify:release` yayın öncesi eksikleri listeler.           │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Buradaki değerler uygulama paketine gömülür; yalnızca herkese açık
 * kimlikler yazın. Gizli anahtarlar `.env` / EAS Secrets içinde kalır.
 * Şema ve açıklamalar: src/config/types.ts
 */

/** @type {import('./src/config/types').FactoryConfig} */
const factory = {
  app: {
    name: 'RentLedger Pro',
    slug: 'rentledger-app',
    scheme: 'rentledger',
    version: '1.0.0',
    androidPackage: 'com.mobilefactory.rentledger',
    iosBundleIdentifier: 'com.mobilefactory.rentledger',
    tagline: {
      en: 'Rent tracking & PDF receipts',
      tr: 'Kira takibi ve PDF makbuz',
    },
    fallbackLanguage: 'en',
    defaultCurrency: 'USD',
  },

  brand: {
    splashBackground: '#070B14',
    adaptiveIconBackground: '#0F172A',
  },

  studio: {
    name: 'ObAppStudio',
    supportEmail: 'oguzhanbilgidev@gmail.com',
    website: 'https://oguzhanbilgi.github.io',
    privacyPolicyUrl: 'https://oguzhanbilgi.github.io/obappstudio-legal/rentledger-privacy.html',
    termsUrl: 'https://oguzhanbilgi.github.io/obappstudio-legal/rentledger-terms.html',
  },

  storage: {
    // Yayındaki sürümün mevcut SQLite dosyası — DEĞİŞTİRMEYİN (kullanıcı verisi kaybolur).
    databaseName: 'rentledger_factory.db',
  },

  monetization: {
    revenueCat: {
      // RevenueCat → VeloQuote projesi → RentLedger Android uygulaması → "Public app-specific API key".
      // (RentLedger, VeloQuote ve Bill of Sale aynı RevenueCat projesini ve pro_access yetkisini paylaşır.)
      androidApiKey: 'goog_vOvioGuqvGayMahpLooYhtmqOrQ',
      iosApiKey: '',
      entitlementId: 'pro_access',
    },

    admob: {
      // Boş bırakılırsa yayın sürümünde reklam gösterilmez (test kimliği ASLA yayına çıkmaz).
      androidAppId: '',
      iosAppId: '',
      android: { banner: '', interstitial: '', rewarded: '' },
      ios: { banner: '', interstitial: '', rewarded: '' },
    },

    quota: {
      freeUnits: 3,
      rewardedAdBonus: 1,
      // Günde 1: ödüllü video aboneliğin yerini tutmasın (düzenli kullanıcı Pro'ya geçer).
      maxRewardedAdBonusesPerDay: 1,
      shareBonus: 1,
      maxShareBonusesPerDay: 1,
      maxShareBonusesTotal: 3,
    },

    // Uygulama bazında karar: doğal kırılma anında, sıklık sınırıyla açık.
    interstitial: {
      enabled: true,
      minIntervalSeconds: 180,
      maxPerSession: 3,
      everyNthTrigger: 3,
    },

    devPreviewPrices: {
      weekly: '$3.99',
      monthly: '$9.99',
      annual: '$29.99',
      lifetime: '$49.99',
    },
  },

  eas: {
    projectId: '43fdea96-e0b0-4c8e-98bc-ea67fff06983',
    owner: 'chrescus',
  },
};

module.exports = factory;
