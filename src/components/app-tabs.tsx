import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, CalendarCheck, Settings } from 'lucide-react-native';

import { getI18nState, subscribeI18n, t } from '@/services/i18n';
import {
  getCurrentSubscriptionState,
  subscribeToSubscriptionChanges,
  SubscriptionState,
} from '@/services/revenuecat';
import { PeriodicAdAndUpsellModal } from './periodic-ad-modal';
import { PaywallModal } from './paywall-modal';

function FloatingModernTabBar(props: any) {
  const { state, navigation, navigateToTab } = props;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [i18n, setI18n] = useState(getI18nState());

  useEffect(() => {
    return subscribeI18n(setI18n);
  }, []);

  const tabs = [
    {
      routeName: 'index',
      href: '/' as const,
      label: t('tabDashboard', i18n.lang),
      icon: CalendarCheck,
    },
    {
      routeName: 'properties',
      href: '/properties' as const,
      label: t('tabProperties', i18n.lang),
      icon: Building2,
    },
    {
      routeName: 'explore',
      href: '/explore' as const,
      label: t('tabSettings', i18n.lang),
      icon: Settings,
    },
  ];

  return (
    <View
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
      className="px-4 pt-2 bg-slate-50 dark:bg-[#090d16]">
      <View className="flex-row items-center justify-between p-1.5 rounded-3xl bg-[#0f172a] dark:bg-[#131b2e] border border-emerald-500/25 shadow-xl">
        {tabs.map((tab) => {
          const routeIndex = state?.routes
            ? state.routes.findIndex(
                (r: { name: string }) => r.name === tab.routeName
              )
            : -1;
          const isFocused =
            routeIndex !== -1
              ? state.index === routeIndex
              : pathname === tab.href ||
                (tab.routeName === 'index' && pathname === '/index');
          const IconComponent = tab.icon;

          const onPress = () => {
            if (isFocused) return;
            const targetRoute =
              routeIndex !== -1 ? state?.routes?.[routeIndex] : null;

            if (typeof navigateToTab === 'function' && targetRoute?.key) {
              navigateToTab(targetRoute.key);
              return;
            }
            if (navigation && typeof navigation.navigate === 'function') {
              navigation.navigate(tab.routeName);
              return;
            }
            router.replace(tab.href);
          };

          return (
            <Pressable
              key={tab.routeName}
              onPress={onPress}
              className={`flex-1 py-2.5 px-2.5 rounded-2xl flex-row items-center justify-center gap-2 ${
                isFocused
                  ? 'bg-emerald-600 border border-emerald-400/40'
                  : 'bg-transparent'
              }`}>
              <IconComponent
                size={17}
                color={isFocused ? '#ffffff' : '#94a3b8'}
              />
              <Text
                numberOfLines={1}
                className={`text-xs font-extrabold ${
                  isFocused ? 'text-white' : 'text-slate-400'
                }`}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AppTabs() {
  const [subState, setSubState] = useState<SubscriptionState>(
    getCurrentSubscriptionState()
  );
  const [globalPaywallVisible, setGlobalPaywallVisible] = useState(false);
  const [globalPaywallReason, setGlobalPaywallReason] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    return subscribeToSubscriptionChanges(setSubState);
  }, []);

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <FloatingModernTabBar {...props} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="properties" />
        <Tabs.Screen name="explore" />
      </Tabs>

      {/* 10 dakikada bir ve işlem sonrasında çıkan Tam Ekran Reklam + Reklamsız PRO Teklifi */}
      <PeriodicAdAndUpsellModal
        isPro={subState.isPro}
        onOpenPaywall={(reason) => {
          setGlobalPaywallReason(reason);
          setGlobalPaywallVisible(true);
        }}
      />

      <PaywallModal
        visible={globalPaywallVisible}
        onClose={() => setGlobalPaywallVisible(false)}
        onPurchaseSuccess={(newState) => setSubState(newState)}
        triggerReason={globalPaywallReason}
      />
    </>
  );
}
