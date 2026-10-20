import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  Coins,
  Crown,
  Database,
  FileText,
  Globe,
  Moon,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Sun,
  Trash2,
  UserCheck,
} from 'lucide-react-native';

import {
  LandlordProfile,
  getLandlordProfile,
  getPayments,
  getPreference,
  getProperties,
  getReceiptAllowanceInfo,
  getTenants,
  initLocalDatabase,
  resetAllLocalData,
  saveLandlordProfile,
  setPreference,
} from '@/services/database';
import {
  AppLanguage,
  CURRENCY_OPTIONS,
  CurrencySymbol,
  getI18nState,
  setI18nState,
  subscribeI18n,
  t,
} from '@/services/i18n';
import {
  getCurrentSubscriptionState,
  restorePurchasesFromStore,
  subscribeToSubscriptionChanges,
  SubscriptionState,
} from '@/services/revenuecat';
import { getRentDueAlerts } from '@/services/rent-reminders';
import { PaywallModal } from '@/components/paywall-modal';
import { SmartAdBanner } from '@/components/smart-ad-banner';
import { requestInterstitialAdWithUpsell } from '@/components/periodic-ad-modal';
import { LegalDocType, LegalModal } from '@/components/legal-modal';

export default function SettingsScreen() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [i18n, setI18n] = useState(getI18nState());
  const [subState, setSubState] = useState<SubscriptionState>(
    getCurrentSubscriptionState()
  );

  const [profile, setProfile] = useState<LandlordProfile>({
    fullName: '',
    phone: '',
    email: '',
    iban: '',
    bankName: '',
    address: '',
    companyTitle: '',
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalDocType, setLegalDocType] = useState<LegalDocType>('privacy');

  const [remainingReceipts, setRemainingReceipts] = useState(3);
  const [totalProperties, setTotalProperties] = useState(0);
  const [totalPayments, setTotalPayments] = useState(0);
  const [dueAlertsCount, setDueAlertsCount] = useState(0);

  const isTr = i18n.lang === 'tr';

  useEffect(() => {
    const unsubRc = subscribeToSubscriptionChanges(setSubState);
    const unsubI18n = subscribeI18n(setI18n);

    async function loadSettings() {
      await initLocalDatabase();
      const [notifPref, prof, props, tens, pays, receiptInfo] = await Promise.all([
        getPreference('notifications_enabled'),
        getLandlordProfile(),
        getProperties(),
        getTenants(),
        getPayments(),
        getReceiptAllowanceInfo(),
      ]);

      if (notifPref !== null) {
        setNotificationsEnabled(notifPref === 'true');
      }
      setProfile(prof);
      setTotalProperties(props.length);
      setTotalPayments(pays.length);
      setRemainingReceipts(receiptInfo.remainingFree);

      const alerts = getRentDueAlerts(tens, props, pays, 5);
      setDueAlertsCount(alerts.length);
    }

    loadSettings();
    return () => {
      unsubRc();
      unsubI18n();
    };
  }, []);

  const handleSaveProfile = async () => {
    await saveLandlordProfile(profile);
    Alert.alert(
      isTr ? 'Profil Kaydedildi' : 'Profile Saved',
      isTr
        ? 'Ev sahibi ve banka IBAN bilgileriniz güncellendi. Makbuzlarınızda ve WhatsApp mesajlarınızda bu bilgiler yer alacaktır.'
        : 'Your landlord and IBAN details have been updated.'
    );
  };

  const handleLanguageChange = async (lang: AppLanguage) => {
    setI18nState({ lang });
    await setPreference('app_lang', lang);
  };

  const handleCurrencyChange = async (currency: CurrencySymbol) => {
    setI18nState({ currency });
    await setPreference('app_currency', currency);
  };

  const handleToggleNotifications = async (val: boolean) => {
    setNotificationsEnabled(val);
    await setPreference('notifications_enabled', val ? 'true' : 'false');
  };

  const handleCheckRemindersNow = async () => {
    const [tens, props, pays] = await Promise.all([
      getTenants(),
      getProperties(),
      getPayments(),
    ]);
    const alerts = getRentDueAlerts(tens, props, pays, 5);
    setDueAlertsCount(alerts.length);

    if (alerts.length === 0) {
      Alert.alert(
        isTr ? '✅ Tüm Kiralar Güncel' : '✅ All Rents Up to Date',
        isTr
          ? 'Kayıtlı tüm mülkleriniz kontrol edildi. Şu anda vadesi yaklaşan veya geciken kira bulunmuyor.'
          : 'All properties scanned. No rents are overdue or due soon.'
      );
    } else {
      const summaryList = alerts
        .slice(0, 3)
        .map(
          (a) =>
            `• ${a.tenant.name} (${a.property?.name || 'Mülk'}) - ${
              isTr ? a.statusTextTr : a.statusTextEn
            }`
        )
        .join('\n');

      Alert.alert(
        isTr
          ? `⏰ ${alerts.length} Kiracı İçin Vade Hatırlatması`
          : `⏰ ${alerts.length} Rent Reminders Found`,
        `${summaryList}\n\n${
          isTr
            ? 'Ana sayfadaki bildirim kartından tek tuşla WhatsApp hatırlatma mesajı gönderebilirsiniz.'
            : 'You can send a 1-tap WhatsApp reminder from the dashboard.'
        }`,
        [
          { text: isTr ? 'Kapat' : 'Close', style: 'cancel' },
          {
            text: isTr ? 'Paneli Aç' : 'Open Dashboard',
            onPress: () => router.push('/'),
          },
        ]
      );
    }
  };

  const handleRestorePurchases = async () => {
    const { restored } = await restorePurchasesFromStore();
    if (restored) {
      Alert.alert(
        isTr ? 'Başarılı' : 'Restored',
        isTr
          ? 'Mevcut RentLedger PRO aboneliğiniz başarıyla geri yüklendi.'
          : 'Your RentLedger PRO subscription has been restored.'
      );
    } else {
      Alert.alert(
        isTr ? 'Abonelik Bulunamadı' : 'No Subscription Found',
        isTr
          ? 'Bu hesaba tanımlı aktif bir PRO abonelik bulunamadı.'
          : 'No active subscription was found.'
      );
    }
  };

  const handleResetData = () => {
    Alert.alert(
      t('resetDataBtn', i18n.lang),
      isTr
        ? 'Tüm mülkler, kiracılar, ödeme kayıtları ve ücretsiz makbuz sayacı ilk kurulum haline sıfırlanacaktır. Onaylıyor musunuz?'
        : 'All properties, tenants, payment history, and receipt allowance will be reset. Confirm?',
      [
        { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: isTr ? 'Sıfırla' : 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAllLocalData();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#090d16]">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 115, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View className="mb-4">
          <Text className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            RentLedger Pro
          </Text>
          <Text className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
            {t('settingsTitle', i18n.lang)}
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('settingsSubtitle', i18n.lang)}
          </Text>
        </View>

        {/* PRO Durum Kartı */}
        <View className="rounded-3xl p-5 mb-5 bg-[#0f172a] dark:bg-[#131b2e] border border-emerald-500/30 shadow-lg">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-12 h-12 rounded-2xl bg-amber-500/20 items-center justify-center">
                <Crown size={24} color="#fbbf24" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-extrabold text-white">
                  {subState.isPro
                    ? t('membershipPro', i18n.lang)
                    : t('membershipFree', i18n.lang)}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  {subState.isPro
                    ? `${subState.activePlan} • Sınırsız Mülk & Makbuz Aktif`
                    : `${t('statFreeReceiptsRemaining', i18n.lang)}: ${remainingReceipts}/3 Makbuz`}
                </Text>
              </View>
            </View>
          </View>

          {!subState.isPro ? (
            <Pressable
              onPress={() => setPaywallVisible(true)}
              className="mt-2 py-3.5 rounded-2xl bg-amber-400 items-center justify-center flex-row gap-2 active:opacity-85 shadow-md">
              <Sparkles size={16} color="#0f172a" />
              <Text className="text-xs font-extrabold text-slate-950">
                {t('upgradeToPro', i18n.lang)}
              </Text>
            </Pressable>
          ) : (
            <View className="mt-2 pt-3 border-t border-white/10 flex-row items-center justify-between">
              <Text className="text-xs text-emerald-400 font-bold">
                ✓ Filigransız Resmi PDF & Sınırsız Mülk Aktif
              </Text>
              <Pressable onPress={() => setPaywallVisible(true)}>
                <Text className="text-xs font-bold text-slate-300 underline">
                  {isTr ? 'Planlar' : 'Plans'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Ev Sahibi / Yönetici Profili (Makbuz & IBAN Anteti) */}
        <View className="rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/90 p-5 mb-5 shadow-sm">
          <View className="flex-row items-center gap-2.5 mb-2">
            <UserCheck size={18} color="#10b981" />
            <Text className="text-sm font-black text-slate-900 dark:text-white">
              {t('landlordProfileTitle', i18n.lang)}
            </Text>
          </View>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {t('landlordProfileSub', i18n.lang)}
          </Text>

          <View className="gap-3">
            <View>
              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isTr ? 'Ad Soyad / Mülk Sahibi Ünvanı' : 'Landlord / Manager Name'}
              </Text>
              <TextInput
                value={profile.fullName}
                onChangeText={(text) => setProfile({ ...profile, fullName: text })}
                placeholder={isTr ? 'Örn: Mehmet Özkan veya Özkan Gayrimenkul' : 'e.g. John Doe'}
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs text-slate-900 dark:text-white font-semibold"
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isTr ? 'Banka Adı' : 'Bank Name'}
                </Text>
                <TextInput
                  value={profile.bankName}
                  onChangeText={(text) => setProfile({ ...profile, bankName: text })}
                  placeholder={isTr ? 'Örn: Ziraat, Garanti' : 'e.g. Chase'}
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs text-slate-900 dark:text-white font-semibold"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isTr ? 'İletişim Telefonu' : 'Phone'}
                </Text>
                <TextInput
                  value={profile.phone}
                  onChangeText={(text) => setProfile({ ...profile, phone: text })}
                  keyboardType="phone-pad"
                  placeholder="05XX XXX XX XX"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs text-slate-900 dark:text-white font-semibold"
                />
              </View>
            </View>

            <View>
              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isTr ? 'Kira Ödeme IBAN Numarası' : 'Rent Collection IBAN'}
              </Text>
              <TextInput
                value={profile.iban}
                onChangeText={(text) => setProfile({ ...profile, iban: text })}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs text-slate-900 dark:text-white font-semibold"
              />
            </View>

            <Pressable
              onPress={handleSaveProfile}
              className="mt-1 py-3 rounded-2xl bg-emerald-600 active:opacity-85 items-center justify-center shadow-sm">
              <Text className="text-xs font-extrabold text-white">
                {t('saveProfileBtn', i18n.lang)}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Dil ve Para Birimi */}
        <View className="rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/90 p-5 mb-5 shadow-sm gap-4">
          {/* Dil */}
          <View>
            <View className="flex-row items-center gap-2 mb-2">
              <Globe size={16} color="#10b981" />
              <Text className="text-xs font-extrabold text-slate-900 dark:text-white">
                {t('languageLabel', i18n.lang)}
              </Text>
            </View>
            <View className="flex-row gap-2.5">
              <Pressable
                onPress={() => handleLanguageChange('tr')}
                className={`flex-1 py-2.5 rounded-2xl border items-center ${
                  i18n.lang === 'tr'
                    ? 'bg-emerald-600 border-emerald-500'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                <Text
                  className={`text-xs font-extrabold ${
                    i18n.lang === 'tr' ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                  🇹🇷 Türkçe
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleLanguageChange('en')}
                className={`flex-1 py-2.5 rounded-2xl border items-center ${
                  i18n.lang === 'en'
                    ? 'bg-emerald-600 border-emerald-500'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                <Text
                  className={`text-xs font-extrabold ${
                    i18n.lang === 'en' ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                  🇬🇧 English
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Para Birimi */}
          <View>
            <View className="flex-row items-center gap-2 mb-2">
              <Coins size={16} color="#f59e0b" />
              <Text className="text-xs font-extrabold text-slate-900 dark:text-white">
                {t('currencyLabel', i18n.lang)}
              </Text>
            </View>
            <View className="flex-row gap-2">
              {CURRENCY_OPTIONS.map((c) => (
                <Pressable
                  key={c.code}
                  onPress={() => handleCurrencyChange(c.symbol)}
                  className={`flex-1 py-2 rounded-xl border items-center ${
                    i18n.currency === c.symbol
                      ? 'bg-amber-500 border-amber-400'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}>
                  <Text
                    className={`text-xs font-extrabold ${
                      i18n.currency === c.symbol ? 'text-slate-950' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Görünüm & Kira Bildirimleri */}
        <View className="rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/90 mb-5 overflow-hidden shadow-sm">
          <View className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-indigo-500/15 items-center justify-center">
                {isDark ? <Moon size={18} color="#818cf8" /> : <Sun size={18} color="#f59e0b" />}
              </View>
              <View>
                <Text className="text-sm font-bold text-slate-900 dark:text-white">
                  {isTr ? 'Karanlık Mod' : 'Dark Mode'}
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  {isDark ? (isTr ? 'Açık (Gece)' : 'Dark') : (isTr ? 'Kapalı (Gündüz)' : 'Light')}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleColorScheme}
              trackColor={{ false: '#cbd5e1', true: '#10b981' }}
              thumbColor="#ffffff"
            />
          </View>

          <View className="p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1 pr-2">
                <View className="w-9 h-9 rounded-xl bg-emerald-500/15 items-center justify-center">
                  <Bell size={18} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('notificationsTitle', i18n.lang)}
                  </Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                    {dueAlertsCount > 0
                      ? isTr ? `Aktif • ${dueAlertsCount} kiracının vadesi yaklaşıyor!` : `Active • ${dueAlertsCount} rent(s) due!`
                      : t('notificationsSub', i18n.lang)}
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                thumbColor="#ffffff"
              />
            </View>

            <Pressable
              onPress={handleCheckRemindersNow}
              className="mt-3 py-2.5 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex-row items-center justify-between active:opacity-80">
              <Text className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                🔔 {t('checkRemindersBtn', i18n.lang)}
              </Text>
              <ChevronRight size={15} color="#10b981" />
            </Pressable>
          </View>
        </View>

        {/* Banner Ad Area */}
        <View className="mb-5">
          <SmartAdBanner isPro={subState.isPro} onUpgradePress={() => setPaywallVisible(true)} />
        </View>

        {/* Mağaza & Yasal */}
        <View className="rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/90 mb-5 overflow-hidden shadow-sm">
          <Pressable
            onPress={() => {
              Alert.alert(
                t('rateUs', i18n.lang),
                isTr
                  ? 'RentLedger Pro kira takibinizi kolaylaştırdı mı? 5 yıldız vererek destek olabilirsiniz.'
                  : 'Did RentLedger Pro help manage your rentals? Support us with a 5-star review.'
              );
            }}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/80 active:opacity-75">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-amber-500/15 items-center justify-center">
                <Star size={18} color="#f59e0b" />
              </View>
              <Text className="text-sm font-bold text-slate-900 dark:text-white">
                {t('rateUs', i18n.lang)}
              </Text>
            </View>
            <ChevronRight size={18} color="#64748b" />
          </Pressable>

          <Pressable
            onPress={handleRestorePurchases}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/80 active:opacity-75">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-blue-500/15 items-center justify-center">
                <RotateCcw size={18} color="#3b82f6" />
              </View>
              <Text className="text-sm font-bold text-slate-900 dark:text-white">
                {t('restorePurchases', i18n.lang)}
              </Text>
            </View>
            <ChevronRight size={18} color="#64748b" />
          </Pressable>

          <Pressable
            onPress={() => {
              setLegalDocType('privacy');
              setLegalModalVisible(true);
            }}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/80 active:opacity-75">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-purple-500/15 items-center justify-center">
                <Shield size={18} color="#a855f7" />
              </View>
              <Text className="text-sm font-bold text-slate-900 dark:text-white">
                {t('privacyPolicy', i18n.lang)}
              </Text>
            </View>
            <ChevronRight size={18} color="#64748b" />
          </Pressable>

          <Pressable
            onPress={() => {
              setLegalDocType('terms');
              setLegalModalVisible(true);
            }}
            className="flex-row items-center justify-between p-4 active:opacity-75">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-cyan-500/15 items-center justify-center">
                <FileText size={18} color="#06b6d4" />
              </View>
              <Text className="text-sm font-bold text-slate-900 dark:text-white">
                {t('termsOfUse', i18n.lang)}
              </Text>
            </View>
            <ChevronRight size={18} color="#64748b" />
          </Pressable>
        </View>

        {/* Veri Sıfırlama & Test */}
        <View className="rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/90 p-5 mb-6 shadow-sm">
          <View className="flex-row items-center gap-2.5 mb-3">
            <Database size={18} color="#64748b" />
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isTr
                ? `Mülk: ${totalProperties} • Tahsilat: ${totalPayments} • Kalan Ücretsiz Makbuz: ${remainingReceipts}/3`
                : `Properties: ${totalProperties} • Payments: ${totalPayments} • Free Receipts: ${remainingReceipts}/3`}
            </Text>
          </View>

          {!subState.isPro && (
            <Pressable
              onPress={() => requestInterstitialAdWithUpsell()}
              className="w-full py-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex-row items-center justify-center gap-2 mb-3 active:opacity-75">
              <Sparkles size={16} color="#10b981" />
              <Text className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                {isTr ? 'Tam Ekran Reklam & PRO Teklifini Test Et' : 'Test Full-Screen Ad & PRO Offer'}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleResetData}
            className="w-full py-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex-row items-center justify-center gap-2 active:opacity-75">
            <Trash2 size={16} color="#f43f5e" />
            <Text className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
              {t('resetDataBtn', i18n.lang)}
            </Text>
          </Pressable>
        </View>

        <Text className="text-center text-[11px] text-slate-400 dark:text-slate-600">
          RentLedger Pro v1.0.0 • Mobile Factory
        </Text>
      </ScrollView>

      {/* Paywall & Legal Modals */}
      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onPurchaseSuccess={(newState) => setSubState(newState)}
      />

      <LegalModal
        visible={legalModalVisible}
        onClose={() => setLegalModalVisible(false)}
        initialTab={legalDocType}
        externalPrivacyUrl="https://oguzhanbilgi.github.io/obappstudio-legal/privacy.html"
        externalTermsUrl="https://oguzhanbilgi.github.io/obappstudio-legal/terms.html"
      />
    </SafeAreaView>
  );
}
