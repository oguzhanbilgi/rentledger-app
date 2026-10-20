import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Building2, Plus, User, X } from 'lucide-react-native';
import { CurrencyCode, PropertyRecord, TenantRecord, saveProperty, saveTenant } from '@/services/database';
import { AppLanguage, formatMoney, t } from '@/services/i18n';

interface NewTenantPropertyModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  lang: AppLanguage;
  isPro: boolean;
  currentPropertyCount: number;
  onOpenPaywall: () => void;
}

export function NewTenantPropertyModal({
  visible,
  onClose,
  onSaved,
  lang,
  isPro,
  currentPropertyCount,
  onOpenPaywall,
}: NewTenantPropertyModalProps) {
  const isTr = lang === 'tr';

  const [propName, setPropName] = useState('');
  const [propAddress, setPropAddress] = useState('');
  const [propType, setPropType] = useState<PropertyRecord['propertyType']>('apartment');

  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantTc, setTenantTc] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [dueDay, setDueDay] = useState('15');
  const [currency, setCurrency] = useState<CurrencyCode>('TRY');

  const handleSave = async () => {
    if (!isPro && currentPropertyCount >= 2) {
      Alert.alert(
        isTr ? 'Ücretsiz Limit Doldu' : 'Free Limit Reached',
        isTr
          ? 'Ücretsiz planda en fazla 2 mülk takip edebilirsiniz. Sınırsız mülk ve kiracı kaydı için PRO üyeliğe geçebilirsiniz.'
          : 'Free plan supports up to 2 properties. Upgrade to PRO for unlimited properties and tenants.',
        [
          { text: isTr ? 'Vazgeç' : 'Cancel', style: 'cancel' },
          {
            text: isTr ? "PRO'ya Geç" : 'Upgrade to PRO',
            onPress: () => {
              onClose();
              onOpenPaywall();
            },
          },
        ]
      );
      return;
    }

    if (!propName.trim()) {
      Alert.alert(isTr ? 'Eksik Bilgi' : 'Missing Info', isTr ? 'Lütfen mülk / daire adını girin.' : 'Please enter property name.');
      return;
    }
    if (!tenantName.trim()) {
      Alert.alert(isTr ? 'Eksik Bilgi' : 'Missing Info', isTr ? 'Lütfen kiracı adını girin.' : 'Please enter tenant name.');
      return;
    }

    const rentNum = parseFloat(rentAmount.replace(',', '.')) || 0;
    const depositNum = parseFloat(depositAmount.replace(',', '.')) || 0;
    const dueDayNum = parseInt(dueDay, 10) || 1;

    const propId = `prop_${Date.now()}`;
    const newProp: PropertyRecord = {
      id: propId,
      name: propName.trim(),
      address: propAddress.trim() || propName.trim(),
      propertyType: propType,
      createdAt: new Date().toISOString(),
    };

    const newTenant: TenantRecord = {
      id: `ten_${Date.now()}`,
      propertyId: propId,
      name: tenantName.trim(),
      phone: tenantPhone.trim(),
      tcOrId: tenantTc.trim(),
      rentAmount: rentNum,
      depositAmount: depositNum,
      currency,
      paymentDueDay: Math.min(Math.max(dueDayNum, 1), 31),
      leaseStartDate: new Date().toISOString().split('T')[0],
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await saveProperty(newProp);
    await saveTenant(newTenant);

    // Reset form
    setPropName('');
    setPropAddress('');
    setTenantName('');
    setTenantPhone('');
    setTenantTc('');
    setRentAmount('');
    setDepositAmount('');
    setDueDay('15');

    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white dark:bg-[#131b2e] rounded-t-3xl max-h-[90%] p-5 border-t border-slate-200 dark:border-slate-800">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <View className="flex-row items-center gap-2.5">
              <View className="w-10 h-10 rounded-2xl bg-emerald-500/15 items-center justify-center">
                <Building2 size={22} color="#10b981" />
              </View>
              <View>
                <Text className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isTr ? 'Yeni Mülk & Kiracı Ekle' : 'Add Property & Tenant'}
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  {isTr ? 'Taşınmaz ve kira sözleşme bilgileri' : 'Property and lease details'}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 active:opacity-70">
              <X size={18} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="py-4">
            {/* 1. Mülk Bilgileri */}
            <View className="mb-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                1. {isTr ? 'Taşınmaz Bilgileri' : 'Property Information'}
              </Text>

              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isTr ? 'Mülk / Daire Adı *' : 'Property Name *'}
              </Text>
              <TextInput
                value={propName}
                onChangeText={setPropName}
                placeholder={isTr ? 'Örn: Kadıköy 2+1 Daire, Bağdat Cad. Dükkan' : 'e.g. Apartment #4B, Downtown Store'}
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-white font-semibold mb-3"
              />

              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isTr ? 'Adres / Bina No' : 'Address / Building'}
              </Text>
              <TextInput
                value={propAddress}
                onChangeText={setPropAddress}
                placeholder={isTr ? 'Mahalle, Cadde, No, İl/İlçe' : 'Street address, city'}
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-white font-semibold mb-3"
              />

              {/* Mülk Türü */}
              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isTr ? 'Mülk Türü' : 'Property Type'}
              </Text>
              <View className="flex-row gap-2 mb-2">
                {[
                  { id: 'apartment', label: isTr ? 'Daire' : 'Apt' },
                  { id: 'shop', label: isTr ? 'Dükkan' : 'Shop' },
                  { id: 'office', label: isTr ? 'Ofis' : 'Office' },
                  { id: 'house', label: isTr ? 'Müstakil' : 'House' },
                ].map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setPropType(item.id as any)}
                    className={`flex-1 py-2 rounded-xl border items-center ${
                      propType === item.id
                        ? 'bg-emerald-600 border-emerald-500'
                        : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}>
                    <Text
                      className={`text-xs font-extrabold ${
                        propType === item.id ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* 2. Kiracı Bilgileri */}
            <View className="mb-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                2. {isTr ? 'Kiracı ve Kira Bilgileri' : 'Tenant & Lease Terms'}
              </Text>

              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isTr ? 'Kiracı Adı Soyadı *' : 'Tenant Full Name *'}
              </Text>
              <TextInput
                value={tenantName}
                onChangeText={setTenantName}
                placeholder={isTr ? 'Örn: Ahmet Yılmaz' : 'e.g. John Doe'}
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-white font-semibold mb-3"
              />

              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isTr ? 'Telefon Numarası' : 'Phone'}
                  </Text>
                  <TextInput
                    value={tenantPhone}
                    onChangeText={setTenantPhone}
                    keyboardType="phone-pad"
                    placeholder="05XX XXX XX XX"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-white font-semibold"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isTr ? 'TC / Kimlik No (Opsiyonel)' : 'ID / Tax No (Optional)'}
                  </Text>
                  <TextInput
                    value={tenantTc}
                    onChangeText={setTenantTc}
                    keyboardType="numeric"
                    placeholder="11 Haneli TC"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-white font-semibold"
                  />
                </View>
              </View>

              {/* Kira Bedeli, Ödeme Günü ve Depozito */}
              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isTr ? 'Aylık Kira Bedeli *' : 'Monthly Rent *'}
                  </Text>
                  <TextInput
                    value={rentAmount}
                    onChangeText={setRentAmount}
                    keyboardType="numeric"
                    placeholder="Örn: 25000"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-white font-semibold"
                  />
                </View>
                <View className="w-36">
                  <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isTr ? 'Ödeme Günü' : 'Due Day'}
                  </Text>
                  <TextInput
                    value={dueDay}
                    onChangeText={setDueDay}
                    keyboardType="numeric"
                    placeholder="Ayın 1-31'i"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-white font-semibold"
                  />
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isTr ? 'Alınan Depozito (Opsiyonel)' : 'Deposit Received (Optional)'}
                </Text>
                <TextInput
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                  keyboardType="numeric"
                  placeholder="Örn: 50000"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-white font-semibold"
                />
              </View>
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              className="w-full py-4 rounded-2xl bg-emerald-600 active:opacity-85 items-center justify-center flex-row gap-2 shadow-lg mb-6">
              <Plus size={18} color="#ffffff" />
              <Text className="text-sm font-extrabold text-white">
                {isTr ? 'Mülk ve Kiracıyı Kaydet' : 'Save Property & Tenant'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
