import { refreshQuota } from '@/services/credits';
import { initDatabase } from '@/services/database';
import { initI18n } from '@/services/i18n';
import { initAds } from '@/services/ads';
import { getSubscriptionState, initPurchases } from '@/services/revenuecat';
import { initTheme } from '@/services/theme';

/**
 * İlk kareden ÖNCE tamamlanması gerekenler: veritabanı + tercihler, dil, tema.
 * Splash ekranı bu bitene kadar açık kalır (hedef < 950 ms).
 */
export async function bootstrapApp(): Promise<void> {
  await initDatabase();
  initI18n();
  initTheme();
  refreshQuota();
}

const PURCHASES_TIMEOUT_MS = 15000;

/**
 * Arayüzü bekletmeden arka planda: önce abonelik durumu, ardından (Pro değilse)
 * reklam rızası + AdMob. Abonelik durumu belirlenmeden rıza formu açılmaz;
 * böylece Pro kullanıcıya rıza formu ve reklam gösterilmez.
 */
export function startBackgroundServices(): void {
  void (async () => {
    await Promise.race([
      initPurchases().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, PURCHASES_TIMEOUT_MS)),
    ]);
    refreshQuota();

    const subscription = getSubscriptionState();
    if (!subscription.ready) {
      // Abonelik durumu hâlâ bilinmiyor: bu oturumda reklamı başlatma (temkinli tercih).
      return;
    }
    if (!subscription.isPro) {
      await initAds().catch(() => undefined);
    }
  })();
}
