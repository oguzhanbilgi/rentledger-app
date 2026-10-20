import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Crown,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Tv,
  X,
  Zap,
} from 'lucide-react-native';

import { showInterstitialAdIfEligible } from '@/services/ads';
import { SmartAdBanner } from './smart-ad-banner';

type AdTriggerListener = () => void;
const adTriggerListeners = new Set<AdTriggerListener>();

/**
 * Uygulamanın herhangi bir yerinden (örn. teklif kaydedildiğinde veya katalog eklendiğinde)
 * tam ekran reklam + "Reklamsız için PRO alabilirsiniz" penceresini tetiklemek için çağrılır.
 */
export function requestInterstitialAdWithUpsell() {
  adTriggerListeners.forEach((listener) => listener());
}

export interface PeriodicAdAndUpsellModalProps {
  isPro: boolean;
  onOpenPaywall: (reason: string) => void;
}

const TEN_MINUTES_MS = 10 * 60 * 1000;

export function PeriodicAdAndUpsellModal({
  isPro,
  onOpenPaywall,
}: PeriodicAdAndUpsellModalProps) {
  const [fallbackAdVisible, setFallbackAdVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [upsellVisible, setUpsellVisible] = useState(false);
  const isShowingRef = useRef(false);

  const runAdThenUpsell = useCallback(async () => {
    if (isPro || isShowingRef.current) {
      return;
    }
    isShowingRef.current = true;

    try {
      // Önce gerçek AdMob Tam Ekran (Interstitial) reklamını dene
      const shownNative = await showInterstitialAdIfEligible(false);

      if (shownNative) {
        // Gerçek AdMob reklamı kapandığı anda "Reklamsız için PRO alabilirsiniz" penceresini aç
        setUpsellVisible(true);
        isShowingRef.current = false;
      } else {
        // Eğer AdMob test/ağ nedeniyle dolmadıysa uygulama içi tam ekran reklamı göster,
        // ardından "Reklamsız için PRO alabilirsiniz" penceresini aç
        setCountdown(5);
        setFallbackAdVisible(true);
      }
    } catch {
      isShowingRef.current = false;
    }
  }, [isPro]);

  // 1) Her 10 dakikada bir otomatik tam ekran reklam + PRO teklifi
  useEffect(() => {
    if (isPro) {
      setFallbackAdVisible(false);
      setUpsellVisible(false);
      isShowingRef.current = false;
      return;
    }

    const intervalId = setInterval(() => {
      runAdThenUpsell();
    }, TEN_MINUTES_MS);

    return () => clearInterval(intervalId);
  }, [isPro, runAdThenUpsell]);

  // 2) İşlem sonrası (Teklif kaydetme vb.) tetiklenen reklam dinleyicisi
  useEffect(() => {
    const listener = () => {
      runAdThenUpsell();
    };
    adTriggerListeners.add(listener);
    return () => {
      adTriggerListeners.delete(listener);
    };
  }, [runAdThenUpsell]);

  // 5 saniyelik tam ekran yedek reklam geri sayımı
  useEffect(() => {
    if (!fallbackAdVisible) return;
    if (countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [fallbackAdVisible, countdown]);

  const handleCloseFallbackAd = () => {
    if (countdown > 0) return;
    setFallbackAdVisible(false);
    // Reklam kapanır kapanmaz "Reklamsız için PRO alabilirsiniz" mesajını göster!
    setUpsellVisible(true);
    isShowingRef.current = false;
  };

  const handleCloseUpsell = () => {
    setUpsellVisible(false);
    isShowingRef.current = false;
  };

  const handleUpgradeToPro = () => {
    setFallbackAdVisible(false);
    setUpsellVisible(false);
    isShowingRef.current = false;
    onOpenPaywall(
      'Reklamsız ve kesintisiz kullanım için VeloQuote PRO (Aylık / Yıllık / Ömür Boyu) paketlerinden birini seçebilirsiniz.'
    );
  };

  if (isPro) {
    return null;
  }

  return (
    <>
      {/* 1. Tam Ekran Sponsorlu Reklam Ekranı (AdMob yüklenemediğinde devreye girer) */}
      <Modal
        visible={fallbackAdVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={handleCloseFallbackAd}>
        <SafeAreaView className="flex-1 bg-[#070b14] justify-between p-5">
          {/* Üst Bar: Reklam Etiketi & Geri Sayım / Kapat */}
          <View className="flex-row items-center justify-between pt-2">
            <View className="flex-row items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40">
              <Tv size={15} color="#fbbf24" />
              <Text className="text-xs font-extrabold text-amber-400">
                SPONSORLU REKLAM
              </Text>
            </View>

            <Pressable
              onPress={handleCloseFallbackAd}
              disabled={countdown > 0}
              className={`px-4 py-2 rounded-full flex-row items-center gap-1.5 ${
                countdown > 0
                  ? 'bg-slate-800 border border-slate-700'
                  : 'bg-white'
              }`}>
              {countdown > 0 ? (
                <Text className="text-xs font-extrabold text-slate-300">
                  Reklamı Kapat ({countdown} sn)
                </Text>
              ) : (
                <>
                  <X size={16} color="#0f172a" />
                  <Text className="text-xs font-extrabold text-slate-950">
                    Reklamı Kapat
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Orta Reklam İçeriği */}
          <View className="items-center justify-center px-3">
            <View className="w-20 h-20 rounded-3xl bg-indigo-600/25 border-2 border-indigo-500 items-center justify-center mb-5">
              <Megaphone size={38} color="#818cf8" />
            </View>

            <Text className="text-2xl font-extrabold text-white text-center mb-2">
              İşinizi Büyüten Kurumsal Teklifler
            </Text>
            <Text className="text-base text-slate-300 text-center leading-relaxed mb-6">
              Müşterilerinize kendi şirket logonuz, kaşeniz ve IBAN bilginizle
              saniyeler içinde güven veren PDF teklifler gönderin.
            </Text>

            <View className="w-full mb-4">
              <SmartAdBanner
                isPro={false}
                onUpgradePress={handleUpgradeToPro}
              />
            </View>

            <Pressable
              onPress={handleUpgradeToPro}
              className="w-full py-4 rounded-2xl bg-amber-400 items-center justify-center flex-row gap-2 shadow-lg active:opacity-90">
              <Crown size={20} color="#0f172a" />
              <Text className="text-base font-extrabold text-slate-950">
                Reklamları Kaldır & PRO&apos;ya Geç
              </Text>
            </Pressable>
          </View>

          {/* Alt Bilgi */}
          <Text className="text-xs text-slate-500 text-center pb-2">
            Ücretsiz sürümde reklamlar gösterilir • PRO ile tamamen reklamsızdır
          </Text>
        </SafeAreaView>
      </Modal>

      {/* 2. Reklam Sonrası Açılan "Reklamsız İçin PRO Alabilirsiniz" Teklif Penceresi */}
      <Modal
        visible={upsellVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseUpsell}>
        <View className="flex-1 bg-black/80 justify-center px-5">
          <View className="rounded-3xl bg-[#0f172a] border-2 border-indigo-500/50 p-6 shadow-2xl">
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 items-center justify-center mb-3">
                <Crown size={32} color="#fbbf24" />
              </View>

              <View className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 mb-2">
                <Text className="text-xs font-extrabold text-indigo-300">
                  REKLAMSIZ DENEYİM
                </Text>
              </View>

              <Text className="text-2xl font-extrabold text-white text-center">
                Reklamsız Kullanım İçin PRO Alabilirsiniz
              </Text>
              <Text className="text-sm text-slate-300 text-center mt-2 leading-relaxed">
                Reklamları beklemek istemiyor musunuz?{' '}
                <Text className="font-extrabold text-amber-300">
                  Haftalık, Aylık, Yıllık veya Ömür Boyu
                </Text>{' '}
                PRO paketlerimizden birini seçerek tüm reklamları kalıcı olarak
                kaldırabilir ve sınırsız PDF üretebilirsiniz!
              </Text>
            </View>

            <View className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 mb-5 gap-2">
              <View className="flex-row items-center gap-2.5">
                <ShieldCheck size={18} color="#34d399" />
                <Text className="text-sm font-bold text-slate-200 flex-1">
                  Tüm tam ekran ve alt bant reklamları kapatır
                </Text>
              </View>
              <View className="flex-row items-center gap-2.5">
                <Sparkles size={18} color="#fbbf24" />
                <Text className="text-sm font-bold text-slate-200 flex-1">
                  Sınırsız, filigransız ve IBAN antetli PDF oluşturur
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleUpgradeToPro}
              className="w-full py-4 rounded-2xl bg-indigo-600 items-center justify-center flex-row gap-2 mb-3 shadow-lg active:opacity-90">
              <Zap size={19} color="#fde047" />
              <Text className="text-base font-extrabold text-white">
                PRO Paketleri İncele (Aylık / Yıllık)
              </Text>
            </Pressable>

            <Pressable
              onPress={handleCloseUpsell}
              className="w-full py-3 rounded-xl bg-slate-800/80 items-center justify-center active:opacity-75">
              <Text className="text-sm font-bold text-slate-300">
                Şimdilik Reklamlı Devam Et
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
