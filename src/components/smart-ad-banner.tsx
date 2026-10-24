import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { View } from 'react-native';

import { getLoadedAdsModule, useAds } from '@/services/ads';
import { useSubscription } from '@/services/revenuecat';

/**
 * Uyarlanabilir AdMob banner. Pro kullanıcıya, rıza yokken veya gerçek birim
 * yapılandırılmamışken HİÇBİR ŞEY çizmez — sahte "AD" yer tutucusu yoktur.
 */

const RETRY_AFTER_FAILURE_MS = 60_000;

class AdErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.warn('[ads] Banner hatası:', error.message);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function SmartAdBanner() {
  // Modül referansı render sırasında okunduğu için React Compiler ezberlemesini kapatıyoruz;
  // görünürlük kararı yine de yalnızca `useAds()` anlık görüntüsünden gelir.
  'use no memo';
  const { isPro } = useSubscription();
  const { bannerUnitId } = useAds();
  const [failed, setFailed] = useState(false);

  // Doluluk (no-fill) geçicidir: bir süre sonra yeniden dene.
  useEffect(() => {
    if (!failed) return;
    const timer = setTimeout(() => setFailed(false), RETRY_AFTER_FAILURE_MS);
    return () => clearTimeout(timer);
  }, [failed]);

  const mod = bannerUnitId ? getLoadedAdsModule() : null;
  if (isPro || failed || !bannerUnitId || !mod) {
    return null;
  }

  const { BannerAd, BannerAdSize } = mod;
  return (
    <AdErrorBoundary>
      <View className="w-full items-center">
        <BannerAd
          unitId={bannerUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          onAdFailedToLoad={() => setFailed(true)}
        />
      </View>
    </AdErrorBoundary>
  );
}
