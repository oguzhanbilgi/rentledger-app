import { useSyncExternalStore } from 'react';
import { Platform, TurboModuleRegistry } from 'react-native';
import { isRunningInExpoGo } from 'expo';

import { factory, getConfiguredAdUnits, isGoogleSampleAdId, type AdUnitIds } from '@/config';
import { getSubscriptionState } from '@/services/revenuecat';

/**
 * Google AdMob servisi (react-native-google-mobile-ads).
 *
 * Kurallar (Altın Şasi v2):
 *  - Geliştirmede (`__DEV__`) daima Google test birimleri; yayında yalnızca
 *    factory.config.js'deki gerçek birimler. Gerçek birim yoksa reklam GÖSTERİLMEZ.
 *  - UMP rıza formu (AEA/UK/CH) her açılışta toplanır; `canRequestAds` false iken
 *    SDK başlatılmaz ve reklam istenmez.
 *  - Ödüllü reklam, ödül YALNIZCA `EARNED_REWARD` olayı geldiyse verilir.
 *    Yüklenemeyen / yarıda kapatılan reklam ödül vermez.
 *  - Geçiş reklamları doğal kırılma anlarında, sıklık sınırıyla gösterilir.
 *  - Sahte "reklam" ekranı veya yer tutucu banner gösterilmez.
 *
 * React Compiler notu: bileşenler bu modülün değişken durumunu render sırasında
 * doğrudan okumamalı (derleyici sonucu ezberler). Her şey `useAds()` anlık
 * görüntüsünden okunur.
 */

type AdKind = keyof AdUnitIds;
type GoogleMobileAdsModule = typeof import('react-native-google-mobile-ads');

export interface AdsState {
  ready: boolean;
  /** Native modül yüklü mü? (Expo Go'da false) */
  nativeAvailable: boolean;
  /** UMP sonrası reklam istenebilir mi? */
  canRequestAds: boolean;
  /** Ayarlar'da "Reklam gizlilik tercihleri" gösterilmeli mi? */
  privacyOptionsRequired: boolean;
  /** Banner gösterilecekse birim kimliği, aksi halde null. */
  bannerUnitId: string | null;
  /** "Video izle" seçeneği sunulabilir mi? (geliştirmede simülasyon dahil) */
  rewardedAvailable: boolean;
}

export type RewardedOutcome =
  | { status: 'rewarded'; amount: number; simulated?: boolean }
  | { status: 'dismissed' }
  | { status: 'unavailable' };

const LOAD_TIMEOUT_MS = 10000;
const NATIVE_MODULE_NAME = 'RNGoogleMobileAdsModule';

type Listener = () => void;
const listeners = new Set<Listener>();
let state: AdsState = {
  ready: false,
  nativeAvailable: false,
  canRequestAds: false,
  privacyOptionsRequired: false,
  bannerUnitId: null,
  rewardedAvailable: false,
};
let gma: GoogleMobileAdsModule | null = null;
let initPromise: Promise<AdsState> | null = null;
let sdkInitialized = false;

