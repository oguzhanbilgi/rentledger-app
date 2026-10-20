import { Platform } from 'react-native';

/**
 * Google Mobile Ads (react-native-google-mobile-ads) Yapılandırma ve Yardımcı Servisi
 * Not: Resmi Google Test ID'leri varsayılan olarak tanımlanmıştır.
 * Üretimde (Production) .env üzerinden EXPO_PUBLIC_ADMOB_* değişkenlerini kullanın.
 */

const GOOGLE_TEST_IDS = {
  banner: Platform.select({
    ios: 'ca-app-pub-3940256099942544/2934735716',
    android: 'ca-app-pub-3940256099942544/6300978111',
    default: 'ca-app-pub-3940256099942544/6300978111',
  })!,
  interstitial: Platform.select({
    ios: 'ca-app-pub-3940256099942544/4411468910',
    android: 'ca-app-pub-3940256099942544/1033173712',
    default: 'ca-app-pub-3940256099942544/1033173712',
  })!,
  rewarded: Platform.select({
    ios: 'ca-app-pub-3940256099942544/1712485313',
    android: 'ca-app-pub-3940256099942544/5224354917',
    default: 'ca-app-pub-3940256099942544/5224354917',
  })!,
};

export const ADMOB_UNIT_IDS = {
  banner: __DEV__
    ? GOOGLE_TEST_IDS.banner
    : process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || GOOGLE_TEST_IDS.banner,
  interstitial: __DEV__
    ? GOOGLE_TEST_IDS.interstitial
    : process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID || GOOGLE_TEST_IDS.interstitial,
  rewarded: __DEV__
    ? GOOGLE_TEST_IDS.rewarded
    : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID || GOOGLE_TEST_IDS.rewarded,
};

export interface AdsStatus {
  initialized: boolean;
  sdkMode: 'native' | 'mock';
  bannerUnitId: string;
}

export interface RewardedAdResult {
  rewarded: boolean;
  sdkMode: 'native' | 'mock';
  rewardAmount?: number;
  rewardType?: string;
}

export async function initializeMobileAds(): Promise<AdsStatus> {
  if (Platform.OS === 'web') {
    return {
      initialized: false,
      sdkMode: 'mock',
      bannerUnitId: ADMOB_UNIT_IDS.banner,
    };
  }

  try {
    const googleMobileAds = await import('react-native-google-mobile-ads');
    const mobileAds = googleMobileAds.default;
    await mobileAds().initialize();

    return {
      initialized: true,
      sdkMode: 'native',
      bannerUnitId: ADMOB_UNIT_IDS.banner,
    };
  } catch {
    // Expo Go ortamında native modül olmadığında çökmeden önizleme moduna geçer
    console.info('[AdMob] Native modül bulunamadı, şablon önizleme (mock) modunda çalışıyor.');
    return {
      initialized: true,
      sdkMode: 'mock',
      bannerUnitId: ADMOB_UNIT_IDS.banner,
    };
  }
}

async function simulateRewardedFallback(): Promise<RewardedAdResult> {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return {
    rewarded: true,
    sdkMode: 'mock',
    rewardAmount: 1,
    rewardType: 'simulated_unlock',
  };
}

/**
 * Ödüllü reklamı (RewardedAd) yükler ve gösterir.
 * Native SDK bağlıysa gerçek AdMob RewardedAd çalıştırır;
 * Expo Go veya geliştirme ortamında reklam yüklenemezse 2 saniyelik simülasyona düşer.
 */
export async function showRewardedAdForUnlock(): Promise<RewardedAdResult> {
  if (Platform.OS === 'web') {
    return simulateRewardedFallback();
  }

  try {
    const { RewardedAd, RewardedAdEventType, AdEventType } = await import(
      'react-native-google-mobile-ads'
    );

    const rewardedAd = RewardedAd.createForAdRequest(ADMOB_UNIT_IDS.rewarded, {
      requestNonPersonalizedAdsOnly: true,
    });

    return await new Promise<RewardedAdResult>((resolve) => {
      let settled = false;
      let earnedReward: { amount: number; type: string } | null = null;
      const unsubscribers: Array<() => void> = [];

      const cleanup = () => {
        while (unsubscribers.length > 0) {
          const unsub = unsubscribers.pop();
          try {
            unsub?.();
          } catch {
            // ignore cleanup errors
          }
        }
      };

      const finish = (result: RewardedAdResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        cleanup();
        resolve(result);
      };

      const timeoutId = setTimeout(() => {
        if (!settled) {
          cleanup();
          simulateRewardedFallback().then(finish);
        }
      }, 8000);

      unsubscribers.push(
        rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
          rewardedAd.show().catch(() => {
            simulateRewardedFallback().then(finish);
          });
        })
      );

      unsubscribers.push(
        rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
          earnedReward = {
            amount: reward?.amount ?? 1,
            type: reward?.type ?? 'reward',
          };
        })
      );

      unsubscribers.push(
        rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
          if (earnedReward) {
            finish({
              rewarded: true,
              sdkMode: 'native',
              rewardAmount: earnedReward.amount,
              rewardType: earnedReward.type,
            });
          } else {
            finish({
              rewarded: false,
              sdkMode: 'native',
            });
          }
        })
      );

      unsubscribers.push(
        rewardedAd.addAdEventListener(AdEventType.ERROR, () => {
          // Geliştirme ortamında veya ağ/no-fill durumunda testi bloklamamak için fallback
          simulateRewardedFallback().then(finish);
        })
      );

      rewardedAd.load();
    });
  } catch {
    return simulateRewardedFallback();
  }
}

/**
 * Kullanıcı PRO değilse gerçek geçiş reklamını (InterstitialAd) yükler, gösterir
 * ve kullanıcı reklamı kapattığında (AdEventType.CLOSED) true döndürür.
 */
export async function showInterstitialAdIfEligible(isPro: boolean): Promise<boolean> {
  if (isPro || Platform.OS === 'web') {
    return false;
  }

  try {
    const { InterstitialAd, AdEventType } = await import('react-native-google-mobile-ads');
    const interstitial = InterstitialAd.createForAdRequest(ADMOB_UNIT_IDS.interstitial, {
      requestNonPersonalizedAdsOnly: true,
    });

    return await new Promise<boolean>((resolve) => {
      let settled = false;
      let wasShown = false;
      const unsubscribers: Array<() => void> = [];

      const cleanup = () => {
        while (unsubscribers.length > 0) {
          const unsub = unsubscribers.pop();
          try {
            unsub?.();
          } catch {
            // ignore cleanup errors
          }
        }
      };

      const finish = (shown: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        cleanup();
        resolve(shown);
      };

      const timeoutId = setTimeout(() => {
        if (!wasShown) {
          finish(false);
        }
      }, 6500);

      unsubscribers.push(
        interstitial.addAdEventListener(AdEventType.LOADED, () => {
          wasShown = true;
          clearTimeout(timeoutId);
          interstitial.show().catch(() => finish(false));
        })
      );

      unsubscribers.push(
        interstitial.addAdEventListener(AdEventType.CLOSED, () => {
          finish(true);
        })
      );

      unsubscribers.push(
        interstitial.addAdEventListener(AdEventType.ERROR, () => {
          finish(false);
        })
      );

      interstitial.load();
    });
  } catch {
    return false;
  }
}
