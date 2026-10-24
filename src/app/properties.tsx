import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Building2, Calendar, Crown, MessageCircle, Phone, Plus, Trash2, User } from 'lucide-react-native';

import { NewTenantPropertyModal } from '@/components/new-tenant-property-modal';
import { RentPaywall } from '@/components/rent-paywall';
import { SmartAdBanner } from '@/components/smart-ad-banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { factory } from '@/config';
import { useThemeColors } from '@/constants/theme';
import { triggerHaptic } from '@/services/haptics';
import { formatMoney, useI18n } from '@/services/i18n';
import { propertyTypeLabel } from '@/services/rent-format';
import { openTenantChat } from '@/services/rent-reminders';
import { deleteProperty, getProperties, getTenants } from '@/services/rentledger-data';
import { FREE_PROPERTY_LIMIT, type PropertyRecord, type TenantRecord } from '@/services/rentledger-types';
import { useSubscription } from '@/services/revenuecat';

export default function PropertiesScreen() {
  const { t, language } = useI18n();
  const colors = useThemeColors();
  // Abonelik durumu canlı izlenir: satın alma sonrası limit ve reklam anında kalkar.
  const { isPro } = useSubscription();

  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const reload = useCallback(async () => {
    const [props, tens] = await Promise.all([getProperties(), getTenants()]);
    setProperties(props);
    setTenants(tens);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handleDelete = (property: PropertyRecord) => {
    triggerHaptic.warning();
    Alert.alert(t('deletePropertyTitle'), t('deletePropertyBody', { name: property.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteProperty(property.id);
          await reload();
        },
      },
    ]);
  };

  const handleCall = (phone: string) => {
    const dial = phone.replace(/[^\d+]/g, '');
    if (dial) Linking.openURL(`tel:${dial}`).catch(() => {});
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-widest text-accent">{factory.app.name}</Text>
            <Text className="mt-0.5 text-[26px] font-extrabold text-ink dark:text-ink-dark">{t('propertiesTitle')}</Text>
            <Text className="mt-0.5 text-sm text-muted dark:text-muted-dark">{t('propertiesSubtitle')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('propertyModalTitle')}
            onPress={() => setModalVisible(true)}
            className="min-h-[40px] flex-row items-center gap-1.5 rounded-2xl bg-primary px-3.5 active:opacity-80">
            <Plus size={16} color={colors.onBrand} />
            <Text className="text-xs font-extrabold text-on-brand">{t('addPropertyShort')}</Text>
          </Pressable>
        </View>

        {!isPro ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setPaywallVisible(true)}
            className="mt-4 flex-row items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 active:opacity-80">
            <View className="flex-1">
              <Text className="text-sm font-bold text-ink dark:text-ink-dark">
                {t('propertyLimitBanner', { used: properties.length, limit: FREE_PROPERTY_LIMIT })}
              </Text>
              <Text className="mt-0.5 text-xs text-muted dark:text-muted-dark">{t('propertyLimitHint')}</Text>
            </View>
            <View className="flex-row items-center gap-1 rounded-full bg-warning/20 px-2.5 py-1">
              <Crown size={12} color={colors.warning} />
              <Text className="text-[11px] font-extrabold text-warning">{t('paywallBadge')}</Text>
            </View>
          </Pressable>
        ) : null}

        {properties.length === 0 ? (
          <Card className="mt-6 items-center py-8">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
              <Building2 size={28} color={colors.accent} />
            </View>
            <Text className="mt-3 text-center text-base font-bold text-ink dark:text-ink-dark">{t('noPropertiesYet')}</Text>
            <Text className="mt-1 px-4 text-center text-sm text-muted dark:text-muted-dark">{t('noPropertiesSub')}</Text>
            <Button
              label={t('addFirstProperty')}
              icon={<Plus size={18} color={colors.onBrand} />}
              onPress={() => setModalVisible(true)}
              className="mt-5 self-stretch"
            />
          </Card>
        ) : (
          <View className="mt-4 gap-3">
            {properties.map((property) => {
              const tenant = tenants.find((item) => item.propertyId === property.id);
              return (
                <Card key={property.id}>
                  <View className="flex-row items-start justify-between gap-3 border-b border-line pb-3 dark:border-line-dark">
                    <View className="flex-1">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-base font-extrabold text-ink dark:text-ink-dark">{property.name}</Text>
                        <Text className="overflow-hidden rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">
                          {propertyTypeLabel(property.propertyType, language)}
                        </Text>
                      </View>
                      <Text className="mt-0.5 text-xs text-muted dark:text-muted-dark">{property.address}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('delete')}
                      onPress={() => handleDelete(property)}
                      hitSlop={6}
                      className="h-9 w-9 items-center justify-center rounded-xl bg-danger/10 active:opacity-70">
                      <Trash2 size={16} color={colors.danger} />
                    </Pressable>
                  </View>

                  {tenant ? (
                    <View className="mt-3">
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1 flex-row items-center gap-2">
                          <User size={15} color={colors.accent} />
                          <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">{tenant.name}</Text>
                        </View>
                        <Text className="text-[15px] font-extrabold text-accent">
                          {formatMoney(tenant.rentAmount, tenant.currency, language)}
                          <Text className="text-xs font-normal text-muted dark:text-muted-dark"> {t('periodMonth')}</Text>
                        </Text>
                      </View>

                      <View className="mt-2 flex-row flex-wrap items-center justify-between gap-2">
                        <View className="flex-row items-center gap-1.5">
                          <Calendar size={13} color={colors.muted} />
                          <Text className="text-xs text-muted dark:text-muted-dark">
                            {t('dueDayOfMonth', { day: tenant.paymentDueDay })}
                          </Text>
                        </View>
                        {tenant.depositAmount > 0 ? (
                          <Text className="text-xs text-muted dark:text-muted-dark">
                            {t('depositLabel', { amount: formatMoney(tenant.depositAmount, tenant.currency, language) })}
                          </Text>
                        ) : null}
                      </View>

                      {tenant.phone ? (
                        <View className="mt-3 flex-row gap-2">
                          <Button
                            label={t('callTenant')}
                            variant="secondary"
                            icon={<Phone size={15} color={colors.ink} />}
                            onPress={() => handleCall(tenant.phone)}
                            className="flex-1"
                          />
                          <Button
                            label={t('whatsappTenant')}
                            variant="secondary"
                            icon={<MessageCircle size={15} color={colors.accent} />}
                            onPress={() => void openTenantChat(tenant, language)}
                            className="flex-1"
                          />
                        </View>
                      ) : (
                        <Text className="mt-3 text-xs italic text-muted dark:text-muted-dark">{t('noPhone')}</Text>
                      )}
                    </View>
                  ) : (
                    <Text className="mt-3 text-xs italic text-muted dark:text-muted-dark">{t('noTenant')}</Text>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      <SmartAdBanner />

      <NewTenantPropertyModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={() => void reload()}
        currentPropertyCount={properties.length}
        onOpenPaywall={() => setPaywallVisible(true)}
      />
      <RentPaywall visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
    </SafeAreaView>
  );
}