function setState(patch: Partial<AdsState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function getAdsState(): AdsState {
  return state;
}

export function subscribeAds(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAds(): AdsState {
  return useSyncExternalStore(subscribeAds, getAdsState, getAdsState);
}

/**
 * Native modül yoksa (Expo Go, web) içe aktarmayı HİÇ denemez: kütüphane yüklenirken
 * `getEnforcing` hata fırlatır ve Metro bunu ölümcül hata olarak gösterir.
 */
async function loadModule(): Promise<GoogleMobileAdsModule | null> {
  if (gma) return gma;
  if (Platform.OS === 'web' || isRunningInExpoGo()) return null;
  if (TurboModuleRegistry.get(NATIVE_MODULE_NAME) == null) return null;
  try {
    const mod = await import('react-native-google-mobile-ads');
    if (!mod?.AdsConsent || !mod.default) return null;
    gma = mod;
    return gma;
  } catch {
    return null;
  }
}

/** Yüklenmiş modül (banner bileşeni için). Bileşende yalnızca `useAds()` hazır dediğinde okuyun. */
export function getLoadedAdsModule(): GoogleMobileAdsModule | null {
  return gma;
}

/** Bu derlemede kullanılacak birim kimliği; reklam gösterilmemesi gerekiyorsa null. */
export function getAdUnitId(kind: AdKind): string | null {
  if (__DEV__) {
    if (!gma) return null;
    const testIds = {
      banner: gma.TestIds.ADAPTIVE_BANNER,
      interstitial: gma.TestIds.INTERSTITIAL,
      rewarded: gma.TestIds.REWARDED,
    };
    return testIds[kind];
  }
  const id = getConfiguredAdUnits()[kind]?.trim();
  if (!id || isGoogleSampleAdId(id)) return null;
  return id;
}

function hasAnyRealAdUnit(): boolean {
  const units = getConfiguredAdUnits();
  return (['banner', 'interstitial', 'rewarded'] as const).some((kind) => {
    const id = units[kind]?.trim();
    return !!id && !isGoogleSampleAdId(id);
  });
}

/** Rıza + SDK durumuna göre bileşenlerin okuduğu türetilmiş alanları günceller. */
function publish(patch: Partial<AdsState>): void {
  const next = { ...state, ...patch };
  const adsUsable = next.nativeAvailable && next.canRequestAds && sdkInitialized;
  setState({
    ...patch,
    bannerUnitId: adsUsable ? getAdUnitId('banner') : null,
    // Native modül yoksa yalnızca geliştirmede simülasyon sunulur.
    rewardedAvailable: adsUsable ? getAdUnitId('rewarded') !== null : __DEV__ && !next.nativeAvailable,
  });
}

/**
 * Rıza toplar ve SDK'yı başlatır. Pro kullanıcılar için çağrılmamalıdır
 * (reklam yoksa rıza formu da gösterilmez).
 */
export function initAds(): Promise<AdsState> {
  if (!initPromise) {
    initPromise = startAds().catch((error) => {
      console.warn('[ads] Başlatılamadı:', error);
      publish({ ready: true, canRequestAds: false });
      return state;
    });
  }
  return initPromise;
}

async function initializeSdk(mod: GoogleMobileAdsModule): Promise<boolean> {
  if (sdkInitialized) return true;
  try {
    await mod.default().initialize();
    sdkInitialized = true;
  } catch (error) {
    console.warn('[ads] SDK başlatılamadı:', error);
  }
  return sdkInitialized;
}

async function startAds(): Promise<AdsState> {
  const mod = await loadModule();
  if (!mod) {
    publish({ ready: true, nativeAvailable: false, canRequestAds: false });
    return state;
  }
  if (!__DEV__ && !hasAnyRealAdUnit()) {
    console.warn('[ads] Gerçek AdMob birimi yapılandırılmamış; reklamlar kapalı.');
    publish({ ready: true, nativeAvailable: true, canRequestAds: false });
    return state;
  }

  try {
    await mod.AdsConsent.gatherConsent();
  } catch (error) {
    // Hata olsa bile önceki oturumun rızasıyla reklam denenebilir (Google önerisi).
    console.warn('[ads] Rıza bilgisi alınamadı:', error);
  }

  const info = await mod.AdsConsent.getConsentInfo().catch(() => null);
  const privacyOptionsRequired =
    info?.privacyOptionsRequirementStatus === mod.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  const canRequestAds = (info?.canRequestAds ?? false) && (await initializeSdk(mod));

  publish({ ready: true, nativeAvailable: true, canRequestAds, privacyOptionsRequired });
  return state;
}

/** Ayarlar → "Reklam gizlilik tercihleri". */
export async function openAdPrivacyOptions(): Promise<void> {
  const mod = await loadModule();
  if (!mod) return;
  try {
    const info = await mod.AdsConsent.showPrivacyOptionsForm();
    const canRequestAds = info.canRequestAds && (await initializeSdk(mod));
    publish({ canRequestAds });
  } catch (error) {
    console.warn('[ads] Gizlilik formu açılamadı:', error);
  }
}

function adsAllowedNow(kind: AdKind): string | null {
  if (getSubscriptionState().isPro) return null;
  if (!state.canRequestAds || !sdkInitialized) return null;
  return getAdUnitId(kind);
}

// ----------------------------- Ödüllü reklam -----------------------------

export async function showRewardedAd(): Promise<RewardedOutcome> {
  const mod = await loadModule();

  if (!mod) {
    // Yalnızca geliştirme (Expo Go / web): akışı test edebilmek için simülasyon.
    if (__DEV__) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return { status: 'rewarded', amount: 1, simulated: true };
    }
    return { status: 'unavailable' };
  }

  const unitId = adsAllowedNow('rewarded');
  if (!unitId) return { status: 'unavailable' };

  const ad = mod.RewardedAd.createForAdRequest(unitId);

  return new Promise<RewardedOutcome>((resolve) => {
    let settled = false;
    let rewardAmount: number | null = null;
    const unsubscribers: (() => void)[] = [];

    const finish = (outcome: RewardedOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      resolve(outcome);
    };

    const timer = setTimeout(() => finish({ status: 'unavailable' }), LOAD_TIMEOUT_MS);

    unsubscribers.push(
      ad.addAdEventListener(mod.RewardedAdEventType.LOADED, () => {
        clearTimeout(timer);
        ad.show().catch(() => finish({ status: 'unavailable' }));
      }),
      ad.addAdEventListener(mod.RewardedAdEventType.EARNED_REWARD, (reward) => {
        rewardAmount = reward?.amount ?? 1;
      }),
      ad.addAdEventListener(mod.AdEventType.CLOSED, () => {
        finish(
          rewardAmount !== null
            ? { status: 'rewarded', amount: rewardAmount }
            : { status: 'dismissed' }
        );
      }),
      ad.addAdEventListener(mod.AdEventType.ERROR, () => {
        // Gösterim sırasında ödül kazanıldıysa onu koru, yoksa ödül yok.
        finish(
          rewardAmount !== null
            ? { status: 'rewarded', amount: rewardAmount }
            : { status: 'unavailable' }
        );
      })
    );

    ad.load();
  });
}

// ----------------------------- Geçiş reklamı -----------------------------

let triggerCount = 0;
let shownThisSession = 0;
let lastShownAt = 0;

/**
 * Doğal kırılma anlarında (kayıt kaydedildi, PDF paylaşıldı) çağırın.
 * Sıklık sınırlarına uymuyorsa hiçbir şey yapmaz. Pro kullanıcıya asla gösterilmez.
 */
export async function maybeShowInterstitial(): Promise<boolean> {
  const rules = factory.monetization.interstitial;
  if (!rules.enabled) return false;

  triggerCount += 1;
  if (triggerCount % Math.max(1, rules.everyNthTrigger) !== 0) return false;
  if (shownThisSession >= rules.maxPerSession) return false;
  if (Date.now() - lastShownAt < rules.minIntervalSeconds * 1000) return false;

  const mod = await loadModule();
  const unitId = adsAllowedNow('interstitial');
  if (!mod || !unitId) return false;

  const ad = mod.InterstitialAd.createForAdRequest(unitId);
  const shown = await new Promise<boolean>((resolve) => {
    let settled = false;
    const unsubscribers: (() => void)[] = [];
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      resolve(value);
    };
    // Yükleme gecikirse kullanıcıyı bekletme: reklamsız devam et.
    const timer = setTimeout(() => finish(false), 5000);

    unsubscribers.push(
      ad.addAdEventListener(mod.AdEventType.LOADED, () => {
        clearTimeout(timer);
        ad.show().catch(() => finish(false));
      }),
      ad.addAdEventListener(mod.AdEventType.CLOSED, () => finish(true)),
      ad.addAdEventListener(mod.AdEventType.ERROR, () => finish(false))
    );
    ad.load();
  });

  if (shown) {
    shownThisSession += 1;
    lastShownAt = Date.now();
  }
  return shown;
}
