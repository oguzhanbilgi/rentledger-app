/**
 * MobileFactory — Uygulama yapılandırma şeması.
 *
 * Her uygulama yalnızca kök dizindeki `factory.config.ts` dosyasını düzenler.
 * `app.config.ts` bu değerlerden Expo yapılandırmasını üretir ve `extra.factory`
 * alanına koyar; uygulama kodu değerleri `src/config` üzerinden okur.
 *
 * Buraya yalnızca uygulama paketine gömülmesi güvenli (herkese açık) değerler girer:
 * RevenueCat "public SDK key", AdMob uygulama/birim kimlikleri, URL'ler, e-posta.
 * Gizli anahtarlar (RevenueCat secret key, Play service account) ASLA buraya yazılmaz.
 */

export type AppLanguage = 'en' | 'tr';

export type Localized = Record<AppLanguage, string>;

export interface AdUnitIds {
  banner: string;
  interstitial: string;
  rewarded: string;
}

export interface FactoryConfig {
  app: {
    /** Mağazada ve cihazda görünen ad. */
    name: string;
    /** Expo slug — EAS projesiyle aynı olmalı. */
    slug: string;
    /** Derin bağlantı şeması (ör. `velohours`). */
    scheme: string;
    /** Pazarlama sürümü (ör. `1.0.0`). Build numarası EAS tarafından yönetilir. */
    version: string;
    androidPackage: string;
    iosBundleIdentifier: string;
    /** Açılış ekranı ve hakkında bölümünde gösterilen kısa slogan. */
    tagline: Localized;
    /** Cihaz dili desteklenmiyorsa kullanılacak dil. */
    fallbackLanguage: AppLanguage;
    /** Varsayılan para birimi (ISO 4217, ör. `USD`, `TRY`). */
    defaultCurrency: string;
  };

  brand: {
    /** Splash ve sistem arka planı. */
    splashBackground: string;
    /** Android adaptive icon arka plan rengi. */
    adaptiveIconBackground: string;
  };

  studio: {
    name: string;
    supportEmail: string;
    website: string;
    /** Herkese açık gizlilik politikası URL'si (Play Console'a girilen adresle aynı). */
    privacyPolicyUrl: string;
    termsUrl: string;
  };

  storage: {
    /** SQLite dosya adı. Yayındaki bir uygulamada DEĞİŞTİRMEYİN (veri kaybolur). */
    databaseName: string;
  };

  monetization: {
    revenueCat: {
      /** `goog_...` ile başlayan public SDK anahtarı. */
      androidApiKey: string;
      /** `appl_...` ile başlayan public SDK anahtarı. Boşsa iOS satın alma kapalıdır. */
      iosApiKey: string;
      entitlementId: string;
      /** Boşsa RevenueCat'teki "current" offering kullanılır. */
      offeringId?: string;
    };

    admob: {
      androidAppId: string;
      iosAppId: string;
      android: AdUnitIds;
      ios: AdUnitIds;
    };

    /** Ücretsiz kullanım kotası (ör. ücretsiz PDF sayısı). */
    quota: {
      freeUnits: number;
      /** Ödüllü reklam başına verilecek ek hak. */
      rewardedAdBonus: number;
      maxRewardedAdBonusesPerDay: number;
      /** Paylaşım doğrulanamadığı için sıkı sınırlı tutulur. 0 = kapalı. */
      shareBonus: number;
      maxShareBonusesPerDay: number;
      maxShareBonusesTotal: number;
    };

    interstitial: {
      enabled: boolean;
      /** Aynı oturumda iki geçiş reklamı arasındaki en kısa süre. */
      minIntervalSeconds: number;
      maxPerSession: number;
      /** Kaç doğal kırılma anında (kayıt, dışa aktarma) bir gösterilir. */
      everyNthTrigger: number;
    };

    /**
     * Yalnızca geliştirme (Expo Go / web) önizlemesinde paywall'u doldurmak için.
     * Yayın sürümünde fiyatlar her zaman mağazadan (RevenueCat offering) okunur.
     */
    devPreviewPrices: {
      weekly: string;
      monthly: string;
      annual: string;
      lifetime: string;
    };
  };

  eas: {
    projectId: string;
    owner: string;
  };
}
