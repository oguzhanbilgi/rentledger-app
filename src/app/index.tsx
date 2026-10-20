import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useFocusEffect } from 'expo-router';
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  MessageCircle,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react-native';

import {
  PaymentRecord,
  PropertyRecord,
  TenantRecord,
  deletePayment,
  getLandlordProfile,
  getPayments,
  getPreference,
  getProperties,
  getReceiptAllowanceInfo,
  getTenants,
  initLocalDatabase,
  setPreference,
} from '@/services/database';
import { AppLanguage, formatMoney, getI18nState, subscribeI18n, t } from '@/services/i18n';
import {
  getCurrentSubscriptionState,
  subscribeToSubscriptionChanges,
  SubscriptionState,
} from '@/services/revenuecat';
import {
  RentDueAlert,
  getCurrentPeriodMonthYear,
  getRentDueAlerts,
  sendPaymentConfirmationWhatsApp,
  sendRentReminderWhatsApp,
} from '@/services/rent-reminders';
import { generateAndShareReceiptPdf } from '@/services/receipt-pdf-generator';
import { requestInterstitialAdWithUpsell } from '@/components/periodic-ad-modal';
import { SmartAdBanner } from '@/components/smart-ad-banner';
import { NewPaymentModal } from '@/components/new-payment-modal';
import { NewTenantPropertyModal } from '@/components/new-tenant-property-modal';
import { ReceiptGateModal } from '@/components/receipt-gate-modal';
import { PaywallModal } from '@/components/paywall-modal';
import { OnboardingModal } from '@/components/onboarding-modal';

