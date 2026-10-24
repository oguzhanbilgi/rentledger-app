import { useSyncExternalStore } from 'react';

import { factory } from '@/config';
import { getPref, setPref } from '@/services/database';
import { getSubscriptionState, subscribeSubscription } from '@/services/revenuecat';
import { toLocalDateKey } from '@/utils/date';

/**
 * Ücretsiz kullanım kotası (ör. ücretsiz PDF hakkı).
 *
 * - Hak YALNIZCA başarılı çıktıdan sonra düşülür: önce `canUseUnit()`, sonra
 *   çıktı üretilir, en son `consumeUnit()` çağrılır.
 * - Bonuslar günlük/toplam sınırlıdır; paylaşım doğrulanamadığı için en sıkı sınıra tabidir.
 * - Sayaçlar `quota_` / `bonus_` önekiyle saklanır ve "verileri sıfırla" ile silinmez.
 * - Bileşenler durumu yalnızca `useQuota()` ile okur (React Compiler, render içindeki
 *   `getQuota()` / `canGrantBonus()` çağrılarını ezberler ve bayatlatır).
 */

export type BonusSource = 'rewarded_ad' | 'share';

export interface QuotaSnapshot {
  unlimited: boolean;
  freeUnits: number;
  used: number;
  bonus: number;
  remaining: number;
  /** Bugün ödüllü reklam bonusu hâlâ kazanılabilir mi? */
  rewardedBonusAvailable: boolean;
  /** Paylaşım bonusu (günlük + toplam sınır) hâlâ kazanılabilir mi? */
  shareBonusAvailable: boolean;
}

export type BonusResult =
  | { granted: true; amount: number }
  | { granted: false; reason: 'disabled' | 'daily_limit' | 'total_limit' };

const USED_KEY = 'quota_used';
const BONUS_KEY = 'quota_bonus';
const SHARE_TOTAL_KEY = 'bonus_share_total';

const dailyKey = (source: BonusSource) => `bonus_${source}_${toLocalDateKey()}`;

type Listener = () => void;
const listeners = new Set<Listener>();
let snapshot: QuotaSnapshot | null = null;

function readInt(key: string): number {
  const value = Number.parseInt(getPref(key) ?? '0', 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function compute(): QuotaSnapshot {
  const { freeUnits } = factory.monetization.quota;
  const used = readInt(USED_KEY);
  const bonus = readInt(BONUS_KEY);
  return {
    unlimited: getSubscriptionState().isPro,
    freeUnits,
    used,
    bonus,
    remaining: Math.max(0, freeUnits + bonus - used),
    rewardedBonusAvailable: canGrantBonus('rewarded_ad').granted,
    shareBonusAvailable: canGrantBonus('share').granted,
  };
}

function notify(): void {
  snapshot = compute();
  listeners.forEach((listener) => listener());
}

export function getQuota(): QuotaSnapshot {
  if (!snapshot) snapshot = compute();
  return snapshot;
}

export function canUseUnit(): boolean {
  const quota = getQuota();
  return quota.unlimited || quota.remaining > 0;
}

/** Başarılı çıktıdan SONRA çağırın. Pro kullanıcıda sayaç artmaz. */
export async function consumeUnit(): Promise<void> {
  if (getSubscriptionState().isPro) return;
  await setPref(USED_KEY, String(readInt(USED_KEY) + 1));
  notify();
}

function limitsFor(source: BonusSource) {
  const q = factory.monetization.quota;
  return source === 'rewarded_ad'
    ? { amount: q.rewardedAdBonus, perDay: q.maxRewardedAdBonusesPerDay, total: Infinity }
    : { amount: q.shareBonus, perDay: q.maxShareBonusesPerDay, total: q.maxShareBonusesTotal };
}

export function canGrantBonus(source: BonusSource): BonusResult {
  const limits = limitsFor(source);
  if (limits.amount <= 0 || limits.perDay <= 0) return { granted: false, reason: 'disabled' };
  if (readInt(dailyKey(source)) >= limits.perDay) return { granted: false, reason: 'daily_limit' };
  if (source === 'share' && readInt(SHARE_TOTAL_KEY) >= limits.total) {
    return { granted: false, reason: 'total_limit' };
  }
  return { granted: true, amount: limits.amount };
}

/**
 * Doğrulanmış bir ödülden sonra çağırın (ödüllü reklamda `EARNED_REWARD`).
 */
export async function grantBonus(source: BonusSource): Promise<BonusResult> {
  const check = canGrantBonus(source);
  if (!check.granted) return check;

  await setPref(dailyKey(source), String(readInt(dailyKey(source)) + 1));
  if (source === 'share') {
    await setPref(SHARE_TOTAL_KEY, String(readInt(SHARE_TOTAL_KEY) + 1));
  }
  await setPref(BONUS_KEY, String(readInt(BONUS_KEY) + check.amount));
  notify();
  return check;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const unsubscribePurchases = subscribeSubscription(notify);
  return () => {
    listeners.delete(listener);
    unsubscribePurchases();
  };
}

export function useQuota(): QuotaSnapshot {
  return useSyncExternalStore(subscribe, getQuota, getQuota);
}

/**
 * Önbelleği tazeler: veritabanı yüklendikten sonra, "verileri sıfırla"dan sonra ve
 * kota kapısı her açıldığında (gün değişmiş olabilir) çağırın.
 */
export function refreshQuota(): void {
  notify();
}
