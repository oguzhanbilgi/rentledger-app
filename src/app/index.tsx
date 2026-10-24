import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Crown,
  FileText,
  MessageCircle,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react-native';

import { NewPaymentModal } from '@/components/new-payment-modal';
import { NewTenantPropertyModal } from '@/components/new-tenant-property-modal';
import { OnboardingModal } from '@/components/onboarding-modal';
import { QuotaGateModal } from '@/components/quota-gate-modal';
import { RentPaywall } from '@/components/rent-paywall';
import { SmartAdBanner } from '@/components/smart-ad-banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { factory } from '@/config';
import { useThemeColors } from '@/constants/theme';
import { buildOnboardingSteps } from '@/features/onboarding-steps';
import { maybeShowInterstitial } from '@/services/ads';
import { canUseUnit, consumeUnit, useQuota } from '@/services/credits';
import { triggerHaptic } from '@/services/haptics';
import { formatMoney, useI18n } from '@/services/i18n';
import { completeOnboarding, isOnboardingDone, useOnboardingReplayToken } from '@/services/onboarding';
import { exportReceiptPdf } from '@/services/receipt-pdf-generator';
import {
  displayPaymentDate,
  displayPeriod,
  formatPeriod,
  paymentMethodLabel,
  toPeriodKey,
} from '@/services/rent-format';
import {
  dueStatusLabel,
  getRentDueAlerts,
  sendPaymentConfirmationWhatsApp,
  sendRentReminderWhatsApp,
  type DueStatus,
  type RentDueAlert,
} from '@/services/rent-reminders';
import { summarizePeriod } from '@/services/rent-summary';
import {
  deletePayment,
  getLandlordProfile,
  getPayments,
  getProperties,
  getTenants,
} from '@/services/rentledger-data';
import type { PaymentRecord, PropertyRecord, TenantRecord } from '@/services/rentledger-types';
import { useSubscription } from '@/services/revenuecat';
import { recordReviewMilestone } from '@/services/store-review';

const BADGE: Record<DueStatus, string> = {
  overdue: 'bg-danger/15 text-danger',
  due_today: 'bg-warning/15 text-warning',
  upcoming: 'bg-accent/15 text-accent',
};

