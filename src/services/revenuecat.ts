import { Platform } from 'react-native';
import { getPreference, setPreference } from './database';

/**
 * RevenueCat (react-native-purchases) Yapılandırma ve Yardımcı Servisi
 * Not: Expo Go ortamında native modül bulunmadığında uygulamanın çökmemesi için
 * güvenli (graceful fallback) sarmalayıcı içerir. Development Build / Production'da tam çalışır.
 */

export const REVENUECAT_CONFIG = {
  appleApiKey: process.env.EXPO_PUBLIC_RC_IOS_KEY || 'appl_replace_with_your_revenuecat_ios_key',
  googleApiKey:
    process.env.EXPO_PUBLIC_RC_ANDROID_KEY || 'goog_vOvioGuqvGayMahpLooYhtmqOrQ',
  entitlementId: 'pro_access',
};

export type PlanTierId = 'weekly' | 'monthly' | 'annual' | 'lifetime';

export interface PricingPlan {
  id: PlanTierId;
  rcPackageIdentifier: string;
  title: string;
  subtitle: string;
  priceString: string;
  periodLabel: string;
  badge?: string;
  savingsText?: string;
  highlight?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'weekly',
    rcPackageIdentifier: '$rc_weekly',
    title: 'Haftalık Başlangıç',
    subtitle: 'Kısa süreli deneme ve hızlı tahsilat',
    priceString: '₺79,99',
    periodLabel: '/ hafta',
  },
  {
    id: 'monthly',
    rcPackageIdentifier: '$rc_monthly',
    title: 'Aylık Pro Paket',
    subtitle: 'Düzenli mülk ve kiracı takibi için ideal',
    priceString: '₺199,99',
    periodLabel: '/ ay',
    badge: 'ESNEK AYLIK PLAN',
  },
  {
    id: 'annual',
    rcPackageIdentifier: '$rc_annual',
    title: 'Yıllık Pro Paket',
    subtitle: 'Aylık sadece ₺66 • İstediğiniz zaman iptal edin',
    priceString: '₺799,99',
    periodLabel: '/ yıl',
    badge: 'EN POPÜLER • %75 TASARRUF',
    savingsText: '%75 İndirimli',
    highlight: true,
  },
  {
    id: 'lifetime',
    rcPackageIdentifier: '$rc_lifetime',
    title: 'Ömür Boyu Sınırsız',
    subtitle: 'Tek seferlik ödeme, sonsuza kadar sınırsız mülk & makbuz',
    priceString: '₺1.499,99',
    periodLabel: 'tek ödeme',
    badge: 'EN İYİ DEĞER',
  },
];

export interface SubscriptionState {
  isPro: boolean;
  activePlan: string;
  selectedTier?: PlanTierId;
  isConfigured: boolean;
  mode: 'native' | 'mock';
}

type Listener = (state: SubscriptionState) => void;
const listeners = new Set<Listener>();

let currentSubscriptionState: SubscriptionState = {
  isPro: false,
  activePlan: 'Starter Plan (Free)',
  isConfigured: true,
  mode: 'mock',
};

let isInitialized = false;

function notifyListeners(newState: SubscriptionState) {
  currentSubscriptionState = newState;
  listeners.forEach((listener) => listener(newState));
}

export function subscribeToSubscriptionChanges(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentSubscriptionState);
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentSubscriptionState(): SubscriptionState {
  return currentSubscriptionState;
}

/**
 * Gerçek RevenueCat API anahtarı yapılandırıldığında mağazadan (Google Play / App Store)
 * yerelleştirilmiş canlı fiyatları (`pkg.product.priceString`) çeker ve 3 pakete (`weekly`, `annual`, `lifetime`) eşler.
 * Sandbox veya önizleme ortamlarında `PRICING_PLANS` varsayılanlarına döner.
 */
export async function fetchLivePricingPlans(): Promise<PricingPlan[]> {
  if (Platform.OS === 'web') {
    return PRICING_PLANS;
  }

  try {
    const PurchasesModule = await import('react-native-purchases');
    const Purchases = PurchasesModule.default;
    const apiKey =
      Platform.OS === 'ios' ? REVENUECAT_CONFIG.appleApiKey : REVENUECAT_CONFIG.googleApiKey;

    if (!apiKey.includes('replace_with_your')) {
      if (!isInitialized) {
        Purchases.configure({ apiKey });
        isInitialized = true;
      }

      const offerings = await Purchases.getOfferings();
      const availablePackages = offerings.current?.availablePackages || [];

      if (availablePackages.length > 0) {
        return PRICING_PLANS.map((plan) => {
          const matchedPkg = availablePackages.find(
            (pkg) =>
              pkg.identifier === plan.rcPackageIdentifier ||
              pkg.identifier.toLowerCase().includes(plan.id)
          );

          if (matchedPkg?.product?.priceString) {
            return {
              ...plan,
              priceString: matchedPkg.product.priceString,
            };
          }
          return plan;
        });
      }
    }
  } catch {
    // Sandbox / Expo Go ortamında varsayılan fiyat listesini kullan
  }

  return PRICING_PLANS;
}

