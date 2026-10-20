import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  Crown,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react-native';

import {
  getPricingPlans,
  PlanTierId,
  PricingPlan,
  purchaseSubscriptionPlan,
  restorePurchasesFromStore,
  SubscriptionState,
} from '@/services/revenuecat';
import { LegalDocType, LegalModal } from '@/components/legal-modal';
import { AppLanguage, getI18nState, subscribeI18n } from '@/services/i18n';

export interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: (newState: SubscriptionState) => void;
  triggerReason?: string;
}

const STRINGS = {
  tr: {
    proBadge: 'PRO ÜYELİK',
    title: 'Tüm Pro Özelliklerin Kilidini Aç',
    subtitle:
      'Sınırsız kullanım, reklamsız ekran ve tüm profesyonel araçlarla kira yönetimini hızlandırın.',
    ctaPrefix: "Pro'ya Geç —",
    successTitle: 'Tebrikler! 🎉',
    successMsg: (plan: string) => `${plan} aboneliğiniz başarıyla aktif edildi.`,
    great: 'Harika',
    errorTitle: 'Hata',
    errorMsg: 'Satın alma işlemi sırasında bir sorun oluştu.',
    restoreSuccessTitle: 'Satın Alımlar Geri Yüklendi',
    restoreSuccessMsg: 'Mevcut Pro aboneliğiniz başarıyla doğrulandı ve aktif edildi.',
    restoreNotFoundTitle: 'Kayıtlı Abonelik Bulunamadı',
    restoreNotFoundMsg: 'Bu hesaba bağlı aktif bir Pro satın alımı bulunamadı.',
    ok: 'Tamam',
    guarantee: 'Google Play Güvencesi',
    cancelAnytime: 'İstediğiniz Zaman İptal Edin',
    restoreBtn: 'Satın Alımları Geri Yükle',
    restoring: 'Geri Yükleniyor...',
    terms: 'Kullanım Koşulları',
    privacy: 'Gizlilik Politikası',
    disclaimer:
      'Abonelikler dönem bitiminden en az 24 saat önce iptal edilmediği sürece otomatik yenilenir. Mağaza hesap ayarlarınızdan dilediğiniz zaman iptal edebilirsiniz.',
    benefits: [
      {
        title: 'Sınırsız Mülk & Kiracı Kaydı',
        desc: 'Tüm daire, dükkan ve kiracılarınızı sınırsız olarak ekleyin ve yönetin',
      },
      {
        title: 'Sınırsız Resmi PDF Kira Makbuzu',
        desc: 'Kaşeli, imzalı ve tutarı yazıyla resmi tahsilat makbuzunu tek tıkla oluşturun',
      },
      {
        title: 'Filigransız Kurumsal Çıktı & IBAN Anteti',
        desc: 'Belgelerinizde kendi adınız, banka ve IBAN bilgileriniz yer alsın',
      },
      {
        title: '%100 Reklamsız Hızlı Deneyim',
        desc: 'Uygulama içindeki tüm reklamları kalıcı olarak kaldırın',
      },
      {
        title: 'WhatsApp ile Otomatik Kira Takibi',
        desc: 'Vadesi yaklaşan veya geciken kiracılara tek tuşla hatırlatma gönderin',
      },
    ],
  },
  en: {
    proBadge: 'PRO MEMBERSHIP',
    title: 'Unlock All Pro Features',
    subtitle:
      'Unlimited properties, ad-free experience, and official PDF receipts to streamline your rentals.',
    ctaPrefix: 'Upgrade to Pro —',
    successTitle: 'Congratulations! 🎉',
    successMsg: (plan: string) => `Your ${plan} subscription has been activated successfully.`,
    great: 'Awesome',
    errorTitle: 'Error',
    errorMsg: 'An issue occurred during the purchase process.',
    restoreSuccessTitle: 'Purchases Restored',
    restoreSuccessMsg: 'Your active Pro subscription was verified and activated.',
    restoreNotFoundTitle: 'No Subscription Found',
    restoreNotFoundMsg: 'No active Pro subscription found for this account.',
    ok: 'OK',
    guarantee: 'Google Play Secured',
    cancelAnytime: 'Cancel Anytime',
    restoreBtn: 'Restore Purchases',
    restoring: 'Restoring...',
    terms: 'Terms of Use',
    privacy: 'Privacy Policy',
    disclaimer:
      'Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in your Google Play Store account settings.',
    benefits: [
      {
        title: 'Unlimited Properties & Tenants',
        desc: 'Add and manage all your apartments, units, and tenants without limits',
      },
      {
        title: 'Unlimited Official PDF Receipts',
        desc: 'Generate signed & stamped payment receipts with amount-in-words instantly',
      },
      {
        title: 'Custom Landlord Header & IBAN',
        desc: 'Brand receipts with your own name, bank name, and IBAN details',
      },
      {
        title: '100% Ad-Free Experience',
        desc: 'Permanently remove all banner and interstitial ads across the app',
      },
      {
        title: 'Instant WhatsApp Rent Reminders',
        desc: 'Send rent due reminders to tenants with a single tap',
      },
    ],
  },
};

