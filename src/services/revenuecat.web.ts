import { useSyncExternalStore } from 'react';

import { factory } from '@/config';

/**
 * Web önizlemesi: gerçek mağaza yok. Geliştirmede paywall akışı simüle edilir,
 * web yayın derlemesinde satın alma kapalıdır. API native sürümle birebir aynıdır.
 */

export type PurchasesMode = 'store' | 'dev-preview' | 'unavailable';

export interface SubscriptionState {
  ready: boolean;
  isPro: boolean;
  mode: PurchasesMode;
  activeProductId: string | null;
  expirationDate: string | null;
  willRenew: boolean;
  managementUrl: string | null;
}

export type PlanKind = 'weekly' | 'monthly' | 'annual' | 'lifetime' | 'other';

export interface PaywallPlan {
  id: string;
  kind: PlanKind;
  priceString: string;
  price: number;
  currencyCode: string;
  pricePerMonthString: string | null;
  savingsPercent: number | null;
  isBestValue: boolean;
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

type Listener = () => void;
const listeners = new Set<Listener>();
let state: SubscriptionState = {
  ready: true,
  isPro: false,
  mode: __DEV__ ? 'dev-preview' : 'unavailable',
  activeProductId: null,
  expirationDate: null,
  willRenew: false,
  managementUrl: null,
};

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

export async function initPurchases(): Promise<SubscriptionState> {
  return state;
}

export async function loadPaywallPlans(): Promise<OfferingsResult> {
  if (state.mode !== 'dev-preview') {
    return { status: 'unavailable', message: 'web_not_supported' };
  }
  const prices = factory.monetization.devPreviewPrices;
  const plans: PaywallPlan[] = (['annual', 'monthly', 'weekly', 'lifetime'] as const).map(
    (kind) => ({
      id: `dev_${kind}`,
      kind,
      priceString: prices[kind],
      price: 0,
      currencyCode: 'USD',
      pricePerMonthString: null,
      savingsPercent: null,
      isBestValue: kind === 'annual',
    })
  );
  return { status: 'ok', plans, mode: 'dev-preview' };
}

export async function purchasePlan(planId: string): Promise<PurchaseOutcome> {
  if (state.mode !== 'dev-preview') {
    return { status: 'error', message: 'web_not_supported' };
  }
  setState({ isPro: true, activeProductId: planId });
  return { status: 'success' };
}

export async function restorePurchases(): Promise<RestoreOutcome> {
  return state.isPro ? { status: 'restored' } : { status: 'not_found' };
}

export async function openManageSubscriptions(): Promise<void> {}

export function resetDevPreviewPurchase(): void {
  if (__DEV__) {
    setState({ isPro: false, activeProductId: null });
  }
}
