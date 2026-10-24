import { useSyncExternalStore } from 'react';

/** Web önizlemesi: reklam yok. API native sürümle aynıdır. */

export interface AdsState {
  ready: boolean;
  nativeAvailable: boolean;
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
  bannerUnitId: string | null;
  rewardedAvailable: boolean;
}

export type RewardedOutcome =
  | { status: 'rewarded'; amount: number; simulated?: boolean }
  | { status: 'dismissed' }
  | { status: 'unavailable' };

const state: AdsState = {
  ready: true,
  nativeAvailable: false,
  canRequestAds: false,
  privacyOptionsRequired: false,
  bannerUnitId: null,
  // Geliştirmede kota akışını test edebilmek için simüle edilir.
  rewardedAvailable: __DEV__,
};

export function getAdsState(): AdsState {
  return state;
}

export function subscribeAds(): () => void {
  return () => {};
}

export function useAds(): AdsState {
  return useSyncExternalStore(subscribeAds, getAdsState, getAdsState);
}

export function getLoadedAdsModule(): null {
  return null;
}

export function getAdUnitId(): null {
  return null;
}

export async function initAds(): Promise<AdsState> {
  return state;
}

export async function openAdPrivacyOptions(): Promise<void> {}

export async function showRewardedAd(): Promise<RewardedOutcome> {
  if (__DEV__) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { status: 'rewarded', amount: 1, simulated: true };
  }
  return { status: 'unavailable' };
}

export async function maybeShowInterstitial(): Promise<boolean> {
  return false;
}