export default function RentDashboardScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [i18n, setI18n] = useState(getI18nState());
  const [subState, setSubState] = useState<SubscriptionState>(
    getCurrentSubscriptionState()
  );

  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [dueAlerts, setDueAlerts] = useState<RentDueAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [newPaymentVisible, setNewPaymentVisible] = useState(false);
  const [newTenantVisible, setNewTenantVisible] = useState(false);
  const [receiptGateVisible, setReceiptGateVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);

  const [remainingFreeReceipts, setRemainingFreeReceipts] = useState(3);
  const [totalAllowedReceipts, setTotalAllowedReceipts] = useState(3);

  const isTr = i18n.lang === 'tr';

  useEffect(() => {
    const unsubRc = subscribeToSubscriptionChanges(setSubState);
    const unsubI18n = subscribeI18n(setI18n);
    return () => {
      unsubRc();
      unsubI18n();
    };
  }, []);

  const loadData = async () => {
    await initLocalDatabase();

    const [hasSeenOnboarding, props, tens, pays, receiptInfo] = await Promise.all([
      getPreference('has_seen_onboarding'),
      getProperties(),
      getTenants(),
      getPayments(),
      getReceiptAllowanceInfo(),
    ]);

    if (!hasSeenOnboarding) {
      setOnboardingVisible(true);
    }

    setProperties(props);
    setTenants(tens);
    setPayments(pays);
    setRemainingFreeReceipts(receiptInfo.remainingFree);
    setTotalAllowedReceipts(receiptInfo.totalFreeAllowed);

    // Calculate due & overdue alerts
    const alerts = getRentDueAlerts(tens, props, pays, 5);
    setDueAlerts(alerts);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleFinishOnboarding = async () => {
    await setPreference('has_seen_onboarding', 'true');
    setOnboardingVisible(false);
  };

  const checkPdfAllowance = async (): Promise<boolean> => {
    if (subState.isPro) return true;
    const info = await getReceiptAllowanceInfo();
    if (info.remainingFree > 0) return true;

    setReceiptGateVisible(true);
    return false;
  };

  // Calculations
  const totalMonthlyExpectedRent = tenants
    .filter((t) => t.status === 'active')
    .reduce((sum, t) => sum + (t.rentAmount || 0), 0);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totalCollectedThisMonth = payments
    .filter((p) => {
      const d = new Date(p.createdAt);
      return (
        p.status === 'paid' &&
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear
      );
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPendingOrOverdue = Math.max(
    0,
    totalMonthlyExpectedRent - totalCollectedThisMonth
  );

  const handleDeletePayment = (payment: PaymentRecord) => {
    Alert.alert(
      isTr ? 'Ödemeyi Sil' : 'Delete Payment',
      isTr
        ? `${payment.tenantName} - ${payment.periodMonthYear} ödemesini silmek istiyor musunuz?`
        : `Delete payment record for ${payment.tenantName}?`,
      [
        { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: isTr ? 'Sil' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePayment(payment.id);
            await loadData();
          },
        },
      ]
    );
  };

  const handleExportPdf = async (payment: PaymentRecord) => {
    const allowed = await checkPdfAllowance();
    if (!allowed) return;

    const landlord = await getLandlordProfile();
    const ten = tenants.find((t) => t.id === payment.tenantId);
    const prop = properties.find((p) => p.id === payment.propertyId);

    await generateAndShareReceiptPdf({
      payment,
      tenant: ten,
      property: prop,
      landlord,
      lang: i18n.lang,
      isPro: subState.isPro,
    });
  };

  const handleSendConfirmationWhatsApp = async (payment: PaymentRecord) => {
    const landlord = await getLandlordProfile();
    await sendPaymentConfirmationWhatsApp(payment, landlord, i18n.lang);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#090d16]">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 115, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }>
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              RentLedger Pro
            </Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {t('dashboardTitle', i18n.lang)}
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('dashboardSubtitle', i18n.lang)}
            </Text>
          </View>

          {!subState.isPro && (
            <Pressable
              onPress={() => setPaywallVisible(true)}
              className="py-2 px-3 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex-row items-center gap-1.5 active:opacity-75">
              <Sparkles size={14} color="#f59e0b" />
              <Text className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                PRO
              </Text>
            </Pressable>
          )}
        </View>

        {/* Financial Overview Cards */}
        <View className="rounded-3xl p-5 mb-5 bg-[#0f172a] dark:bg-[#131b2e] border border-emerald-500/25 shadow-xl">
          <View className="flex-row items-center justify-between mb-3 border-b border-slate-800 pb-3">
            <View>
              <Text className="text-xs font-semibold text-slate-400">
                {t('totalExpectedRent', i18n.lang)}
              </Text>
              <Text className="text-2xl font-black text-white mt-0.5">
                {formatMoney(totalMonthlyExpectedRent, i18n.currency)}
              </Text>
            </View>
            <View className="py-1 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <Text className="text-xs font-bold text-emerald-400">
                {getCurrentPeriodMonthYear(i18n.lang)}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 p-3 rounded-2xl bg-slate-900/80 border border-emerald-500/20">
              <Text className="text-[11px] font-semibold text-emerald-400">
                ✓ {t('totalCollectedThisMonth', i18n.lang)}
              </Text>
              <Text className="text-base font-extrabold text-white mt-1">
                {formatMoney(totalCollectedThisMonth, i18n.currency)}
              </Text>
            </View>

            <View className="flex-1 p-3 rounded-2xl bg-slate-900/80 border border-amber-500/20">
              <Text className="text-[11px] font-semibold text-amber-400">
                ⏰ {t('totalPendingOrOverdue', i18n.lang)}
              </Text>
              <Text className="text-base font-extrabold text-white mt-1">
                {formatMoney(totalPendingOrOverdue, i18n.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View className="flex-row gap-3 mb-5">
          <Pressable
            onPress={() => setNewPaymentVisible(true)}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-600 active:opacity-85 flex-row items-center justify-center gap-2 shadow-md">
            <Plus size={18} color="#ffffff" />
            <Text className="text-xs font-extrabold text-white">
              {t('addPaymentBtn', i18n.lang)}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setNewTenantVisible(true)}
            className="py-3.5 px-4 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 active:opacity-80 flex-row items-center justify-center gap-2 shadow-sm">
            <Building2 size={16} color="#10b981" />
            <Text className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
              {t('newPropertyBtn', i18n.lang)}
            </Text>
          </Pressable>
        </View>

        {/* Süresi Yaklaşan & Geciken Kiralar UYARI KARTI */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-2.5">
            <View className="flex-row items-center gap-2">
              <AlertTriangle size={16} color="#f59e0b" />
              <Text className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {t('overdueAlertTitle', i18n.lang)}
              </Text>
            </View>
            <Text className="text-xs font-bold text-slate-500">
              {dueAlerts.length} {isTr ? 'Kiracı' : 'Tenants'}
            </Text>
          </View>

          {dueAlerts.length === 0 ? (
            <View className="p-4 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 flex-row items-center gap-3">
              <CheckCircle2 size={20} color="#10b981" />
              <Text className="text-xs text-slate-600 dark:text-slate-300 font-semibold flex-1">
                {t('noOverdueAlerts', i18n.lang)}
              </Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {dueAlerts.map((alert) => {
                const isOverdue = alert.status === 'overdue';
                const isToday = alert.status === 'due_today';
                const badgeColor = isOverdue
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                  : isToday
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';

                return (
                  <View
                    key={alert.tenant.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/90 flex-row items-center justify-between shadow-sm">
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {alert.tenant.name}
                        </Text>
                        <View className={`px-2 py-0.5 rounded-md border ${badgeColor}`}>
                          <Text className="text-[10px] font-extrabold">
                            {isTr ? alert.statusTextTr : alert.statusTextEn}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">
                        {alert.property?.name || 'Mülk'} •{' '}
                        <Text className="font-bold text-slate-700 dark:text-slate-300">
                          {formatMoney(alert.tenant.rentAmount, alert.tenant.currency)}
                        </Text>
                      </Text>
                    </View>

                    <Pressable
                      onPress={async () => {
                        const landlord = await getLandlordProfile();
                        await sendRentReminderWhatsApp(alert, landlord, i18n.lang);
                      }}
                      className="py-2 px-3 rounded-xl bg-emerald-600 active:opacity-80 flex-row items-center gap-1.5 shadow-sm">
                      <MessageCircle size={14} color="#ffffff" />
                      <Text className="text-xs font-extrabold text-white">
                        {t('remindViaWhatsApp', i18n.lang)}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Banner Ad Area */}
        <View className="mb-5">
          <SmartAdBanner isPro={subState.isPro} onUpgradePress={() => setPaywallVisible(true)} />
        </View>

        {/* Son Kira Tahsilatları Listesi */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <Receipt size={16} color="#10b981" />
              <Text className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {t('recentPayments', i18n.lang)}
              </Text>
            </View>
            <Text className="text-xs font-bold text-slate-500">
              {payments.length} {isTr ? 'Tahsilat' : 'Receipts'}
            </Text>
          </View>

          {payments.length === 0 ? (
            <View className="p-6 rounded-3xl bg-white dark:bg-[#131b2e] border border-dashed border-slate-300 dark:border-slate-800 items-center justify-center">
              <View className="w-12 h-12 rounded-2xl bg-emerald-500/10 items-center justify-center mb-3">
                <Receipt size={24} color="#10b981" />
              </View>
              <Text className="text-sm font-extrabold text-slate-900 dark:text-white mb-1 text-center">
                {t('noPaymentsYet', i18n.lang)}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4 px-4">
                {t('noPaymentsSub', i18n.lang)}
              </Text>
              <Pressable
                onPress={() => setNewPaymentVisible(true)}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 flex-row items-center gap-1.5 active:opacity-85 shadow-sm">
                <Plus size={16} color="#ffffff" />
                <Text className="text-xs font-extrabold text-white">
                  {t('addPaymentBtn', i18n.lang)}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-3">
              {payments.map((p) => (
                <View
                  key={p.id}
                  className="p-4 rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/90 shadow-sm">
                  {/* Row 1: Header & Amount */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {p.tenantName}
                        </Text>
                        <View className="py-0.5 px-2 rounded-md bg-emerald-500/10 border border-emerald-500/25">
                          <Text className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                            {p.receiptNo}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {p.propertyName} • {p.periodMonthYear}
                      </Text>
                    </View>

                    <Text className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {formatMoney(p.amount, p.currency)}
                    </Text>
                  </View>

                  {/* Row 2: Date & Actions */}
                  <View className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex-row items-center justify-between">
                    <Text className="text-[11px] text-slate-400">
                      {p.paymentDate} • {p.paymentMethod === 'bank_transfer' ? (isTr ? 'Havale/EFT' : 'Bank') : (isTr ? 'Nakit' : 'Cash')}
                    </Text>

                    <View className="flex-row items-center gap-2">
                      <Pressable
                        onPress={() => handleSendConfirmationWhatsApp(p)}
                        className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 active:opacity-75">
                        <MessageCircle size={15} color="#10b981" />
                      </Pressable>

                      <Pressable
                        onPress={() => handleExportPdf(p)}
                        className="py-1.5 px-3 rounded-xl bg-slate-900 dark:bg-slate-800 flex-row items-center gap-1 active:opacity-75">
                        <FileText size={13} color="#ffffff" />
                        <Text className="text-xs font-bold text-white">
                          {t('viewPdfReceipt', i18n.lang)}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleDeletePayment(p)}
                        className="p-2 rounded-xl bg-rose-500/10 active:opacity-70">
                        <Trash2 size={15} color="#f43f5e" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <NewPaymentModal
        visible={newPaymentVisible}
        onClose={() => setNewPaymentVisible(false)}
        onSaved={async () => {
          await loadData();
          requestInterstitialAdWithUpsell();
        }}
        tenants={tenants}
        properties={properties}
        lang={i18n.lang}
        isPro={subState.isPro}
        onCheckPdfAllowance={checkPdfAllowance}
      />

      <NewTenantPropertyModal
        visible={newTenantVisible}
        onClose={() => setNewTenantVisible(false)}
        onSaved={async () => {
          await loadData();
          requestInterstitialAdWithUpsell();
        }}
        lang={i18n.lang}
        isPro={subState.isPro}
        currentPropertyCount={properties.length}
        onOpenPaywall={() => setPaywallVisible(true)}
      />

      <ReceiptGateModal
        visible={receiptGateVisible}
        onClose={() => setReceiptGateVisible(false)}
        onUnlocked={loadData}
        onOpenPaywall={() => setPaywallVisible(true)}
        remainingFree={remainingFreeReceipts}
        totalAllowed={totalAllowedReceipts}
        lang={i18n.lang}
      />

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onPurchaseSuccess={(newState) => setSubState(newState)}
      />

      <OnboardingModal
        visible={onboardingVisible}
        onFinish={handleFinishOnboarding}
        lang={i18n.lang}
      />
    </SafeAreaView>
  );
}