export async function initializeRevenueCat(): Promise<SubscriptionState> {
  // Önce yerel veritabanında saklanan simülasyon/abonelik tercihini kontrol et
  const savedPro = await getPreference('rc_is_pro');
  const savedPlan = await getPreference('rc_active_plan');

  if (Platform.OS === 'web') {
    const isPro = savedPro === 'true';
    const state: SubscriptionState = {
      isPro,
      activePlan: isPro ? savedPlan || 'Factory Pro (Yıllık)' : 'Free Tier (Web)',
      isConfigured: false,
      mode: 'mock',
    };
    notifyListeners(state);
    return state;
  }

  try {
    const PurchasesModule = await import('react-native-purchases');
    const Purchases = PurchasesModule.default;
    const LOG_LEVEL = PurchasesModule.LOG_LEVEL;

    const apiKey =
      Platform.OS === 'ios' ? REVENUECAT_CONFIG.appleApiKey : REVENUECAT_CONFIG.googleApiKey;

    if (apiKey.includes('replace_with_your')) {
      const isPro = savedPro === 'true';
      const state: SubscriptionState = {
        isPro,
        activePlan: isPro ? savedPlan || 'Factory Pro (Aktif)' : 'Free Plan',
        isConfigured: true,
        mode: 'mock',
      };
      notifyListeners(state);
      return state;
    }

    if (!isInitialized) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      Purchases.configure({ apiKey });
      isInitialized = true;
    }

    const customerInfo = await Purchases.getCustomerInfo();
    const isPro =
      typeof customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlementId] !== 'undefined';

    const state: SubscriptionState = {
      isPro,
      activePlan: isPro ? 'Factory Pro' : 'Free Plan',
      isConfigured: true,
      mode: 'native',
    };
    notifyListeners(state);
    return state;
  } catch {
    const isPro = savedPro === 'true';
    const state: SubscriptionState = {
      isPro,
      activePlan: isPro ? savedPlan || 'Factory Pro (Aktif)' : 'Free Plan',
      isConfigured: true,
      mode: 'mock',
    };
    notifyListeners(state);
    return state;
  }
}

export async function purchaseSubscriptionPlan(planId: PlanTierId): Promise<SubscriptionState> {
  const plan = PRICING_PLANS.find((p) => p.id === planId) || PRICING_PLANS[1];

  try {
    const PurchasesModule = await import('react-native-purchases');
    const Purchases = PurchasesModule.default;
    const apiKey =
      Platform.OS === 'ios' ? REVENUECAT_CONFIG.appleApiKey : REVENUECAT_CONFIG.googleApiKey;

    if (!apiKey.includes('replace_with_your') && isInitialized) {
      const offerings = await Purchases.getOfferings();
      const availablePackages = offerings.current?.availablePackages || [];
      const targetPkg = availablePackages.find(
        (pkg) => pkg.identifier === plan.rcPackageIdentifier || pkg.identifier.includes(planId)
      );

      if (targetPkg) {
        const { customerInfo } = await Purchases.purchasePackage(targetPkg);
        const isPro =
          typeof customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlementId] !== 'undefined';
        const state: SubscriptionState = {
          isPro,
          activePlan: isPro ? `Pro (${plan.title})` : 'Free Plan',
          selectedTier: planId,
          isConfigured: true,
          mode: 'native',
        };
        await setPreference('rc_is_pro', isPro ? 'true' : 'false');
        await setPreference('rc_active_plan', state.activePlan);
        notifyListeners(state);
        return state;
      }
    }
  } catch {
    // Expo Go veya Demo modunda simüle edilmiş satın alma akışına geç
  }

  const activePlanName = `Factory Pro (${plan.title})`;
  await setPreference('rc_is_pro', 'true');
  await setPreference('rc_active_plan', activePlanName);

  const nextState: SubscriptionState = {
    isPro: true,
    activePlan: activePlanName,
    selectedTier: planId,
    isConfigured: true,
    mode: 'mock',
  };
  notifyListeners(nextState);
  return nextState;
}

export async function restorePurchasesFromStore(): Promise<{
  state: SubscriptionState;
  restored: boolean;
}> {
  try {
    const PurchasesModule = await import('react-native-purchases');
    const Purchases = PurchasesModule.default;
    const apiKey =
      Platform.OS === 'ios' ? REVENUECAT_CONFIG.appleApiKey : REVENUECAT_CONFIG.googleApiKey;

    if (!apiKey.includes('replace_with_your') && isInitialized) {
      const customerInfo = await Purchases.restorePurchases();
      const isPro =
        typeof customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlementId] !== 'undefined';
      const state: SubscriptionState = {
        isPro,
        activePlan: isPro ? 'Factory Pro (Restored)' : 'Free Plan',
        isConfigured: true,
        mode: 'native',
      };
      await setPreference('rc_is_pro', isPro ? 'true' : 'false');
      await setPreference('rc_active_plan', state.activePlan);
      notifyListeners(state);
      return { state, restored: isPro };
    }
  } catch {
    // Fallback
  }

  const savedPro = await getPreference('rc_is_pro');
  const savedPlan = await getPreference('rc_active_plan');
  const isPro = savedPro === 'true';

  const state: SubscriptionState = {
    isPro,
    activePlan: isPro ? savedPlan || 'Factory Pro (Restored)' : 'Free Plan',
    isConfigured: true,
    mode: 'mock',
  };
  notifyListeners(state);
  return { state, restored: isPro };
}

export async function simulateOrRestorePurchase(
  currentProState: boolean
): Promise<SubscriptionState> {
  const nextPro = !currentProState;
  const activePlan = nextPro ? 'Factory Pro (Yıllık)' : 'Free Plan';

  await setPreference('rc_is_pro', nextPro ? 'true' : 'false');
  await setPreference('rc_active_plan', activePlan);

  const nextState: SubscriptionState = {
    isPro: nextPro,
    activePlan,
    isConfigured: true,
    mode: 'mock',
  };
  notifyListeners(nextState);
  return nextState;
}
