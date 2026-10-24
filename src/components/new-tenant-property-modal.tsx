import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Building2, Plus } from 'lucide-react-native';

import { FieldLabel, FormField } from '@/components/form-field';
import { SheetModal } from '@/components/sheet-modal';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useThemeColors } from '@/constants/theme';
import {
  SUPPORTED_CURRENCIES,
  currencyOptionLabel,
  getDefaultCurrency,
  type CurrencyCode,
} from '@/services/currency';
import { triggerHaptic } from '@/services/haptics';
import { useI18n } from '@/services/i18n';
import { PROPERTY_TYPES, parseAmountInput, propertyTypeLabel } from '@/services/rent-format';
import { newId, savePropertyWithTenant } from '@/services/rentledger-data';
import {
  FREE_PROPERTY_LIMIT,
  type PropertyRecord,
  type PropertyType,
  type TenantRecord,
} from '@/services/rentledger-types';
import { useSubscription } from '@/services/revenuecat';
import { toLocalDateKey } from '@/utils/date';

interface NewTenantPropertyModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  currentPropertyCount: number;
  onOpenPaywall: () => void;
}

/** Mülk + kiracı formu. Ücretsiz planda 2 mülk sınırı; Pro'da sınırsız (abonelik değişince anında). */
export function NewTenantPropertyModal({
  visible,
  onClose,
  onSaved,
  currentPropertyCount,
  onOpenPaywall,
}: NewTenantPropertyModalProps) {
  const { t, language } = useI18n();
  const colors = useThemeColors();
  const { isPro } = useSubscription();

  const [propName, setPropName] = useState('');
  const [propAddress, setPropAddress] = useState('');
  const [propType, setPropType] = useState<PropertyType>('apartment');
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [currency, setCurrency] = useState<CurrencyCode>(() => getDefaultCurrency());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPropName('');
    setPropAddress('');
    setPropType('apartment');
    setTenantName('');
    setTenantPhone('');
    setTenantId('');
    setRentAmount('');
    setDepositAmount('');
    setDueDay('1');
    setCurrency(getDefaultCurrency());
    setSaving(false);
  }, [visible]);

  const limitReached = !isPro && currentPropertyCount >= FREE_PROPERTY_LIMIT;

  const showLimit = () => {
    triggerHaptic.warning();
    Alert.alert(t('propertyLimitTitle'), t('propertyLimitBody', { count: FREE_PROPERTY_LIMIT }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('upgradeToPro'),
        onPress: () => {
          onClose();
          onOpenPaywall();
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (saving) return;
    if (limitReached) {
      showLimit();
      return;
    }
    const missing = (message: string) => {
      triggerHaptic.warning();
      Alert.alert(t('missingInfoTitle'), message);
    };
    if (!propName.trim()) return missing(t('errorPropertyName'));
    if (!tenantName.trim()) return missing(t('errorTenantName'));
    const rent = parseAmountInput(rentAmount);
    if (!Number.isFinite(rent) || rent <= 0) return missing(t('errorRent'));
    const deposit = parseAmountInput(depositAmount);
    const day = Math.min(Math.max(Number.parseInt(dueDay, 10) || 1, 1), 31);

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const property: PropertyRecord = {
        id: newId('prop'),
        name: propName.trim(),
        address: propAddress.trim() || propName.trim(),
        propertyType: propType,
        createdAt: now,
      };
      const tenant: TenantRecord = {
        id: newId('ten'),
        propertyId: property.id,
        name: tenantName.trim(),
        phone: tenantPhone.trim(),
        tcOrId: tenantId.trim(),
        rentAmount: rent,
        depositAmount: Number.isFinite(deposit) && deposit > 0 ? deposit : 0,
        currency,
        paymentDueDay: day,
        leaseStartDate: toLocalDateKey(),
        status: 'active',
        createdAt: now,
      };
      await savePropertyWithTenant(property, tenant);
      triggerHaptic.success();
      onSaved();
      onClose();
    } catch (error) {
      console.warn('[property] Kaydedilemedi:', error);
      Alert.alert(t('errorTitle'), t('tryAgainLater'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={t('propertyModalTitle')}
      subtitle={t('propertyModalSubtitle')}
      icon={<Building2 size={20} color={colors.accent} />}>
      {limitReached ? (
        <Pressable
          accessibilityRole="button"
          onPress={showLimit}
          className="mb-5 rounded-2xl border border-warning/40 bg-warning/10 p-4 active:opacity-80">
          <Text className="text-sm font-bold text-ink dark:text-ink-dark">
            {t('propertyLimitBanner', { used: currentPropertyCount, limit: FREE_PROPERTY_LIMIT })}
          </Text>
          <Text className="mt-0.5 text-xs text-muted dark:text-muted-dark">{t('propertyLimitHint')}</Text>
        </Pressable>
      ) : null}

      <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-accent">{t('sectionProperty')}</Text>
      <FormField
        label={t('fieldPropertyName')}
        value={propName}
        onChangeText={setPropName}
        placeholder={t('propertyNamePlaceholder')}
        className="mb-3"
      />
      <FormField
        label={t('fieldAddress')}
        value={propAddress}
        onChangeText={setPropAddress}
        placeholder={t('addressPlaceholder')}
        className="mb-3"
      />
      <FieldLabel>{t('fieldPropertyType')}</FieldLabel>
      <View className="mb-6 flex-row flex-wrap gap-2">
        {PROPERTY_TYPES.map((type) => {
          const selected = type === propType;
          return (
            <Pressable
              key={type}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                triggerHaptic.selection();
                setPropType(type);
              }}
              className={`rounded-xl border px-3.5 py-2 ${
                selected
                  ? 'border-primary bg-primary/10'
                  : 'border-line bg-surface dark:border-line-dark dark:bg-surface-dark'
              }`}>
              <Text
                className={`text-[13px] font-semibold ${
                  selected ? 'text-primary' : 'text-ink dark:text-ink-dark'
                }`}>
                {propertyTypeLabel(type, language)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-accent">{t('sectionTenant')}</Text>
      <FormField
        label={t('fieldTenantName')}
        value={tenantName}
        onChangeText={setTenantName}
        placeholder={t('tenantNamePlaceholder')}
        className="mb-3"
      />
      <View className="mb-3 flex-row gap-3">
        <FormField
          label={t('fieldPhone')}
          value={tenantPhone}
          onChangeText={setTenantPhone}
          keyboardType="phone-pad"
          placeholder={t('phonePlaceholder')}
          className="flex-1"
        />
        <FormField
          label={t('fieldTenantId')}
          value={tenantId}
          onChangeText={setTenantId}
          placeholder={t('tenantIdPlaceholder')}
          className="flex-1"
        />
      </View>

      <FieldLabel>{t('fieldCurrency')}</FieldLabel>
      <View className="mb-3">
        <SegmentedControl<CurrencyCode>
          value={currency}
          onChange={setCurrency}
          options={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: currencyOptionLabel(code) }))}
        />
      </View>

      <View className="mb-3 flex-row gap-3">
        <FormField
          label={`${t('fieldMonthlyRent')} (${currency})`}
          value={rentAmount}
          onChangeText={setRentAmount}
          keyboardType="decimal-pad"
          placeholder={t('rentPlaceholder')}
          className="flex-1"
        />
        <FormField
          label={t('fieldDueDay')}
          value={dueDay}
          onChangeText={setDueDay}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="1"
          className="w-32"
        />
      </View>
      <FormField
        label={`${t('fieldDeposit')} (${currency})`}
        value={depositAmount}
        onChangeText={setDepositAmount}
        keyboardType="decimal-pad"
        placeholder={t('depositPlaceholder')}
        className="mb-6"
      />

      <Button
        label={t('savePropertyBtn')}
        icon={<Plus size={18} color={colors.onBrand} />}
        onPress={handleSave}
        loading={saving}
      />
    </SheetModal>
  );
}
