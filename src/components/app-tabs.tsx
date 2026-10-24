import { Pressable, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, CalendarCheck, Settings, type LucideIcon } from 'lucide-react-native';

import { useThemeColors } from '@/constants/theme';
import type { TranslationKey } from '@/i18n/en';
import { triggerHaptic } from '@/services/haptics';
import { useI18n } from '@/services/i18n';

const TAB_META: Record<string, { label: TranslationKey; icon: LucideIcon }> = {
  index: { label: 'tabDashboard', icon: CalendarCheck },
  properties: { label: 'tabProperties', icon: Building2 },
  explore: { label: 'tabSettings', icon: Settings },
};

/** Alt sekme çubuğu (3 sekme). Dil ve tema değişince anında yeniden çizilir. */
function RentTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
      className="border-t border-line bg-surface px-3 pt-2 dark:border-line-dark dark:bg-surface-dark">
      <View className="flex-row items-center gap-1">
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const Icon = meta.icon;

          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              triggerHaptic.selection();
              navigateToTab(route.key);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t(meta.label)}
              onPress={onPress}
              className={`min-h-[48px] flex-1 items-center justify-center gap-1 rounded-2xl py-1.5 ${
                focused ? 'bg-elevated dark:bg-elevated-dark' : ''
              }`}>
              <Icon size={20} color={focused ? colors.primary : colors.muted} />
              <Text
                numberOfLines={1}
                className={`text-[11px] font-bold ${
                  focused ? 'text-ink dark:text-ink-dark' : 'text-muted dark:text-muted-dark'
                }`}>
                {t(meta.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <RentTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="properties" />
      <Tabs.Screen name="explore" />
    </Tabs>
  );
}
