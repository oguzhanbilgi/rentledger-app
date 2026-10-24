import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { AdUnitIds, FactoryConfig } from './types';

export type { AdUnitIds, AppLanguage, FactoryConfig, Localized } from './types';

function loadFactoryConfig(): FactoryConfig {
  const extra = Constants.expoConfig?.extra as { factory?: FactoryConfig } | undefined;
  if (!extra?.factory) {
    throw new Error(
      '[factory] extra.factory bulunamadı. app.config.ts, factory.config.js değerlerini extra.factory alanına koymalı.'
    );
  }
  return extra.factory;
}

/** factory.config.js değerleri (çalışma zamanında, Expo manifest'inden). */
export const factory: FactoryConfig = loadFactoryConfig();

/** Mağazaya giden derleme mi? Geliştirme kolaylıkları yalnızca `__DEV__` iken açılır. */
export const IS_RELEASE = !__DEV__;

const GOOGLE_SAMPLE_AD_PUBLISHER = 'ca-app-pub-3940256099942544';

export function isGoogleSampleAdId(id: string): boolean {
  return id.startsWith(GOOGLE_SAMPLE_AD_PUBLISHER);
}

/** Bu platform için yapılandırılmış AdMob birim kimlikleri. */
export function getConfiguredAdUnits(): AdUnitIds {
  return Platform.OS === 'ios' ? factory.monetization.admob.ios : factory.monetization.admob.android;
}

/** Bu platform için RevenueCat public SDK anahtarı (boş olabilir). */
export function getRevenueCatApiKey(): string {
  const { revenueCat } = factory.monetization;
  return (Platform.OS === 'ios' ? revenueCat.iosApiKey : revenueCat.androidApiKey).trim();
}

export function getPlayStoreUrl(): string {
  return `https://play.google.com/store/apps/details?id=${factory.app.androidPackage}`;
}
