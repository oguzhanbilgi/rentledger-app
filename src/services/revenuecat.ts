import { useSyncExternalStore } from 'react';
import { Linking, Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesError,
  type PurchasesPackage,
} from 'react-native-purchases';

import { factory, getRevenueCatApiKey } from '@/config';

/**
 * RevenueCat abonelik servisi.
 *
 * Güvenlik kuralları (Altın Şasi v2):
 *  1. Pro YALNIZCA mağazadan gelen aktif entitlement ile açılır.
 *  2. İptal edilen / bekleyen / hatalı satın alma asla Pro vermez.
 *  3. Simüle satın alma sadece `__DEV__` + API anahtarı yokken (Expo Go/önizleme) çalışır.
 *  4. Fiyatlar her zaman mağazadan (offering) okunur; koda fiyat yazılmaz.
 */

export type PurchasesMode = 'store' | 'dev-preview' | 'unavailable';

export interface SubscriptionState {
  /** İlk entitlement kontrolü tamamlandı mı? */
  ready: boolean;
  isPro: boolean;
  mode: PurchasesMode;
  activeProductId: string | null;
  /** Ömür boyu satın almada null. */
  expirationDate: string | null;
  willRenew: boolean;
  managementUrl: string | null;
}

export type PlanKind = 'weekly' | 'monthly' | 'annual' | 'lifetime' | 'other';

/** Ücretsiz deneme süresi. Haftalar güne çevrilir (P1W → 7 gün), yıllar aya. */
export interface FreeTrial {
  unit: 'day' | 'month';
  count: number;
}

export interface PaywallPlan {
  id: string;
  kind: PlanKind;
  priceString: string;
  price: number;
  currencyCode: string;
  pricePerMonthString: string | null;
  /** En pahalı haftalık maliyete göre gerçek tasarruf yüzdesi (yoksa null). */
  savingsPercent: number | null;
  isBestValue: boolean;
  /**
   * Bu kullanıcının bu planda alabileceği ücretsiz deneme; yoksa null.
   * Mağazada tanımlı ve kullanıcı uygunsa dolu gelir (koda deneme süresi yazılmaz).
   */
  freeTrial: FreeTrial | null;
}

export type OfferingsResult =
  | { status: 'ok'; plans: PaywallPlan[]; mode: PurchasesMode }
  | { status: 'unavailable'; message: string };

export type PurchaseOutcome =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'pending' }
  | { status: 'error'; message: string; code?: string };

export type RestoreOutcome =
  | { status: 'restored' }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

const INITIAL_STATE: SubscriptionState = {
  ready: false,
  isPro: false,
  mode: 'unavailable',
  activeProductId: null,
  expirationDate: null,
  willRenew: false,
  managementUrl: null,
};

type Listener = () => void;
const listeners = new Set<Listener>();
let state: SubscriptionState = INITIAL_STATE;
let initPromise: Promise<SubscriptionState> | null = null;
const packagesById = new Map<string, PurchasesPackage>();

