import '@/global.css';

import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'nativewind';

import AppTabs from '@/components/app-tabs';
import { Button } from '@/components/ui/button';
import { bootstrapApp, startBackgroundServices } from '@/services/bootstrap';
import { t } from '@/services/i18n';
import { prepareRentLedgerData } from '@/services/rentledger-data';

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 250, fade: true });

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const boot = useCallback(() => {
    setStatus('loading');
    bootstrapApp()
      .then(() =>
        // Eski tahsilatların kira dönemi anahtarını doldurur (idempotent, hata açılışı durdurmaz).
        prepareRentLedgerData().catch((error) => console.warn('[boot] Veri hazırlığı:', error))
      )
      .then(() => {
        setStatus('ready');
        startBackgroundServices();
      })
      .catch((error) => {
        console.error('[boot] Başlatma hatası:', error);
        setStatus('error');
      });
  }, []);

  useEffect(boot, [boot]);

  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [status]);

  if (status === 'loading') {
    return null;
  }

  if (status === 'error') {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-8 dark:bg-canvas-dark">
        <Text className="text-center text-lg font-bold text-ink dark:text-ink-dark">{t('errorTitle')}</Text>
        <Text className="mt-2 text-center text-muted dark:text-muted-dark">{t('tryAgainLater')}</Text>
        <Button label={t('retry')} onPress={boot} className="mt-6 self-stretch" />
      </View>
    );
  }

  const isDark = colorScheme === 'dark';
  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppTabs />
    </ThemeProvider>
  );
}
