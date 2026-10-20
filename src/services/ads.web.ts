import type { AdsStatus, RewardedAdResult } from './ads';

/**
 * Web Platformu için Google Mobile Ads Yedek (Stub) Servisi
 * react-native-google-mobile-ads yalnızca iOS/Android native modüllerini desteklediği için
 * Web derlemelerinde Metro Bundler otomatik olarak bu dosyayı kullanır.
 */

export const ADMOB_UNIT_IDS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
};

export type { AdsStatus, RewardedAdResult };

export async function initializeMobileAds(): Promise<AdsStatus> {
  return {
    initialized: false,
    sdkMode: 'mock',
    bannerUnitId: ADMOB_UNIT_IDS.banner,
  };
}

export async function showRewardedAdForUnlock(): Promise<RewardedAdResult> {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return {
    rewarded: true,
    sdkMode: 'mock',
    rewardAmount: 1,
    rewardType: 'web_simulated_unlock',
  };
}

export async function showInterstitialAdIfEligible(isPro: boolean): Promise<boolean> {
  if (isPro) {
    return false;
  }
  return false;
}