export default function RentDashboardScreen() {
  const { t, language } = useI18n();
  const colors = useThemeColors();
  const { isPro } = useSubscription();
  const quota = useQuota();
  const replayToken = useOnboardingReplayToken();

  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [paymentVisible, setPaymentVisible] = useState(false);
  const [propertyVisible, setPropertyVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [gateVisible, setGateVisible] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(() => !isOnboardingDone());
  const [exportingId, setExportingId] = useState<string | null>(null);
  // "Bugün" durum olarak tutulur ve her odaklanmada tazelenir (ay dönümünde dönem güncel kalsın).
  const [now, setNow] = useState(() => new Date());
  const pendingExport = useRef<PaymentRecord | null>(null);
  // Adımlar yalnızca dil değişince yeniden kurulur (kalibrasyon zamanlayıcısı sıfırlanmasın).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- adımlar t() ile güncel dili okur; dil değişince yeniden kurulmalı
  const onboardingSteps = useMemo(() => buildOnboardingSteps(), [language]);

  const reload = useCallback(async () => {
    const [props, tens, pays] = await Promise.all([getProperties(), getTenants(), getPayments()]);
    setProperties(props);
    setTenants(tens);
    setPayments(pays);
    setNow(new Date());
  }, []);

  // Diğer sekmelerde (mülk ekleme, verileri sıfırlama) yapılan değişiklikleri yakala.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  // Ayarlar'dan "sihirbazı tekrar başlat" istendi ("prop değişince durumu ayarla" kalıbı).
  const [handledReplayToken, setHandledReplayToken] = useState(replayToken);
  if (replayToken !== handledReplayToken) {
    setHandledReplayToken(replayToken);
    setOnboardingVisible(true);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const periodKey = toPeriodKey(now);
  const totals = summarizePeriod(tenants, payments, periodKey);
  const dueAlerts = getRentDueAlerts(tenants, properties, payments, 5, now);

  const handleOnboardingFinish = async (answers: Record<string, string>) => {
    await completeOnboarding(answers);
    setOnboardingVisible(false);
    if (!isPro) setPaywallVisible(true);
  };

  /** Makbuz PDF: önce kota, sonra üretim, en son hak düşümü (yalnız başarıdan sonra). */
  const runExport = async (payment: PaymentRecord) => {
    if (!canUseUnit()) {
      triggerHaptic.warning();
      pendingExport.current = payment;
      setGateVisible(true);
      return;
    }
    setExportingId(payment.id);
    try {
      const landlord = await getLandlordProfile();
      const result = await exportReceiptPdf({
        payment,
        tenant: tenants.find((item) => item.id === payment.tenantId),
        property: properties.find((item) => item.id === payment.propertyId),
        landlord,
        language,
        isPro,
      });
      await consumeUnit();
      triggerHaptic.success();
      await recordReviewMilestone();
      if (result.shared) {
        await maybeShowInterstitial();
      }
    } catch (error) {
      console.warn('[receipt]', error);
      Alert.alert(t('errorTitle'), t('tryAgainLater'));
    } finally {
      setExportingId(null);
    }
  };

  const sendConfirmation = async (payment: PaymentRecord, phone?: string) => {
    const landlord = await getLandlordProfile();
    const tenantPhone = phone ?? tenants.find((item) => item.id === payment.tenantId)?.phone ?? '';
    await sendPaymentConfirmationWhatsApp(payment, tenantPhone, landlord, { language, isPro });
  };

  const remind = async (alert: RentDueAlert) => {
    triggerHaptic.medium();
    const landlord = await getLandlordProfile();
    await sendRentReminderWhatsApp(alert, landlord, { language, isPro });
  };

  const handlePaymentSaved = (payment: PaymentRecord, tenant: TenantRecord) => {
    void reload();
    Alert.alert(
      t('paymentSavedTitle'),
      t('paymentSavedBody', {
        amount: formatMoney(payment.amount, payment.currency, language),
        tenant: payment.tenantName,
        period: displayPeriod(payment, language),
      }),
      [
        { text: t('close'), style: 'cancel' },
        { text: t('paymentSavedWhatsApp'), onPress: () => void sendConfirmation(payment, tenant.phone) },
        { text: t('receiptPdf'), onPress: () => void runExport(payment) },
      ]
    );
  };

  const handleDeletePayment = (payment: PaymentRecord) => {
    triggerHaptic.warning();
    Alert.alert(
      t('deletePaymentTitle'),
      t('deletePaymentBody', { tenant: payment.tenantName, period: displayPeriod(payment, language) }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await deletePayment(payment.id);
            await reload();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
        {/* Başlık */}
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-widest text-accent">{factory.app.name}</Text>
            <Text className="mt-0.5 text-[26px] font-extrabold text-ink dark:text-ink-dark">{t('dashboardTitle')}</Text>
            <Text className="mt-0.5 text-sm text-muted dark:text-muted-dark">{t('dashboardSubtitle')}</Text>
          </View>
          {!isPro ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('upgradeToPro')}
              onPress={() => setPaywallVisible(true)}
              className="flex-row items-center gap-1.5 rounded-full border border-warning/40 bg-warning/15 px-3 py-2 active:opacity-70">
              <Crown size={14} color={colors.warning} />
              <Text className="text-xs font-extrabold text-warning">{t('paywallBadge')}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Dönem özeti — para birimi başına ayrı satır */}
        <Card className="mt-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-xs font-bold uppercase tracking-wider text-muted dark:text-muted-dark">
              {t('summaryExpected')}
            </Text>
            <View className="rounded-full bg-accent/15 px-3 py-1">
              <Text className="text-xs font-bold text-accent">{formatPeriod(periodKey, language)}</Text>
            </View>
          </View>
          {totals.length === 0 ? (
            <Text className="mt-3 text-sm text-muted dark:text-muted-dark">{t('summaryEmpty')}</Text>
          ) : (
            totals.map((row, index) => (
              <View
                key={row.currency}
                className={index > 0 ? 'mt-4 border-t border-line pt-4 dark:border-line-dark' : 'mt-2'}>
                <Text className="text-2xl font-extrabold text-ink dark:text-ink-dark">
                  {formatMoney(row.expected, row.currency, language)}
                </Text>
                <View className="mt-3 flex-row gap-3">
                  <View className="flex-1 rounded-2xl bg-accent/10 p-3">
                    <Text className="text-[11px] font-semibold text-accent">{t('summaryCollected')}</Text>
                    <Text className="mt-1 text-base font-extrabold text-ink dark:text-ink-dark">
                      {formatMoney(row.collected, row.currency, language)}
                    </Text>
                  </View>
                  <View className="flex-1 rounded-2xl bg-warning/10 p-3">
                    <Text className="text-[11px] font-semibold text-warning">{t('summaryOutstanding')}</Text>
                    <Text className="mt-1 text-base font-extrabold text-ink dark:text-ink-dark">
                      {formatMoney(row.outstanding, row.currency, language)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Hızlı eylemler */}
        <View className="mt-4 flex-row gap-3">
          <Button
            label={t('addPaymentBtn')}
            icon={<Plus size={18} color={colors.onBrand} />}
            onPress={() => setPaymentVisible(true)}
            className="flex-1"
          />
          <Button
            label={t('newPropertyBtn')}
            variant="secondary"
            icon={<Building2 size={18} color={colors.accent} />}
            onPress={() => setPropertyVisible(true)}
            className="flex-1"
          />
        </View>

        {!isPro ? (
          <Text className="mt-3 text-xs font-semibold text-muted dark:text-muted-dark">
            {quota.unlimited ? t('quotaUnlimited') : t('quotaLeft', { count: quota.remaining })}
          </Text>
        ) : null}

        {/* Vadesi gelen / geciken */}
        <SectionHeader
          icon={<AlertTriangle size={16} color={colors.warning} />}
          title={t('dueSectionTitle')}
          count={dueAlerts.length}
        />
        {dueAlerts.length === 0 ? (
          <Card className="flex-row items-center gap-3">
            <CheckCircle2 size={20} color={colors.accent} />
            <Text className="flex-1 text-sm text-muted dark:text-muted-dark">{t('dueNone')}</Text>
          </Card>
        ) : (
          <View className="gap-3">
            {dueAlerts.map((alert) => (
              <Card key={alert.tenant.id} className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">{alert.tenant.name}</Text>
                    <Text className={`overflow-hidden rounded-md px-2 py-0.5 text-[11px] font-bold ${BADGE[alert.status]}`}>
                      {dueStatusLabel(alert, language)}
                    </Text>
                  </View>
                  <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
                    {alert.property?.name || alert.tenant.propertyName || t('unknownProperty')} ·{' '}
                    <Text className="font-bold text-ink dark:text-ink-dark">
                      {formatMoney(alert.amountDue, alert.tenant.currency, language)}
                    </Text>
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('sendWhatsApp')}
                  onPress={() => void remind(alert)}
                  className="min-h-[40px] flex-row items-center gap-1.5 rounded-xl bg-accent px-3 active:opacity-80">
                  <MessageCircle size={15} color={colors.onBrand} />
                  <Text className="text-xs font-extrabold text-on-brand">{t('remindViaWhatsApp')}</Text>
                </Pressable>
              </Card>
            ))}
          </View>
        )}

        {/* Son tahsilatlar */}
        <SectionHeader
          icon={<Receipt size={16} color={colors.accent} />}
          title={t('recentPayments')}
          count={payments.length}
        />
        {payments.length === 0 ? (
          <Card className="items-center py-6">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
              <Receipt size={26} color={colors.accent} />
            </View>
            <Text className="mt-3 text-center text-base font-bold text-ink dark:text-ink-dark">{t('noPaymentsYet')}</Text>
            <Text className="mt-1 px-4 text-center text-sm text-muted dark:text-muted-dark">{t('noPaymentsSub')}</Text>
            <Button
              label={t('addPaymentBtn')}
              variant="secondary"
              onPress={() => setPaymentVisible(true)}
              className="mt-4 self-stretch"
            />
          </Card>
        ) : (
          <View className="gap-3">
            {payments.map((payment) => (
              <Card key={payment.id}>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">{payment.tenantName}</Text>
                      <Text className="overflow-hidden rounded-md bg-elevated px-2 py-0.5 text-[11px] font-bold text-muted dark:bg-elevated-dark dark:text-muted-dark">
                        {payment.receiptNo}
                      </Text>
                    </View>
                    <Text className="mt-0.5 text-xs text-muted dark:text-muted-dark">
                      {payment.propertyName} · {displayPeriod(payment, language)}
                    </Text>
                  </View>
                  <Text className="text-base font-extrabold text-accent">
                    {formatMoney(payment.amount, payment.currency, language)}
                  </Text>
                </View>

                <View className="mt-3 flex-row items-center justify-between gap-2 border-t border-line pt-3 dark:border-line-dark">
                  <Text className="flex-1 text-xs text-muted dark:text-muted-dark" numberOfLines={1}>
                    {displayPaymentDate(payment.paymentDate, language)} ·{' '}
                    {paymentMethodLabel(payment.paymentMethod, language)}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('sendWhatsApp')}
                      onPress={() => void sendConfirmation(payment)}
                      hitSlop={6}
                      className="h-9 w-9 items-center justify-center rounded-xl bg-accent/10 active:opacity-70">
                      <MessageCircle size={16} color={colors.accent} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('receiptPdf')}
                      onPress={() => void runExport(payment)}
                      disabled={exportingId !== null}
                      className="h-9 flex-row items-center gap-1.5 rounded-xl bg-primary px-3 active:opacity-80">
                      {exportingId === payment.id ? (
                        <ActivityIndicator size="small" color={colors.onBrand} />
                      ) : (
                        <FileText size={14} color={colors.onBrand} />
                      )}
                      <Text className="text-xs font-bold text-on-brand">{t('receiptPdf')}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('delete')}
                      onPress={() => handleDeletePayment(payment)}
                      hitSlop={6}
                      className="h-9 w-9 items-center justify-center rounded-xl bg-danger/10 active:opacity-70">
                      <Trash2 size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <SmartAdBanner />

      <NewPaymentModal
        visible={paymentVisible}
        onClose={() => setPaymentVisible(false)}
        onSaved={handlePaymentSaved}
        tenants={tenants}
        properties={properties}
      />
      <NewTenantPropertyModal
        visible={propertyVisible}
        onClose={() => setPropertyVisible(false)}
        onSaved={() => void reload()}
        currentPropertyCount={properties.length}
        onOpenPaywall={() => setPaywallVisible(true)}
      />
      <RentPaywall visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
      <QuotaGateModal
        visible={gateVisible}
        onClose={() => setGateVisible(false)}
        onUpgrade={() => setPaywallVisible(true)}
        onCreditEarned={() => {
          const payment = pendingExport.current;
          pendingExport.current = null;
          if (payment) void runExport(payment);
        }}
      />
      <OnboardingModal visible={onboardingVisible} steps={onboardingSteps} onFinish={handleOnboardingFinish} />
    </SafeAreaView>
  );
}

function SectionHeader({ icon, title, count }: { icon: ReactNode; title: string; count: number }) {
  return (
    <View className="mb-2.5 mt-6 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="text-xs font-extrabold uppercase tracking-wider text-ink dark:text-ink-dark">{title}</Text>
      </View>
      <View className="min-w-[28px] items-center rounded-full bg-elevated px-2 py-0.5 dark:bg-elevated-dark">
        <Text className="text-xs font-bold text-muted dark:text-muted-dark">{count}</Text>
      </View>
    </View>
  );
}
