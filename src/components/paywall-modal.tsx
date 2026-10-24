import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Crown, RotateCcw, X } from 'lucide-react-native';

import { LegalModal, type LegalDocType } from '@/components/legal-modal';
import { Button } from '@/components/ui/button';
import { useThemeColors } from '@/constants/theme';
import { triggerHaptic } from '@/services/haptics';
import { brandParams, useI18n, type TranslationKey } from '@/services/i18n';
import {
  loadPaywallPlans,
  purchasePlan,
  restorePurchases,
  type PaywallPlan,
  type PlanKind,
  type PurchasesMode,
} from '@/services/revenuecat';

export interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  /** Paywall'u açan bağlam (ör. "Ücretsiz haklarınız bitti"). */
  reason?: string;
  /** Uygulamaya özel fayda maddeleri; verilmezse genel maddeler gösterilir. */
  benefits?: string[];
}

const PLAN_LABEL: Record<PlanKind, TranslationKey> = {
  weekly: 'planWeekly',
  monthly: 'planMonthly',
  annual: 'planAnnual',
  lifetime: 'planLifetime',
  other: 'planOther',
};

const PLAN_PERIOD: Record<PlanKind, TranslationKey | null> = {
  weekly: 'periodWeek',
  monthly: 'periodMonth',
  annual: 'periodYear',
  lifetime: 'periodOnce',
  other: null,
};

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; plans: PaywallPlan[]; mode: PurchasesMode }
  | { status: 'unavailable' };

