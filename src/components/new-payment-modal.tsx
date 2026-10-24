import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { CheckCircle2, Wallet } from 'lucide-react-native';

import { FieldLabel, FormField, StepperField } from '@/components/form-field';
import { SheetModal } from '@/components/sheet-modal';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useThemeColors } from '@/constants/theme';
import { triggerHaptic } from '@/services/haptics';
import { formatMoney, useI18n } from '@/services/i18n';
import {
  PAYMENT_METHODS,
  displayPaymentDate,
  formatPeriod,
  parseAmountInput,
  paymentMethodLabel,
  shiftDateKey,
  shiftPeriod,
  toPeriodKey,
  todayDateKey,
} from '@/services/rent-format';
import { newId, reserveNextReceiptNo, savePayment } from '@/services/rentledger-data';
import type {
  PaymentMethod,
  PaymentRecord,
  PropertyRecord,
  TenantRecord,
} from '@/services/rentledger-types';

interface NewPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: (payment: PaymentRecord, tenant: TenantRecord) => void;
  tenants: TenantRecord[];
  properties: PropertyRecord[];
}

/** Kira tahsilatı formu. Her açılışta sıfırlanır; seçili kiracı her zaman güncel listeden gelir. */
export function NewPaymentModal({ visible, onClose, onSaved, tenants, properties }: NewPaymentModalProps) {
  const { t, language } = useI18n();
  const colors = useThemeColors();

  const [tenantId, setTenantId] = useState('');
  const [amount, setAmount] = useState('');
  const [periodKey, setPeriodKey] = useState(toPeriodKey());
  const [dateKey, setDateKey] = useState(todayDateKey());
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const activeTenants = tenants.filter((tenant) => tenant.status === 'active');
  const selectedTenant = activeTenants.find((tenant) => tenant.id === tenantId) ?? null;

  // Her açılışta formu sıfırla.
  useEffect(() => {
    if (!visible) return;
    const first = tenants.find((tenant) => tenant.status === 'active');
    setTenantId(first?.id ?? '');
    setAmount(first ? String(first.rentAmount) : '');
    setPeriodKey(toPeriodKey());
    setDateKey(todayDateKey());
    setMethod('bank_transfer');
    setNotes('');
    setSaving(false);
    // Yalnızca açılışta çalışır; liste değişimi aşağıdaki efektte ele alınır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Seçili kiracı silinmişse (bayat seçim) ilk aktif kiracıya geç.
  useEffect(() => {
    if (!visible || selectedTenant) return;
    const first = tenants.find((tenant) => tenant.status === 'active');
    if (first) {
      setTenantId(first.id);
      setAmount(String(first.rentAmount));
    } else if (tenantId) {
      setTenantId('');
    }
  }, [visible, tenants, selectedTenant, tenantId]);

  const selectTenant = (tenant: TenantRecord) => {
    triggerHaptic.selection();
    setTenantId(tenant.id);
    setAmount(String(tenant.rentAmount));
  };

  const handleSave = async () => {
    if (saving) return;
    if (!selectedTenant) {
      Alert.alert(t('missingInfoTitle'), t('errorSelectTenant'));
      return;
    }
    const value = parseAmountInput(amount);
    if (!Number.isFinite(value) || value <= 0) {
      triggerHaptic.warning();
      Alert.alert(t('missingInfoTitle'), t('errorInvalidAmount'));
      return;
    }

    setSaving(true);
    try {
      const property = properties.find((item) => item.id === selectedTenant.propertyId);
      const payment: PaymentRecord = {
        id: newId('pay'),
        tenantId: selectedTenant.id,
        propertyId: selectedTenant.propertyId,
        tenantName: selectedTenant.name,
        propertyName: property?.name || selectedTenant.propertyName || t('unknownProperty'),
        receiptNo: await reserveNextReceiptNo(),
        paymentDate: dateKey,
        periodMonthYear: formatPeriod(periodKey, language),
        periodKey,
        amount: value,
        currency: selectedTenant.currency,
        paymentMethod: method,
        status: 'paid',
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };
      await savePayment(payment);
      triggerHaptic.success();
      onClose();
      onSaved(payment, selectedTenant);
    } catch (error) {
      console.warn('[payment] Kaydedilemedi:', error);
      Alert.alert(t('errorTitle'), t('tryAgainLater'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={t('paymentModalTitle')}
      subtitle={t('paymentModalSubtitle')}
      icon={<Wallet size={20} color={colors.accent} />}>
      <FieldLabel>{t('fieldTenant')}</FieldLabel>
      {activeTenants.length === 0 ? (
        <View className="mb-4 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <Text className="text-sm font-semibold text-ink dark:text-ink-dark">{t('noTenantsForPayment')}</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          contentContainerStyle={{ gap: 8 }}>
          {activeTenants.map((tenant) => {
            const selected = tenant.id === tenantId;
            const property = properties.find((item) => item.id === tenant.propertyId);
            return (
              <Pressable
                key={tenant.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => selectTenant(tenant)}
                className={`rounded-2xl border-2 px-4 py-3 ${
                  selected
                    ? 'border-primary bg-primary/10'
                    : 'border-line bg-surface dark:border-line-dark dark:bg-surface-dark'
                }`}>
                <View className="flex-row items-center gap-1.5">
                  {selected ? <CheckCircle2 size={14} color={colors.primary} /> : null}
                  <Text className="text-sm font-bold text-ink dark:text-ink-dark">{tenant.name}</Text>
                </View>
                <Text className="mt-0.5 text-xs text-muted dark:text-muted-dark">
                  {property?.name || tenant.propertyName || t('unknownProperty')} ·{' '}
                  {formatMoney(tenant.rentAmount, tenant.currency, language)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <FormField
        label={selectedTenant ? `${t('fieldAmount')} (${selectedTenant.currency})` : t('fieldAmount')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder={t('rentPlaceholder')}
        className="mb-4"
      />

      <View className="mb-4 flex-row gap-3">
        <StepperField
          label={t('fieldPeriod')}
          value={formatPeriod(periodKey, language)}
          onPrevious={() => setPeriodKey((key) => shiftPeriod(key, -1))}
          onNext={() => setPeriodKey((key) => shiftPeriod(key, 1))}
          className="flex-1"
        />
        <StepperField
          label={t('fieldPaymentDate')}
          value={displayPaymentDate(dateKey, language)}
          onPrevious={() => setDateKey((key) => shiftDateKey(key, -1))}
          onNext={() => setDateKey((key) => shiftDateKey(key, 1))}
          className="flex-1"
        />
      </View>

      <FieldLabel>{t('fieldPaymentMethod')}</FieldLabel>
      <View className="mb-4">
        <SegmentedControl<PaymentMethod>
          value={method}
          onChange={setMethod}
          options={PAYMENT_METHODS.map((value) => ({ value, label: paymentMethodLabel(value, language) }))}
        />
      </View>

      <FormField
        label={t('fieldNotes')}
        value={notes}
        onChangeText={setNotes}
        placeholder={t('notesPlaceholder')}
        multiline
        className="mb-6"
      />

      <Button
        label={t('savePaymentBtn')}
        icon={<CheckCircle2 size={18} color={colors.onBrand} />}
        onPress={handleSave}
        loading={saving}
        disabled={activeTenants.length === 0}
      />
    </SheetModal>
  );
}
