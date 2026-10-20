import { getPreference, setPreference } from './database.web';
import type { PlanTierId, PricingPlan, SubscriptionState } from './revenuecat';

/**
 * Web Platformu için RevenueCat Yedek (Stub) Servisi
 */

export type { PlanTierId, PricingPlan, SubscriptionState };

export const REVENUECAT_CONFIG = {
  appleApiKey: 'web_mock_key',
  googleApiKey: 'web_mock_key',
  entitlementId: 'pro_access',
};

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

type Listener = (state: SubscriptionState) => void;
const listeners = new Set<Listener>();

let currentSubscriptionState: SubscriptionState = {
  isPro: false,
  activePlan: 'Free Plan (Web)',
  isConfigured: true,
  mode: 'mock',
};

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

export async function fetchLivePricingPlans(): Promise<PricingPlan[]> {
  return PRICING_PLANS;
}

export async function initializeRevenueCat(): Promise<SubscriptionState> {
  const savedPro = await getPreference('rc_is_pro');
  const savedPlan = await getPreference('rc_active_plan');
  const isPro = savedPro === 'true';

  const state: SubscriptionState = {
    isPro,
    activePlan: isPro ? savedPlan || 'Factory Pro (Yıllık)' : 'Free Plan (Web)',
    isConfigured: true,
    mode: 'mock',
  };
  notifyListeners(state);
  return state;
}

export async function purchaseSubscriptionPlan(planId: PlanTierId): Promise<SubscriptionState> {
  const plan = PRICING_PLANS.find((p) => p.id === planId) || PRICING_PLANS[1];
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
  const savedPro = await getPreference('rc_is_pro');
  const savedPlan = await getPreference('rc_active_plan');
  const isPro = savedPro === 'true';

  const state: SubscriptionState = {
    isPro,
    activePlan: isPro ? savedPlan || 'Factory Pro (Restored)' : 'Free Plan (Web)',
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
  const activePlan = nextPro ? 'Factory Pro (Yıllık)' : 'Free Plan (Web)';

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
