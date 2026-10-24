import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import { Crown, PlayCircle, Share2, X } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { factory } from '@/config';
import { useThemeColors } from '@/constants/theme';
import { showRewardedAd, useAds } from '@/services/ads';
import { grantBonus, refreshQuota, useQuota } from '@/services/credits';
import { triggerHaptic } from '@/services/haptics';
import { useI18n } from '@/services/i18n';
import { shareApp } from '@/services/share';

/**
 * Ücretsiz hak bitince açılan kapı: Pro'ya geç, ödüllü reklam (+1) veya
 * sınırlı paylaşım bonusu (+1). Ödül yalnızca doğrulanmış olaydan sonra verilir.
 */
export function QuotaGateModal({
  visible,
  onClose,
  onUpgrade,
  onCreditEarned,
}: {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  /** Bonus kazanıldıktan sonra (ör. bekleyen dışa aktarmayı sürdürmek için). */
  onCreditEarned?: () => void;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const snapshot = useQuota();
  const { rewardedAvailable } = useAds();
  const [busy, setBusy] = useState<'ad' | 'share' | null>(null);

  // Gün değişmiş olabilir: kapı her açıldığında bonus sınırlarını yeniden hesapla.
  useEffect(() => {
    if (visible) refreshQuota();
  }, [visible]);

  const { quota } = factory.monetization;
  const adAllowed = rewardedAvailable && snapshot.rewardedBonusAvailable;
  const shareAllowed = snapshot.shareBonusAvailable;

  const finishWithCredit = (amount: number) => {
    triggerHaptic.success();
    Alert.alert(t('rewardGranted', { count: amount }), undefined, [
      {
        text: t('continue'),
        onPress: () => {
          onClose();
          onCreditEarned?.();
        },
      },
    ]);
  };

  const handleWatchAd = async () => {
    setBusy('ad');
    const outcome = await showRewardedAd();
    if (outcome.status === 'rewarded') {
      const result = await grantBonus('rewarded_ad');
      setBusy(null);
      if (result.granted) {
        finishWithCredit(result.amount);
      } else {
        Alert.alert(t('adUnavailable'));
      }
      return;
    }
    setBusy(null);
    Alert.alert(outcome.status === 'dismissed' ? t('adNotCompleted') : t('adUnavailable'));
  };

  const handleShare = async () => {
    setBusy('share');
    const shared = await shareApp();
    if (shared === 'shared') {
      const result = await grantBonus('share');
      setBusy(null);
      if (result.granted) {
        finishWithCredit(result.amount);
      } else {
        Alert.alert(t('shareLimitReached'));
      }
      return;
    }
    setBusy(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="rounded-t-[28px] bg-surface px-5 pb-10 pt-4 dark:bg-surface-dark">
          <View className="mb-2 flex-row justify-end">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('close')}
              onPress={onClose}
              hitSlop={12}
              className="h-9 w-9 items-center justify-center rounded-full bg-elevated active:opacity-70 dark:bg-elevated-dark">
              <X size={18} color={colors.muted} />
            </Pressable>
          </View>

          <Text className="text-[22px] font-extrabold text-ink dark:text-ink-dark">{t('quotaGateTitle')}</Text>
          <Text className="mt-2 text-[15px] leading-relaxed text-muted dark:text-muted-dark">
            {t('quotaGateBody')}
          </Text>

          <View className="mt-6 gap-3">
            <Button
              label={t('upgradeToPro')}
              icon={<Crown size={18} color={colors.onBrand} />}
              onPress={() => {
                onClose();
                onUpgrade();
              }}
              disabled={busy !== null}
            />
            {adAllowed ? (
              <Button
                label={t('watchAdForCredit', { count: quota.rewardedAdBonus })}
                variant="secondary"
                icon={<PlayCircle size={18} color={colors.ink} />}
                onPress={handleWatchAd}
                loading={busy === 'ad'}
                disabled={busy !== null}
              />
            ) : null}
            {shareAllowed ? (
              <Button
                label={t('shareForCredit', { count: quota.shareBonus })}
                variant="ghost"
                icon={<Share2 size={18} color={colors.primary} />}
                onPress={handleShare}
                loading={busy === 'share'}
                disabled={busy !== null}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
