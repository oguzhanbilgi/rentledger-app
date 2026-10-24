import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import {
  Crown,
  Database,
  FileText,
  LifeBuoy,
  RotateCcw,
  Save,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
} from 'lucide-react-native';

import { FieldLabel, FormField } from '@/components/form-field';
import { LegalModal, type LegalDocType } from '@/components/legal-modal';
import { RentPaywall } from '@/components/rent-paywall';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow, SectionLabel } from '@/components/ui/list-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { factory } from '@/config';
import { useThemeColors } from '@/constants/theme';
import { openAdPrivacyOptions, useAds } from '@/services/ads';
import { refreshQuota, useQuota } from '@/services/credits';
import {
  SUPPORTED_CURRENCIES,
  currencyOptionLabel,
  notifyDefaultCurrency,
  setDefaultCurrency,
  useDefaultCurrency,
  type CurrencyCode,
} from '@/services/currency';
import { resetLocalData } from '@/services/database';
import { triggerHaptic } from '@/services/haptics';
import {
  SUPPORTED_LANGUAGES,
  initI18n,
  t as translateNow,
  useI18n,
  type AppLanguage,
} from '@/services/i18n';
import { requestOnboardingReplay } from '@/services/onboarding';
import {
  getLandlordProfile,
  getPayments,
  getProperties,
  saveLandlordProfile,
} from '@/services/rentledger-data';
import { EMPTY_LANDLORD_PROFILE, type LandlordProfile } from '@/services/rentledger-types';
import { openManageSubscriptions, restorePurchases, useSubscription } from '@/services/revenuecat';
import { openStoreListing } from '@/services/store-review';
import { initTheme, setThemePreference, useThemePreference, type ThemePreference } from '@/services/theme';

