import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import type { SmartAdBannerProps } from './smart-ad-banner';

export type { SmartAdBannerProps };

export function SmartAdBanner({ isPro, onUpgradePress }: SmartAdBannerProps) {
  if (isPro) {
    return null;
  }

  return (
    <View className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex-row items-center justify-between my-2">
      <View className="flex-row items-center gap-2 flex-1 pr-2">
        <View className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
          <Text className="text-[9px] font-extrabold text-amber-400">AD</Text>
        </View>
        <Text numberOfLines={1} className="text-xs font-medium text-slate-300 flex-1">
          Google AdMob Adaptive Banner (Web Preview) • Pro ile reklamları kaldırın
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
}