export function PaywallModal({
  visible,
  onClose,
  onPurchaseSuccess,
  triggerReason,
}: PaywallModalProps) {
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState<AppLanguage>(getI18nState().lang);
  const [selectedPlan, setSelectedPlan] = useState<PlanTierId>('annual');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalDocType, setLegalDocType] = useState<LegalDocType>('privacy');

  useEffect(() => {
    return subscribeI18n((state) => {
      setLang(state.lang);
    });
  }, []);

  const s = STRINGS[lang] || STRINGS.en;
  const plans = getPricingPlans(lang);
  const activePlanObj: PricingPlan =
    plans.find((p) => p.id === selectedPlan) || plans[1] || plans[0];

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const updatedState = await purchaseSubscriptionPlan(selectedPlan);
      onPurchaseSuccess?.(updatedState);
      Alert.alert(s.successTitle, s.successMsg(updatedState.activePlan), [
        { text: s.great, onPress: onClose },
      ]);
    } catch {
      Alert.alert(s.errorTitle, s.errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const { state, restored } = await restorePurchasesFromStore();
      onPurchaseSuccess?.(state);
      if (restored) {
        Alert.alert(s.restoreSuccessTitle, s.restoreSuccessMsg, [
          { text: s.ok, onPress: onClose },
        ]);
      } else {
        Alert.alert(s.restoreNotFoundTitle, s.restoreNotFoundMsg);
      }
    } finally {
      setRestoring(false);
    }
  };

  const handleOpenLegal = (type: LegalDocType) => {
    setLegalDocType(type);
    setLegalModalVisible(true);
  };

  const safeBottomPadding = Math.max(insets.bottom, 24) + 16;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-[#070a12]">
        <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
          <View className="flex-row items-center gap-1.5 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
            <Crown size={14} color="#fbbf24" />
            <Text className="text-xs font-bold text-amber-400">
              {s.proBadge}
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={12}
            className="w-9 h-9 rounded-full bg-slate-800/90 items-center justify-center active:opacity-70">
            <X size={18} color="#94a3b8" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: safeBottomPadding }}
          showsVerticalScrollIndicator={false}>
          {triggerReason ? (
            <View className="mt-2 mb-3 px-3.5 py-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex-row items-center gap-2">
              <Sparkles size={16} color="#818cf8" />
              <Text className="text-xs font-semibold text-indigo-200 flex-1">
                {triggerReason}
              </Text>
            </View>
          ) : null}

          <View className="items-center mt-2 mb-5">
            <View className="w-16 h-16 rounded-3xl bg-indigo-600/25 border border-indigo-500/40 items-center justify-center mb-3">
              <Crown size={32} color="#fbbf24" />
            </View>
            <Text className="text-2xl font-extrabold text-white text-center">
              {s.title}
            </Text>
            <Text className="text-xs text-slate-400 text-center mt-1.5 px-3 leading-relaxed">
              {s.subtitle}
            </Text>
          </View>

          <View className="rounded-3xl bg-[#111827] border border-slate-800/90 p-4 mb-5 gap-3">
            {s.benefits.map((benefit, idx) => (
              <View key={idx} className="flex-row items-start gap-3">
                <View className="w-6 h-6 rounded-full bg-emerald-500/20 items-center justify-center mt-0.5">
                  <Check size={14} color="#34d399" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-white">
                    {benefit.title}
                  </Text>
                  <Text className="text-[11px] text-slate-400 mt-0.5">
                    {benefit.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View className="gap-3 mb-5">
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => setSelectedPlan(plan.id)}
                  className={`rounded-3xl p-4 border-2 relative overflow-hidden ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-500'
                      : 'bg-[#111827]/90 border-slate-800'
                  }`}>
                  {plan.badge ? (
                    <View
                      className={`self-start px-2.5 py-0.5 rounded-full mb-2 ${
                        plan.highlight ? 'bg-amber-500' : 'bg-indigo-500/30'
                      }`}>
                      <Text
                        className={`text-[10px] font-extrabold tracking-wide ${
                          plan.highlight ? 'text-slate-950' : 'text-indigo-300'
                        }`}>
                        {plan.badge}
                      </Text>
                    </View>
                  ) : null}

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1 pr-2">
                      <View
                        className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                          isSelected
                            ? 'border-indigo-400 bg-indigo-500'
                            : 'border-slate-600'
                        }`}>
                        {isSelected ? <Check size={12} color="#ffffff" /> : null}
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-extrabold text-white">
                          {plan.title}
                        </Text>
                        <Text className="text-xs text-slate-400 mt-0.5">
                          {plan.subtitle}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <Text className="text-xl font-extrabold text-white">
                        {plan.priceString}
                      </Text>
                      <Text className="text-[11px] font-medium text-slate-400">
                        {plan.periodLabel}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handlePurchase}
            disabled={loading || restoring}
            className="w-full py-4 rounded-2xl bg-indigo-600 items-center justify-center flex-row gap-2 shadow-lg active:opacity-85">
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Zap size={18} color="#fde047" />
                <Text className="text-base font-extrabold text-white">
                  {s.ctaPrefix} {activePlanObj.priceString}{' '}
                  {activePlanObj.periodLabel}
                </Text>
              </>
            )}
          </Pressable>

          <View className="flex-row flex-wrap items-center justify-center gap-4 mt-3 mb-5">
            <View className="flex-row items-center gap-1">
              <ShieldCheck size={14} color="#34d399" />
              <Text className="text-[11px] text-slate-400">
                {s.guarantee}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Star size={14} color="#fbbf24" />
              <Text className="text-[11px] text-slate-400">
                {s.cancelAnytime}
              </Text>
            </View>
          </View>

          <View className="border-t border-slate-800/80 pt-4 items-center">
            <Pressable
              onPress={handleRestore}
              disabled={restoring}
              className="flex-row items-center justify-center gap-1.5 py-1.5 px-4 rounded-xl bg-slate-900 border border-slate-800 mb-3 active:opacity-70">
              <RotateCcw size={13} color="#94a3b8" />
              <Text className="text-xs font-semibold text-slate-200">
                {restoring ? s.restoring : s.restoreBtn}
              </Text>
            </Pressable>

            <View className="flex-row flex-wrap items-center justify-center gap-4 mb-3">
              <Pressable
                onPress={() => handleOpenLegal('terms')}
                className="active:opacity-70">
                <Text className="text-xs font-medium text-slate-400 underline">
                  {s.terms}
                </Text>
              </Pressable>

              <Text className="text-xs text-slate-600">•</Text>

              <Pressable
                onPress={() => handleOpenLegal('privacy')}
                className="active:opacity-70">
                <Text className="text-xs font-medium text-slate-400 underline">
                  {s.privacy}
                </Text>
              </Pressable>
            </View>

            <View className="flex-row items-center justify-center gap-1 px-2">
              <Lock size={11} color="#64748b" />
              <Text className="text-[10px] text-slate-500 text-center leading-tight flex-1">
                {s.disclaimer}
              </Text>
            </View>
          </View>
        </ScrollView>

        <LegalModal
          visible={legalModalVisible}
          initialTab={legalDocType}
          onClose={() => setLegalModalVisible(false)}
        />
      </SafeAreaView>
    </Modal>
  );
}