export default function SettingsScreen() {
  const { t, language, setLanguage } = useI18n();
  const colors = useThemeColors();
  const subscription = useSubscription();
  const quota = useQuota();
  const ads = useAds();
  const themePreference = useThemePreference();

  const [profile, setProfile] = useState<LandlordProfile>(EMPTY_LANDLORD_PROFILE);
  const [profileDirty, setProfileDirty] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const currency = useDefaultCurrency();
  const [stats, setStats] = useState({ properties: 0, payments: 0 });
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocType | null>(null);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async (includeProfile: boolean) => {
    const [loadedProfile, properties, payments] = await Promise.all([
      includeProfile ? getLandlordProfile() : Promise.resolve(null),
      getProperties(),
      getPayments(),
    ]);
    if (loadedProfile) {
      setProfile(loadedProfile);
      setProfileDirty(false);
    }
    setStats({ properties: properties.length, payments: payments.length });
  }, []);

  // Her odaklanmada tazele (kaydedilmemiş profil düzenlemesi korunur).
  useFocusEffect(
    useCallback(() => {
      void load(!profileDirty);
    }, [load, profileDirty])
  );

  const updateProfile = (field: keyof LandlordProfile) => (value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setProfileDirty(true);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await saveLandlordProfile(profile);
      setProfileDirty(false);
      triggerHaptic.success();
      Alert.alert(t('profileSavedTitle'), t('profileSavedBody'));
    } catch (error) {
      console.warn('[settings] Profil kaydedilemedi:', error);
      Alert.alert(t('errorTitle'), t('tryAgainLater'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCurrencyChange = (code: CurrencyCode) => {
    void setDefaultCurrency(code);
  };

  const handleRestore = async () => {
    setRestoring(true);
    const outcome = await restorePurchases();
    setRestoring(false);
    if (outcome.status === 'restored') {
      triggerHaptic.success();
      Alert.alert(t('restorePurchases'), t('restoreSuccess'));
    } else if (outcome.status === 'not_found') {
      Alert.alert(t('restorePurchases'), t('restoreNotFound'));
    } else {
      Alert.alert(t('errorTitle'), t('tryAgainLater'));
    }
  };

  const handleReset = () => {
    triggerHaptic.warning();
    Alert.alert(t('resetDataTitle'), t('resetDataBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await resetLocalData();
          // Dil ve tema tercihleri silindi → cihaz varsayılanlarına dön.
          initI18n();
          initTheme();
          refreshQuota();
          notifyDefaultCurrency();
          await load(true);
          // Dil az önce değişmiş olabilir: güncel dille yaz.
          Alert.alert(translateNow('resetDataDone'));
        },
      },
    ]);
  };

  const contactSupport = () => {
    const subject = encodeURIComponent(`${factory.app.name} ${factory.app.version}`);
    Linking.openURL(`mailto:${factory.studio.supportEmail}?subject=${subject}`).catch(() => {});
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Text className="text-[28px] font-extrabold text-ink dark:text-ink-dark">{t('settingsTitle')}</Text>
        <Text className="mt-0.5 text-sm text-muted dark:text-muted-dark">{t('settingsSubtitle')}</Text>

        <SectionLabel>{t('membership')}</SectionLabel>
        <Card>
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-warning/15">
              <Crown size={22} color={colors.warning} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-ink dark:text-ink-dark">
                {subscription.isPro ? t('proActive') : t('freePlan')}
              </Text>
              <Text className="mt-0.5 text-xs text-muted dark:text-muted-dark">
                {subscription.isPro
                  ? t('proUnlimitedNote')
                  : t('quotaLeft', { count: quota.remaining })}
              </Text>
            </View>
          </View>
          {subscription.isPro ? (
            subscription.mode === 'store' && subscription.expirationDate ? (
              <Button
                label={t('manageSubscription')}
                variant="secondary"
                onPress={openManageSubscriptions}
                className="mt-4"
              />
            ) : null
          ) : (
            <Button
              label={t('upgradeToPro')}
              icon={<Sparkles size={18} color={colors.onBrand} />}
              onPress={() => setPaywallVisible(true)}
              className="mt-4"
            />
          )}
        </Card>

        <SectionLabel>{t('landlordProfileTitle')}</SectionLabel>
        <Card>
          <View className="mb-4 flex-row items-center gap-2">
            <UserCheck size={16} color={colors.accent} />
            <Text className="flex-1 text-xs text-muted dark:text-muted-dark">{t('landlordProfileSub')}</Text>
          </View>
          <View className="gap-3">
            <FormField
              label={t('fieldFullName')}
              value={profile.fullName}
              onChangeText={updateProfile('fullName')}
              placeholder={t('fullNamePlaceholder')}
            />
            <FormField
              label={t('fieldCompanyTitle')}
              value={profile.companyTitle}
              onChangeText={updateProfile('companyTitle')}
              placeholder={t('companyPlaceholder')}
            />
            <View className="flex-row gap-3">
              <FormField
                label={t('fieldPhone')}
                value={profile.phone}
                onChangeText={updateProfile('phone')}
                keyboardType="phone-pad"
                placeholder={t('phonePlaceholder')}
                className="flex-1"
              />
              <FormField
                label={t('fieldEmail')}
                value={profile.email}
                onChangeText={updateProfile('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t('emailPlaceholder')}
                className="flex-1"
              />
            </View>
            <FormField
              label={t('fieldAddress')}
              value={profile.address}
              onChangeText={updateProfile('address')}
              placeholder={t('landlordAddressPlaceholder')}
              multiline
            />
            <FormField
              label={t('fieldBankName')}
              value={profile.bankName}
              onChangeText={updateProfile('bankName')}
              placeholder={t('bankPlaceholder')}
            />
            <FormField
              label={t('fieldIban')}
              value={profile.iban}
              onChangeText={updateProfile('iban')}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
            />
            <Button
              label={t('saveProfileBtn')}
              icon={<Save size={18} color={colors.onBrand} />}
              onPress={handleSaveProfile}
              loading={savingProfile}
              disabled={!profileDirty}
              className="mt-1"
            />
          </View>
        </Card>

        <SectionLabel>{t('appearance')}</SectionLabel>
        <SegmentedControl<ThemePreference>
          value={themePreference}
          onChange={(value) => void setThemePreference(value)}
          options={[
            { value: 'dark', label: t('themeDark') },
            { value: 'light', label: t('themeLight') },
            { value: 'system', label: t('themeSystem') },
          ]}
        />

        <SectionLabel>{t('language')}</SectionLabel>
        <SegmentedControl<AppLanguage>
          value={language}
          onChange={(value) => void setLanguage(value)}
          options={SUPPORTED_LANGUAGES.map((item) => ({ value: item.code, label: item.label }))}
        />

        <View className="mt-4">
          <FieldLabel>{t('defaultCurrencyLabel')}</FieldLabel>
          <SegmentedControl<CurrencyCode>
            value={currency}
            onChange={handleCurrencyChange}
            options={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: currencyOptionLabel(code) }))}
          />
        </View>

        <View className="mt-4 overflow-hidden rounded-3xl border border-line bg-surface dark:border-line-dark dark:bg-surface-dark">
          <ListRow
            icon={<Sparkles size={18} color={colors.primary} />}
            title={t('setupWizard')}
            onPress={requestOnboardingReplay}
            last
          />
        </View>

        <SectionLabel>{t('storeAndLegal')}</SectionLabel>
        <View className="overflow-hidden rounded-3xl border border-line bg-surface dark:border-line-dark dark:bg-surface-dark">
          <ListRow icon={<Star size={18} color={colors.warning} />} title={t('rateApp')} onPress={openStoreListing} />
          <ListRow
            icon={<RotateCcw size={18} color={colors.primary} />}
            title={restoring ? '…' : t('restorePurchases')}
            onPress={restoring ? undefined : handleRestore}
          />
          <ListRow
            icon={<Shield size={18} color={colors.accent} />}
            title={t('privacyPolicy')}
            onPress={() => setLegalDoc('privacy')}
          />
          <ListRow
            icon={<FileText size={18} color={colors.muted} />}
            title={t('termsOfUse')}
            onPress={() => setLegalDoc('terms')}
          />
          {ads.privacyOptionsRequired ? (
            <ListRow
              icon={<ShieldCheck size={18} color={colors.muted} />}
              title={t('adPrivacyOptions')}
              onPress={openAdPrivacyOptions}
            />
          ) : null}
          <ListRow
            icon={<LifeBuoy size={18} color={colors.muted} />}
            title={t('contactSupport')}
            subtitle={factory.studio.supportEmail}
            onPress={contactSupport}
            last
          />
        </View>

        <SectionLabel>{t('data')}</SectionLabel>
        <View className="overflow-hidden rounded-3xl border border-line bg-surface dark:border-line-dark dark:bg-surface-dark">
          <ListRow
            icon={<Database size={18} color={colors.muted} />}
            title={t('statsLine', { properties: stats.properties, payments: stats.payments })}
          />
          <ListRow icon={<Trash2 size={18} color={colors.danger} />} title={t('resetData')} onPress={handleReset} last />
        </View>

        <Text className="mt-8 text-center text-xs text-faint dark:text-faint-dark">
          {factory.app.name} · {t('versionLabel', { version: factory.app.version })} · {factory.studio.name}
        </Text>
      </ScrollView>

      <RentPaywall visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
      <LegalModal visible={legalDoc !== null} initialDoc={legalDoc ?? 'privacy'} onClose={() => setLegalDoc(null)} />
    </SafeAreaView>
  );
}