export function PaywallModal({ visible, onClose, reason, benefits }: PaywallModalProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocType | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoad({ status: 'loading' });
    const result = await loadPaywallPlans();
    if (result.status === 'ok') {
      setLoad({ status: 'ready', plans: result.plans, mode: result.mode });
      const preferred = result.plans.find((plan) => plan.isBestValue) ?? result.plans[0];
      setSelectedId(preferred?.id ?? null);
    } else {
      setLoad({ status: 'unavailable' });
    }
  }, []);

  useEffect(() => {
    if (visible) {
      void fetchPlans();
    }
  }, [visible, fetchPlans]);

  const selectedPlan =
    load.status === 'ready' ? load.plans.find((plan) => plan.id === selectedId) ?? null : null;

  const handlePurchase = async () => {
    if (!selectedPlan) return;
    setPurchasing(true);
    const outcome = await purchasePlan(selectedPlan.id);
    setPurchasing(false);

    switch (outcome.status) {
      case 'success':
        triggerHaptic.success();
        Alert.alert(t('purchaseSuccessTitle'), t('purchaseSuccessBody'), [
          { text: t('ok'), onPress: onClose },
        ]);
        break;
      case 'pending':
        Alert.alert(t('purchasePendingTitle'), t('purchasePendingBody'));
        break;
      case 'cancelled':
        break;
      case 'error':
        triggerHaptic.warning();
        Alert.alert(t('errorTitle'), t('purchaseFailed'));
        break;
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const outcome = await restorePurchases();
    setRestoring(false);
    if (outcome.status === 'restored') {
      triggerHaptic.success();
      Alert.alert(t('purchaseSuccessTitle'), t('restoreSuccess'), [
        { text: t('ok'), onPress: onClose },
      ]);
    } else if (outcome.status === 'not_found') {
      Alert.alert(t('restorePurchases'), t('restoreNotFound'));
    } else {
      Alert.alert(t('errorTitle'), t('tryAgainLater'));
    }
  };

  const benefitList = benefits ?? [
    t('paywallBenefitUnlimited'),
    t('paywallBenefitNoAds'),
    t('paywallBenefitBranding'),
    t('paywallBenefitSupport'),
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
          <View className="flex-row items-center gap-1.5 rounded-full border border-warning/40 bg-warning/15 px-3 py-1">
            <Crown size={14} color={colors.warning} />
            <Text className="text-xs font-bold text-warning">{t('paywallBadge')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            onPress={onClose}
            hitSlop={12}
            className="h-9 w-9 items-center justify-center rounded-full bg-elevated active:opacity-70 dark:bg-elevated-dark">
            <X size={18} color={colors.muted} />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
          {reason ? (
            <View className="mb-3 mt-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
              <Text className="text-[13px] font-semibold text-ink dark:text-ink-dark">{reason}</Text>
            </View>
          ) : null}

          <Text className="mt-2 text-[26px] font-extrabold leading-tight text-ink dark:text-ink-dark">
            {t('paywallTitle', brandParams())}
          </Text>
          <Text className="mt-2 text-[15px] leading-relaxed text-muted dark:text-muted-dark">
            {t('paywallSubtitle')}
          </Text>

          <View className="mt-5 gap-3">
            {benefitList.map((benefit) => (
              <View key={benefit} className="flex-row items-center gap-3">
                <View className="h-6 w-6 items-center justify-center rounded-full bg-accent/15">
                  <Check size={14} color={colors.accent} />
                </View>
                <Text className="flex-1 text-[15px] font-medium text-ink dark:text-ink-dark">{benefit}</Text>
              </View>
            ))}
          </View>

          <View className="mt-6 gap-3">
            {load.status === 'loading' ? (
              <View className="items-center py-8">
                <ActivityIndicator color={colors.primary} />
                <Text className="mt-3 text-sm text-muted dark:text-muted-dark">{t('paywallLoading')}</Text>
              </View>
            ) : null}

            {load.status === 'unavailable' ? (
              <View className="items-center rounded-3xl border border-line bg-surface p-5 dark:border-line-dark dark:bg-surface-dark">
                <Text className="text-center text-sm text-muted dark:text-muted-dark">
                  {t('paywallUnavailable')}
                </Text>
                <Button label={t('retry')} variant="secondary" onPress={fetchPlans} className="mt-4 self-stretch" />
              </View>
            ) : null}

            {load.status === 'ready'
              ? load.plans.map((plan) => {
                  const selected = plan.id === selectedId;
                  const period = PLAN_PERIOD[plan.kind];
                  return (
                    <Pressable
                      key={plan.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        triggerHaptic.selection();
                        setSelectedId(plan.id);
                      }}
                      className={`rounded-3xl border-2 p-4 ${
                        selected
                          ? 'border-primary bg-primary/10'
                          : 'border-line bg-surface dark:border-line-dark dark:bg-surface-dark'
                      }`}>
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-base font-bold text-ink dark:text-ink-dark">
                              {t(PLAN_LABEL[plan.kind])}
                            </Text>
                            {plan.isBestValue ? (
                              <View className="rounded-full bg-accent px-2 py-0.5">
                                <Text className="text-[10px] font-extrabold uppercase text-on-brand">
                                  {t('bestValue')}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          {plan.savingsPercent ? (
                            <Text className="mt-1 text-xs font-semibold text-accent">
                              {t('planSave', { percent: plan.savingsPercent })}
                            </Text>
                          ) : null}
                          {plan.kind === 'annual' && plan.pricePerMonthString ? (
                            <Text className="mt-0.5 text-xs text-muted dark:text-muted-dark">
                              {t('planPerMonth', { price: plan.pricePerMonthString })}
                            </Text>
                          ) : null}
                        </View>
                        <View className="items-end">
                          <Text className="text-lg font-extrabold text-ink dark:text-ink-dark">
                            {plan.priceString}
                          </Text>
                          {period ? (
                            <Text className="text-xs text-muted dark:text-muted-dark">{t(period)}</Text>
                          ) : null}
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              : null}
          </View>

          {load.status === 'ready' && load.mode === 'dev-preview' ? (
            <Text className="mt-3 text-center text-xs font-semibold text-warning">{t('devPreviewNotice')}</Text>
          ) : null}

          <Button
            label={t('paywallCta')}
            onPress={handlePurchase}
            loading={purchasing}
            disabled={!selectedPlan || restoring}
            className="mt-5"
          />

          <Pressable
            accessibilityRole="button"
            onPress={handleRestore}
            disabled={restoring || purchasing}
            className="mt-4 flex-row items-center justify-center gap-1.5 py-2 active:opacity-70">
            {restoring ? (
              <ActivityIndicator size="small" color={colors.muted} />
            ) : (
              <RotateCcw size={14} color={colors.muted} />
            )}
            <Text className="text-sm font-semibold text-muted dark:text-muted-dark">{t('restorePurchases')}</Text>
          </Pressable>

          <View className="mt-2 flex-row items-center justify-center gap-4">
            <Pressable onPress={() => setLegalDoc('terms')} className="py-2 active:opacity-70">
              <Text className="text-xs text-muted underline dark:text-muted-dark">{t('termsOfUse')}</Text>
            </Pressable>
            <Pressable onPress={() => setLegalDoc('privacy')} className="py-2 active:opacity-70">
              <Text className="text-xs text-muted underline dark:text-muted-dark">{t('privacyPolicy')}</Text>
            </Pressable>
          </View>

          <Text className="mt-2 text-center text-[11px] leading-4 text-faint dark:text-faint-dark">
            {t('subscriptionDisclaimer')}
          </Text>
        </ScrollView>

        <LegalModal visible={legalDoc !== null} initialDoc={legalDoc ?? 'privacy'} onClose={() => setLegalDoc(null)} />
      </SafeAreaView>
    </Modal>
  );
}
