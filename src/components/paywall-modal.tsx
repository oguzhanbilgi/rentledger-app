import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  PlanTierId,
  PRICING_PLANS,
  purchaseSubscriptionPlan,
  restorePurchasesFromStore,
  SubscriptionState,
} from '@/services/revenuecat';
import { LegalDocType, LegalModal } from '@/components/legal-modal';

export interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: (newState: SubscriptionState) => void;
  triggerReason?: string;
}

const PRO_BENEFITS = [
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
];

export function PaywallModal({
  visible,
  onClose,
  onPurchaseSuccess,
  triggerReason,
}: PaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanTierId>('annual');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalDocType, setLegalDocType] = useState<LegalDocType>('privacy');

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const updatedState = await purchaseSubscriptionPlan(selectedPlan);
      onPurchaseSuccess?.(updatedState);
      Alert.alert(
        'Tebrikler! 🎉',
        `${updatedState.activePlan} aboneliğiniz başarıyla aktif edildi.`,
        [{ text: 'Harika', onPress: onClose }]
      );
    } catch {
      Alert.alert('Hata', 'Satın alma işlemi sırasında bir sorun oluştu.');
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
        Alert.alert(
          'Satın Alımlar Geri Yüklendi',
          'Mevcut Pro aboneliğiniz başarıyla doğrulandı ve aktif edildi.',
          [{ text: 'Tamam', onPress: onClose }]
        );
      } else {
        Alert.alert(
          'Kayıtlı Abonelik Bulunamadı',
          'Bu hesaba bağlı aktif bir Pro satın alımı bulunamadı.'
        );
      }
    } finally {
      setRestoring(false);
    }
  };

  const handleOpenLegal = (type: LegalDocType) => {
    setLegalDocType(type);
    setLegalModalVisible(true);
  };

  const activePlanObj =
    PRICING_PLANS.find((p) => p.id === selectedPlan) || PRICING_PLANS[1];

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
              PRO ÜYELİK
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
          contentContainerStyle={{ paddingBottom: 36 }}
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
              Tüm Pro Özelliklerin Kilidini Aç
            </Text>
            <Text className="text-xs text-slate-400 text-center mt-1.5 px-3 leading-relaxed">
              Sınırsız kullanım, reklamsız ekran ve tüm profesyonel araçlarla
              işinizi hızlandırın.
            </Text>
          </View>

          <View className="rounded-3xl bg-[#111827] border border-slate-800/90 p-4 mb-5 gap-3">
            {PRO_BENEFITS.map((benefit, idx) => (
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
            {PRICING_PLANS.map((plan) => {
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
                  Pro&apos;ya Geç — {activePlanObj.priceString}{' '}
                  {activePlanObj.periodLabel}
                </Text>
              </>
            )}
          </Pressable>

          <View className="flex-row flex-wrap items-center justify-center gap-4 mt-3 mb-5">
            <View className="flex-row items-center gap-1">
              <ShieldCheck size={14} color="#34d399" />
              <Text className="text-[11px] text-slate-400">
                Google Play Güvencesi
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Star size={14} color="#fbbf24" />
              <Text className="text-[11px] text-slate-400">
                İstediğiniz Zaman İptal Edin
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
                {restoring
                  ? 'Geri Yükleniyor...'
                  : 'Satın Alımları Geri Yükle'}
              </Text>
            </Pressable>

            <View className="flex-row flex-wrap items-center justify-center gap-4 mb-3">
              <Pressable
                onPress={() => handleOpenLegal('terms')}
                className="active:opacity-70">
                <Text className="text-xs font-medium text-slate-400 underline">
                  Kullanım Koşulları
                </Text>
              </Pressable>

              <Text className="text-xs text-slate-600">•</Text>

              <Pressable
                onPress={() => handleOpenLegal('privacy')}
                className="active:opacity-70">
                <Text className="text-xs font-medium text-slate-400 underline">
                  Gizlilik Politikası
                </Text>
              </Pressable>
            </View>

            <View className="flex-row items-center justify-center gap-1 px-2">
              <Lock size={11} color="#64748b" />
              <Text className="text-[10px] text-slate-500 text-center leading-tight flex-1">
                Abonelikler dönem bitiminden en az 24 saat önce iptal edilmediği
                sürece otomatik yenilenir. Mağaza hesap ayarlarınızdan
                dilediğiniz zaman iptal edebilirsiniz.
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