function setState(patch: Partial<SubscriptionState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function getSubscriptionState(): SubscriptionState {
  return state;
}

export function subscribeSubscription(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSubscription(): SubscriptionState {
  return useSyncExternalStore(subscribeSubscription, getSubscriptionState, getSubscriptionState);
}

function applyCustomerInfo(info: CustomerInfo): void {
  const entitlement = info.entitlements.active[factory.monetization.revenueCat.entitlementId];
  setState({
    ready: true,
    mode: 'store',
    isPro: entitlement !== undefined,
    activeProductId: entitlement?.productIdentifier ?? null,
    expirationDate: entitlement?.expirationDate ?? null,
    willRenew: entitlement?.willRenew ?? false,
    managementUrl: info.managementURL ?? null,
  });
}

function hasUsableApiKey(apiKey: string): boolean {
  return apiKey.length > 0 && !apiKey.includes('replace');
}

/** Uygulama açılışında bir kez çağrılır (tekrar çağrılması güvenlidir). */
export function initPurchases(): Promise<SubscriptionState> {
  if (!initPromise) {
    initPromise = configure();
  }
  return initPromise;
}

async function configure(): Promise<SubscriptionState> {
  const apiKey = getRevenueCatApiKey();

  if (!hasUsableApiKey(apiKey)) {
    if (__DEV__) {
      setState({ ready: true, mode: 'dev-preview', isPro: false });
    } else {
      console.warn(`[purchases] ${Platform.OS} için RevenueCat anahtarı yok; satın alma kapalı.`);
      setState({ ready: true, mode: 'unavailable', isPro: false });
    }
    return state;
  }

  try {
    await Purchases.setLogLevel(
      __DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.WARN
    ).catch(() => {});
    Purchases.configure({ apiKey });
    Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
  } catch (error) {
    console.warn('[purchases] RevenueCat yapılandırılamadı:', error);
    setState({ ready: true, mode: 'unavailable', isPro: false });
    return state;
  }

  try {
    applyCustomerInfo(await Purchases.getCustomerInfo());
  } catch (error) {
    // Yapılandırıldı ama müşteri bilgisi alınamadı (ör. ilk açılışta çevrimdışı).
    // Dinleyicinin zaten bildirdiği Pro durumunu EZME; yalnızca hazır işaretle.
    console.warn('[purchases] Müşteri bilgisi alınamadı:', error);
    setState({ ready: true, mode: 'store' });
  }
  return state;
}

// ----------------------------- Paywall planları -----------------------------

function planKindOf(pkg: PurchasesPackage): PlanKind {
  switch (pkg.packageType) {
    case Purchases.PACKAGE_TYPE.WEEKLY:
      return 'weekly';
    case Purchases.PACKAGE_TYPE.MONTHLY:
      return 'monthly';
    case Purchases.PACKAGE_TYPE.ANNUAL:
      return 'annual';
    case Purchases.PACKAGE_TYPE.LIFETIME:
      return 'lifetime';
    default:
      return 'other';
  }
}

const KIND_ORDER: PlanKind[] = ['annual', 'monthly', 'weekly', 'lifetime', 'other'];

function weeklyCost(kind: PlanKind, price: number): number | null {
  switch (kind) {
    case 'weekly':
      return price;
    case 'monthly':
      return (price * 12) / 52;
    case 'annual':
      return price / 52;
    default:
      return null;
  }
}

function trialFromPeriod(unit: string, value: number): FreeTrial | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  switch (unit) {
    case 'DAY':
      return { unit: 'day', count: value };
    case 'WEEK':
      return { unit: 'day', count: value * 7 };
    case 'MONTH':
      return { unit: 'month', count: value };
    case 'YEAR':
      return { unit: 'month', count: value * 12 };
    default:
      return null;
  }
}

/**
 * Google Play: RevenueCat `defaultOption` olarak kullanıcının uygun olduğu en uzun
 * ücretsiz denemeyi seçer ve `purchasePackage` da bu seçeneği satın alır; Play,
 * uygun olmayan teklifleri hiç döndürmez.
 * App Store: tanıtım fiyatı ücretsizse ve RevenueCat kullanıcıyı uygun bulduysa.
 */
function freeTrialOf(pkg: PurchasesPackage, iosEligibleIds: Set<string>): FreeTrial | null {
  const { product } = pkg;
  if (Platform.OS === 'android') {
    const phase = product.defaultOption?.freePhase;
    return phase ? trialFromPeriod(phase.billingPeriod.unit, phase.billingPeriod.value) : null;
  }
  const intro = product.introPrice;
  if (!intro || intro.price !== 0 || !iosEligibleIds.has(product.identifier)) return null;
  return trialFromPeriod(intro.periodUnit, intro.periodNumberOfUnits * Math.max(1, intro.cycles));
}

async function iosTrialEligibleIds(packages: PurchasesPackage[]): Promise<Set<string>> {
  const candidates = packages
    .filter((pkg) => pkg.product.introPrice?.price === 0)
    .map((pkg) => pkg.product.identifier);
  if (Platform.OS !== 'ios' || candidates.length === 0) return new Set();
  try {
    const result = await Purchases.checkTrialOrIntroductoryPriceEligibility(candidates);
    const eligible = Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
    return new Set(candidates.filter((id) => result[id]?.status === eligible));
  } catch {
    // Uygunluk bilinmiyorsa deneme vaat etme.
    return new Set();
  }
}

/** Gerçek mağaza fiyatlarından tasarruf yüzdesi hesaplar; uydurma "%85" rozetleri yok. */
function withSavings(plans: Omit<PaywallPlan, 'savingsPercent' | 'isBestValue'>[]): PaywallPlan[] {
  const costs = plans
    .map((plan) => weeklyCost(plan.kind, plan.price))
    .filter((cost): cost is number => cost !== null && cost > 0);
  const maxWeekly = costs.length > 0 ? Math.max(...costs) : null;

  return plans
    .map((plan) => {
      const cost = weeklyCost(plan.kind, plan.price);
      const savings =
        maxWeekly && cost !== null && cost < maxWeekly
          ? Math.floor((1 - cost / maxWeekly) * 100)
          : null;
      return {
        ...plan,
        savingsPercent: savings !== null && savings >= 10 ? savings : null,
        isBestValue: plan.kind === 'annual',
      };
    })
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
}

function devPreviewPlans(): PaywallPlan[] {
  const prices = factory.monetization.devPreviewPrices;
  const parse = (value: string) => Number(value.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
  return withSavings(
    (['annual', 'monthly', 'weekly', 'lifetime'] as const).map((kind) => ({
      id: `dev_${kind}`,
      kind,
      priceString: prices[kind],
      price: parse(prices[kind]),
      currencyCode: 'USD',
      pricePerMonthString: null,
      // Önizlemede deneme metinlerini görmek için; yayında deneme yalnızca mağazadan gelir.
      freeTrial: kind === 'annual' ? ({ unit: 'day', count: 7 } as const) : null,
    }))
  );
}

export async function loadPaywallPlans(): Promise<OfferingsResult> {
  await initPurchases();

  if (state.mode === 'dev-preview') {
    return { status: 'ok', plans: devPreviewPlans(), mode: 'dev-preview' };
  }
  if (state.mode !== 'store') {
    return { status: 'unavailable', message: 'purchases_not_configured' };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const { offeringId } = factory.monetization.revenueCat;
    const offering = (offeringId && offerings.all[offeringId]) || offerings.current;
    const packages = offering?.availablePackages ?? [];
    if (packages.length === 0) {
      return { status: 'unavailable', message: 'no_packages' };
    }

    packagesById.clear();
    const iosEligibleIds = await iosTrialEligibleIds(packages);
    const plans = packages.map((pkg) => {
      packagesById.set(pkg.identifier, pkg);
      return {
        id: pkg.identifier,
        kind: planKindOf(pkg),
        priceString: pkg.product.priceString,
        price: pkg.product.price,
        currencyCode: pkg.product.currencyCode,
        pricePerMonthString: pkg.product.pricePerMonthString ?? null,
        freeTrial: freeTrialOf(pkg, iosEligibleIds),
      };
    });
    return { status: 'ok', plans: withSavings(plans), mode: 'store' };
  } catch (error) {
    return { status: 'unavailable', message: String((error as Error)?.message ?? error) };
  }
}

// ----------------------------- Satın alma -----------------------------

function isPurchasesError(error: unknown): error is PurchasesError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

export async function purchasePlan(planId: string): Promise<PurchaseOutcome> {
  await initPurchases();

  if (state.mode === 'dev-preview') {
    // Yalnızca geliştirme: gerçek mağaza olmadan akışı test etmek için.
    await new Promise((resolve) => setTimeout(resolve, 600));
    setState({ isPro: true, activeProductId: planId, expirationDate: null, willRenew: false });
    return { status: 'success' };
  }
  if (state.mode !== 'store') {
    return { status: 'error', message: 'purchases_not_configured' };
  }

  const pkg = packagesById.get(planId);
  if (!pkg) {
    return { status: 'error', message: 'package_not_found' };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    applyCustomerInfo(customerInfo);
    if (state.isPro) {
      return { status: 'success' };
    }
    // Ödeme alındı ama entitlement açılmadı → RevenueCat'te ürün entitlement'a bağlı değil.
    return { status: 'error', message: 'entitlement_not_active', code: 'ENTITLEMENT_NOT_ACTIVE' };
  } catch (error) {
    if (isPurchasesError(error)) {
      const codes = Purchases.PURCHASES_ERROR_CODE;
      if (error.code === codes.PURCHASE_CANCELLED_ERROR || error.userCancelled) {
        return { status: 'cancelled' };
      }
      if (error.code === codes.PAYMENT_PENDING_ERROR) {
        return { status: 'pending' };
      }
      if (error.code === codes.PRODUCT_ALREADY_PURCHASED_ERROR) {
        const restored = await restorePurchases();
        return restored.status === 'restored'
          ? { status: 'success' }
          : { status: 'error', message: error.message, code: error.code };
      }
      return { status: 'error', message: error.message, code: error.code };
    }
    return { status: 'error', message: String(error) };
  }
}

export async function restorePurchases(): Promise<RestoreOutcome> {
  await initPurchases();

  if (state.mode === 'dev-preview') {
    return state.isPro ? { status: 'restored' } : { status: 'not_found' };
  }
  if (state.mode !== 'store') {
    return { status: 'error', message: 'purchases_not_configured' };
  }

  try {
    applyCustomerInfo(await Purchases.restorePurchases());
    return state.isPro ? { status: 'restored' } : { status: 'not_found' };
  } catch (error) {
    return {
      status: 'error',
      message: isPurchasesError(error) ? error.message : String(error),
    };
  }
}

/** Mağazanın abonelik yönetim sayfasını açar. */
export async function openManageSubscriptions(): Promise<void> {
  const url =
    state.managementUrl ??
    (Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : `https://play.google.com/store/account/subscriptions?package=${factory.app.androidPackage}`);
  await Linking.openURL(url).catch(() => {});
}

/** Yalnızca geliştirme: Pro durumunu sıfırlar (dev-preview modunda). */
export function resetDevPreviewPurchase(): void {
  if (__DEV__ && state.mode === 'dev-preview') {
    setState({ isPro: false, activeProductId: null });
  }
}
