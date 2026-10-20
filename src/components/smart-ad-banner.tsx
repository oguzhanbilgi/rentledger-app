import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { ADMOB_UNIT_IDS } from '@/services/ads';

export interface SmartAdBannerProps {
  isPro: boolean;
  onUpgradePress?: () => void;
  unitId?: string;
}

interface AdErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface AdErrorBoundaryState {
  hasError: boolean;
}

class AdErrorBoundary extends Component<AdErrorBoundaryProps, AdErrorBoundaryState> {
  state: AdErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AdErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Gracefully swallow native view errors in Expo Go / unlinked dev environments
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface LoadedAdModule {
  BannerAd: React.ComponentType<{
    unitId: string;
    size: string;
    requestOptions?: { requestNonPersonalizedAdsOnly?: boolean };
    onAdFailedToLoad?: (error: unknown) => void;
  }>;
  bannerSize: string;
}

export function SmartAdBanner({ isPro, onUpgradePress, unitId }: SmartAdBannerProps) {
  const [adModule, setAdModule] = useState<LoadedAdModule | null>(null);
  const [adFailed, setAdFailed] = useState(false);

  useEffect(() => {
    if (isPro || Platform.OS === 'web') {
      return;
    }

    let mounted = true;
    import('react-native-google-mobile-ads')
      .then((mod) => {
        if (!mounted) return;
        if (mod?.BannerAd && mod?.BannerAdSize) {
          setAdModule({
            BannerAd: mod.BannerAd as unknown as LoadedAdModule['BannerAd'],
            bannerSize: mod.BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
          });
        } else {
          setAdFailed(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setAdFailed(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isPro]);

  if (isPro) {
    return null;
  }

  const fallbackBanner = (
    <View className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex-row items-center justify-between my-2">
      <View className="flex-row items-center gap-2 flex-1 pr-2">
        <View className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
          <Text className="text-[9px] font-extrabold text-amber-400">AD</Text>
        </View>
        <Text numberOfLines={1} className="text-xs font-medium text-slate-300 flex-1">
          Google AdMob Adaptive Banner • Pro ile reklamları kaldırın
        </Text>
      </View>
      {onUpgradePress ? (
        <Pressable
          onPress={onUpgradePress}
          className="px-2.5 py-1 rounded-lg bg-indigo-600 flex-row items-center gap-1 active:opacity-80">
          <Sparkles size={11} color="#fde047" />
          <Text className="text-[10px] font-extrabold text-white">PRO</Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (adFailed || !adModule) {
    return fallbackBanner;
  }

  const { BannerAd, bannerSize } = adModule;
  const resolvedUnitId = unitId || ADMOB_UNIT_IDS.banner;

  return (
    <AdErrorBoundary fallback={fallbackBanner}>
      <View className="w-full items-center justify-center my-2 overflow-hidden rounded-xl">
        <BannerAd
          unitId={resolvedUnitId}
          size={bannerSize}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdFailedToLoad={() => setAdFailed(true)}
        />
      </View>
    </AdErrorBoundary>
  );
}
