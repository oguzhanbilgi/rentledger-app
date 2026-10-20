import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { Crown, Sparkles, Video, X } from 'lucide-react-native';
import { AppLanguage } from '@/services/i18n';
import { showRewardedAdForUnlock } from '@/services/ads';
import { grantBonusReceipt } from '@/services/database';

interface ReceiptGateModalProps {
  visible: boolean;
  onClose: () => void;
  onUnlocked: () => void;
  onOpenPaywall: () => void;
  remainingFree: number;
  totalAllowed: number;
  lang: AppLanguage;
}

export function ReceiptGateModal({
  visible,
  onClose,
  onUnlocked,
  onOpenPaywall,
  remainingFree,
  totalAllowed,
  lang,
}: ReceiptGateModalProps) {
  const isTr = lang === 'tr';
  const [loadingAd, setLoadingAd] = useState(false);

  const handleWatchRewardedAd = async () => {
    setLoadingAd(true);
    try {
      const res = await showRewardedAdForUnlock();
      if (res.rewarded) {
        await grantBonusReceipt();
        onUnlocked();
        onClose();
      }
    } finally {
      setLoadingAd(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/75 items-center justify-center p-4">
        <View className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
          {/* Close */}
          <Pressable
            onPress={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 active:opacity-70 z-10">
            <X size={16} color="#64748b" />
          </Pressable>

          {/* Badge */}
          <View className="w-14 h-14 rounded-2xl bg-amber-500/15 items-center justify-center mb-4 self-center">
            <Crown size={28} color="#f59e0b" />
          </View>

          <Text className="text-lg font-black text-slate-900 dark:text-white text-center mb-1">
            {isTr ? 'Ücretsiz Makbuz Hakkınız Doldu' : 'Free Receipt Limit Reached'}
          </Text>

          <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mb-5 leading-5">
            {isTr
              ? `Ücretsiz planda tanımlı ${totalAllowed} adet makbuz hakkınızı kullandınız. Aşağıdaki seçeneklerden biriyle devam edebilirsiniz:`
              : `You have used your ${totalAllowed} free receipts. Choose an option below to continue:`}
          </Text>

          {/* Option 1: Watch Rewarded Ad */}
          <Pressable
            onPress={handleWatchRewardedAd}
            disabled={loadingAd}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex-row items-center justify-center gap-2 mb-3 active:opacity-80">
            {loadingAd ? (
              <ActivityIndicator color="#10b981" />
            ) : (
              <>
                <Video size={18} color="#10b981" />
                <Text className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                  {isTr ? 'Reklam İzle (+1 Makbuz Kazan)' : 'Watch Video Ad (+1 Receipt)'}
                </Text>
              </>
            )}
          </Pressable>

          {/* Option 2: Go PRO */}
          <Pressable
            onPress={() => {
              onClose();
              onOpenPaywall();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-400 active:opacity-85 flex-row items-center justify-center gap-2 shadow-md">
            <Sparkles size={16} color="#0f172a" />
            <Text className="text-xs font-extrabold text-slate-950">
              {isTr ? "Sınırsız Makbuz İçin PRO'ya Geç" : 'Upgrade to PRO for Unlimited'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
