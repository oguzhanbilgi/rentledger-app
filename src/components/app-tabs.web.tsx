import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, Text, View } from 'react-native';

import { factory } from '@/config';
import { useI18n } from '@/services/i18n';

/** Web önizlemesi için basit üst sekme çubuğu. */
export default function AppTabs() {
  const { t } = useI18n();
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <View className="absolute w-full flex-row items-center justify-center p-4">
          <View className="max-w-[800px] flex-1 flex-row items-center gap-2 rounded-full border border-line bg-surface px-6 py-2 dark:border-line-dark dark:bg-surface-dark">
            <Text className="mr-auto text-sm font-bold text-ink dark:text-ink-dark">{factory.app.name}</Text>
            <TabTrigger name="home" href="/" asChild>
              <TabButton>{t('tabDashboard')}</TabButton>
            </TabTrigger>
            <TabTrigger name="properties" href="/properties" asChild>
              <TabButton>{t('tabProperties')}</TabButton>
            </TabTrigger>
            <TabTrigger name="explore" href="/explore" asChild>
              <TabButton>{t('tabSettings')}</TabButton>
            </TabTrigger>
          </View>
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ref: _ref, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} className="active:opacity-70">
      <View className={`rounded-full px-4 py-1.5 ${isFocused ? 'bg-elevated dark:bg-elevated-dark' : ''}`}>
        <Text
          className={`text-sm ${isFocused ? 'font-semibold text-ink dark:text-ink-dark' : 'text-muted dark:text-muted-dark'}`}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}
