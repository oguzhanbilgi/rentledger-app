import { Tabs, TabList, TabSlot, TabTrigger, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, Text, View } from 'react-native';

import { factory } from '@/config';
import { useI18n } from '@/services/i18n';

/**
 * Web önizlemesi için basit üst sekme çubuğu.
 * Not: expo-router, TabTrigger'ları TabList'in (asChild) çocuğunun DOĞRUDAN çocukları
 * arasında arar; tetikleyicileri ek bir View içine sarmayın, yoksa tıklama çalışmaz.
 */
export default function AppTabs() {
  const { t } = useI18n();
  return (
    // Sekme çubuğu normal akışta (absolute değil): içerik çubuğun altında başlar.
    <Tabs style={{ flex: 1 }}>
      <TabList asChild>
        <TopTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>{t('tabDashboard')}</TabButton>
          </TabTrigger>
          <TabTrigger name="properties" href="/properties" asChild>
            <TabButton>{t('tabProperties')}</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>{t('tabSettings')}</TabButton>
          </TabTrigger>
        </TopTabList>
      </TabList>
      <TabSlot style={{ flex: 1 }} />
    </Tabs>
  );
}

function TopTabList({ children, ...props }: TabListProps) {
  return (
    <View {...props} className="w-full flex-row items-center justify-center bg-canvas p-4 dark:bg-canvas-dark">
      <View className="max-w-[800px] flex-1 flex-row items-center gap-2 rounded-full border border-line bg-surface px-6 py-2 dark:border-line-dark dark:bg-surface-dark">
        <Text className="mr-auto text-sm font-bold text-ink dark:text-ink-dark">{factory.app.name}</Text>
        {children}
      </View>
    </View>
  );
}

function TabButton({ children, isFocused, ref: _ref, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
      <View className={`rounded-full px-4 py-1.5 ${isFocused ? 'bg-elevated dark:bg-elevated-dark' : ''}`}>
        <Text
          className={`text-sm ${isFocused ? 'font-semibold text-ink dark:text-ink-dark' : 'text-muted dark:text-muted-dark'}`}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}
