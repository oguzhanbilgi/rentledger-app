import React, { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
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
  Building2,
  Calendar,
  DollarSign,
  MessageCircle,
  Phone,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react-native';

import {
  PropertyRecord,
  TenantRecord,
  deleteProperty,
  getProperties,
  getTenants,
  initLocalDatabase,
} from '@/services/database';
import { AppLanguage, formatMoney, getI18nState, t } from '@/services/i18n';
import {
  getCurrentSubscriptionState,
  SubscriptionState,
} from '@/services/revenuecat';
import { SmartAdBanner } from '@/components/smart-ad-banner';
import { NewTenantPropertyModal } from '@/components/new-tenant-property-modal';
import { PaywallModal } from '@/components/paywall-modal';
import { requestInterstitialAdWithUpsell } from '@/components/periodic-ad-modal';

export default function PropertiesScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [i18n] = useState(getI18nState());
  const [subState, setSubState] = useState<SubscriptionState>(
    getCurrentSubscriptionState()
  );

  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const isTr = i18n.lang === 'tr';

  const loadData = async () => {
    await initLocalDatabase();
    const [props, tens] = await Promise.all([getProperties(), getTenants()]);
    setProperties(props);
    setTenants(tens);
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

  const handleDeleteProperty = (property: PropertyRecord) => {
    Alert.alert(
      isTr ? 'Mülkü Sil' : 'Delete Property',
      isTr
        ? `"${property.name}" mülkünü ve bu mülke bağlı kiracıyı silmek istediğinizden emin misiniz?`
        : `Delete "${property.name}" and associated tenant?`,
      [
        { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: isTr ? 'Sil' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProperty(property.id);
            await loadData();
          },
        },
      ]
    );
  };

  const handleCall = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/[^0-9]/g, '')}`).catch(() => {});
  };

  const handleWhatsApp = (phone: string, tenantName: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = isTr
      ? `Merhaba ${tenantName}, müsait olduğunuzda görüşebilir miyiz?`
      : `Hello ${tenantName}, are you available for a quick chat?`;
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`).catch(() => {});
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
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              RentLedger Pro
            </Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {t('propertiesTitle', i18n.lang)}
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('propertiesSubtitle', i18n.lang)}
            </Text>
          </View>

          <Pressable
            onPress={() => setModalVisible(true)}
            className="py-2.5 px-3.5 rounded-2xl bg-emerald-600 active:opacity-85 flex-row items-center gap-1.5 shadow-md">
            <Plus size={16} color="#ffffff" />
            <Text className="text-xs font-extrabold text-white">
              {isTr ? 'Yeni Mülk' : 'Add Property'}
            </Text>
          </Pressable>
        </View>

        {/* Mülk & Kiracı Kotası (Free / Pro) */}
        {!subState.isPro && (
          <View className="rounded-2xl p-4 mb-4 bg-amber-500/10 border border-amber-500/30 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-xs font-extrabold text-amber-800 dark:text-amber-300">
                {isTr ? `Ücretsiz Mülk Kotası: ${properties.length}/2 Mülk` : `Free Property Limit: ${properties.length}/2 Units`}
              </Text>
              <Text className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                {isTr ? 'Sınırsız mülk ve kiracı eklemek için PRO pakete geçin.' : 'Upgrade to PRO for unlimited properties.'}
              </Text>
            </View>
            <Pressable
              onPress={() => setPaywallVisible(true)}
              className="py-1.5 px-3 rounded-xl bg-amber-400 active:opacity-85 flex-row items-center gap-1">
              <Sparkles size={12} color="#0f172a" />
              <Text className="text-[11px] font-black text-slate-950">PRO</Text>
            </Pressable>
          </View>
        )}

        {/* Mülk Listesi */}
        {properties.length === 0 ? (
          <View className="p-8 rounded-3xl bg-white dark:bg-[#131b2e] border border-dashed border-slate-300 dark:border-slate-800 items-center justify-center my-6">
            <View className="w-14 h-14 rounded-3xl bg-emerald-500/10 items-center justify-center mb-3">
              <Building2 size={28} color="#10b981" />
            </View>
            <Text className="text-base font-extrabold text-slate-900 dark:text-white mb-1 text-center">
              {t('noPropertiesYet', i18n.lang)}
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mb-5 px-6 leading-5">
              {t('noPropertiesSub', i18n.lang)}
            </Text>
            <Pressable
              onPress={() => setModalVisible(true)}
              className="py-3 px-5 rounded-2xl bg-emerald-600 flex-row items-center gap-2 active:opacity-85 shadow-md">
              <Plus size={18} color="#ffffff" />
              <Text className="text-xs font-extrabold text-white">
                {isTr ? 'İlk Mülkünüzü Ekleyin' : 'Add Your First Property'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-3.5 mb-6">
            {properties.map((prop) => {
              const tenant = tenants.find((t) => t.propertyId === prop.id);
              const typeLabel =
                prop.propertyType === 'apartment' ? (isTr ? 'Daire' : 'Apartment')
                : prop.propertyType === 'shop' ? (isTr ? 'Dükkan' : 'Shop')
                : prop.propertyType === 'office' ? (isTr ? 'Ofis' : 'Office')
                : (isTr ? 'Müstakil' : 'House');

              return (
                <View
                  key={prop.id}
                  className="rounded-3xl p-5 bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/90 shadow-sm">
                  {/* Property Header */}
                  <View className="flex-row items-start justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-2 flex-wrap mb-0.5">
                        <Text className="text-base font-black text-slate-900 dark:text-white">
                          {prop.name}
                        </Text>
                        <View className="py-0.5 px-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                          <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {typeLabel}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">
                        {prop.address}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => handleDeleteProperty(prop)}
                      className="p-2 rounded-xl bg-rose-500/10 active:opacity-70">
                      <Trash2 size={16} color="#f43f5e" />
                    </Pressable>
                  </View>

                  {/* Tenant Details Card inside Property */}
                  {tenant ? (
                    <View className="rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/80">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-2">
                          <User size={15} color="#10b981" />
                          <Text className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {tenant.name}
                          </Text>
                        </View>
                        <Text className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {formatMoney(tenant.rentAmount, tenant.currency)}
                          <Text className="text-[11px] font-normal text-slate-400"> / ay</Text>
                        </Text>
                      </View>

                      <View className="flex-row items-center justify-between text-xs text-slate-500 mb-3">
                        <View className="flex-row items-center gap-1">
                          <Calendar size={13} color="#64748b" />
                          <Text className="text-xs text-slate-500 dark:text-slate-400">
                            {isTr ? `Her ayın ${tenant.paymentDueDay}'i` : `Due on ${tenant.paymentDueDay}th`}
                          </Text>
                        </View>

                        {tenant.depositAmount > 0 && (
                          <Text className="text-[11px] text-slate-400">
                            Depozito: {formatMoney(tenant.depositAmount, tenant.currency)}
                          </Text>
                        )}
                      </View>

                      {/* Contact Buttons */}
                      <View className="flex-row gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                        {tenant.phone ? (
                          <>
                            <Pressable
                              onPress={() => handleCall(tenant.phone)}
                              className="flex-1 py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 flex-row items-center justify-center gap-1.5 active:opacity-75">
                              <Phone size={13} color="#64748b" />
                              <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {t('callTenant', i18n.lang)}
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={() => handleWhatsApp(tenant.phone, tenant.name)}
                              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 flex-row items-center justify-center gap-1.5 active:opacity-85 shadow-sm">
                              <MessageCircle size={13} color="#ffffff" />
                              <Text className="text-xs font-bold text-white">
                                {t('whatsappTenant', i18n.lang)}
                              </Text>
                            </Pressable>
                          </>
                        ) : (
                          <Text className="text-xs text-slate-400 italic">
                            {isTr ? 'Telefon numarası kaydedilmedi' : 'No phone number saved'}
                          </Text>
                        )}
                      </View>
                    </View>
                  ) : (
                    <Text className="text-xs text-slate-400 italic">
                      {isTr ? 'Bu mülke atanmış aktif kiracı yok.' : 'No active tenant assigned.'}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Banner Ad Area */}
        <View className="mb-4">
          <SmartAdBanner isPro={subState.isPro} onUpgradePress={() => setPaywallVisible(true)} />
        </View>
      </ScrollView>

      {/* Modals */}
      <NewTenantPropertyModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={async () => {
          await loadData();
          requestInterstitialAdWithUpsell();
        }}
        lang={i18n.lang}
        isPro={subState.isPro}
        currentPropertyCount={properties.length}
        onOpenPaywall={() => setPaywallVisible(true)}
      />

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onPurchaseSuccess={(newState) => setSubState(newState)}
      />
    </SafeAreaView>
  );
}
