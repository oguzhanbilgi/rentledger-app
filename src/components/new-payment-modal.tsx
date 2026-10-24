import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CheckCircle2, DollarSign, FileText, MessageCircle, X } from 'lucide-react-native';
import {
  PaymentRecord,
  PropertyRecord,
  TenantRecord,
  generateNextReceiptNo,
  getLandlordProfile,
  savePayment,
} from '@/services/database';
import { AppLanguage, formatMoney } from '@/services/i18n';
import { getCurrentPeriodMonthYear, getTodayFormatted, sendPaymentConfirmationWhatsApp } from '@/services/rent-reminders';
import { generateAndShareReceiptPdf } from '@/services/receipt-pdf-generator';
import { requestStoreReviewIfAppropriate } from '@/services/store-review';

interface NewPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  tenants: TenantRecord[];
  properties: PropertyRecord[];
  lang: AppLanguage;
  isPro: boolean;
  onCheckPdfAllowance: () => Promise<boolean>;
}

export function NewPaymentModal({
  visible,
  onClose,
  onSaved,
  tenants,
  properties,
  lang,
  isPro,
  onCheckPdfAllowance,
}: NewPaymentModalProps) {
  const isTr = lang === 'tr';

  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState(getCurrentPeriodMonthYear(lang));
  const [paymentDate, setPaymentDate] = useState(getTodayFormatted());
  const [paymentMethod, setPaymentMethod] = useState<PaymentRecord['paymentMethod']>('bank_transfer');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible && tenants.length > 0 && !selectedTenantId) {
      const first = tenants[0];
      setSelectedTenantId(first.id);
      setAmount(String(first.rentAmount));
      setPeriod(getCurrentPeriodMonthYear(lang));
      setPaymentDate(getTodayFormatted());
    }
  }, [visible, tenants]);

  const handleSelectTenant = (tId: string) => {
    setSelectedTenantId(tId);
    const ten = tenants.find((t) => t.id === tId);
    if (ten) {
      setAmount(String(ten.rentAmount));
    }
  };

  const handleSavePayment = async () => {
    const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
    if (!selectedTenant) {
      Alert.alert(isTr ? 'Kiracı Seçilmedi' : 'No Tenant Selected', isTr ? 'Lütfen ödeme yapan kiracıyı seçin.' : 'Please select a tenant.');
      return;
    }

    const amountNum = parseFloat(amount.replace(',', '.')) || 0;
    if (amountNum <= 0) {
      Alert.alert(isTr ? 'Geçersiz Tutar' : 'Invalid Amount', isTr ? 'Lütfen geçerli bir kira tutarı girin.' : 'Please enter a valid amount.');
      return;
    }

    const prop = properties.find((p) => p.id === selectedTenant.propertyId);
    const receiptNo = await generateNextReceiptNo();

    const payment: PaymentRecord = {
      id: `pay_${Date.now()}`,
      tenantId: selectedTenant.id,
      propertyId: selectedTenant.propertyId,
      tenantName: selectedTenant.name,
      propertyName: prop?.name || 'Mülk',
      receiptNo,
      paymentDate: paymentDate.trim() || getTodayFormatted(),
      periodMonthYear: period.trim() || getCurrentPeriodMonthYear(lang),
      amount: amountNum,
      currency: selectedTenant.currency || 'TRY',
      paymentMethod,
      status: 'paid',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    await savePayment(payment);
    const landlord = await getLandlordProfile();

    onSaved();
    onClose();

    // Post-payment actions popup
    Alert.alert(
      isTr ? 'Kira Ödemesi Kaydedildi! 🎉' : 'Payment Recorded! 🎉',
      isTr
        ? `${payment.tenantName} için ${payment.periodMonthYear} dönemi ${formatMoney(payment.amount, payment.currency)} tutarındaki ödeme başarıyla işlendi.`
        : `Payment of ${formatMoney(payment.amount, payment.currency)} for ${payment.tenantName} has been recorded.`,
      [
        {
          text: isTr ? 'Kapat' : 'Close',
          style: 'cancel',
        },
        {
          text: isTr ? 'WhatsApp Mesajı' : 'WhatsApp Msg',
          onPress: async () => {
            await sendPaymentConfirmationWhatsApp(payment, landlord, lang);
            setTimeout(() => {
              requestStoreReviewIfAppropriate('com.mobilefactory.rentledger', 'RentLedger Pro', lang);
            }, 1500);
          },
        },
        {
          text: isTr ? 'Makbuz PDF Al' : 'PDF Receipt',
          onPress: async () => {
            const allowed = await onCheckPdfAllowance();
            if (allowed) {
              await generateAndShareReceiptPdf({
                payment,
                tenant: selectedTenant,
                property: prop,
                landlord,
                lang,
                isPro,
              });
              setTimeout(() => {
                requestStoreReviewIfAppropriate('com.mobilefactory.rentledger', 'RentLedger Pro', lang);
              }, 1500);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white dark:bg-[#131b2e] rounded-t-3xl max-h-[90%] p-5 border-t border-slate-200 dark:border-slate-800">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <View className="flex-row items-center gap-2.5">
              <View className="w-10 h-10 rounded-2xl bg-emerald-500/15 items-center justify-center">
                <DollarSign size={22} color="#10b981" />
              </View>
              <View>
                <Text className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isTr ? 'Kira Tahsilatı Ekle' : 'Record Rent Payment'}
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  {isTr ? 'Ödemeyi kaydedin ve anında resmi makbuz oluşturun' : 'Save payment & generate receipt'}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 active:opacity-70">
              <X size={18} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="py-4">
            {/* Kiracı Seçimi */}
            <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {isTr ? 'Ödeme Yapan Kiracı *' : 'Select Tenant *'}
            </Text>
            {tenants.length === 0 ? (
              <View className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-4">
                <Text className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                  {isTr
                    ? 'Henüz kayıtlı bir kiracınız yok. Lütfen önce "Yeni Mülk & Kiracı" butonundan kiracınızı ekleyin.'
                    : 'No tenants registered yet. Please add a property & tenant first.'}
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mb-4">
                {tenants.map((ten) => {
                  const isSelected = ten.id === selectedTenantId;
                  const prop = properties.find((p) => p.id === ten.propertyId);
                  return (
                    <Pressable
                      key={ten.id}
                      onPress={() => handleSelectTenant(ten.id)}
                      className={`py-3 px-4 rounded-2xl border ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-500 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}>
                      <Text
                        className={`text-xs font-extrabold ${
                          isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                        }`}>
                        {ten.name}
                      </Text>
                      <Text
                        className={`text-[11px] mt-0.5 ${
                          isSelected ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'
                        }`}>
                        {prop?.name || 'Mülk'} • {formatMoney(ten.rentAmount, ten.currency)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* Tutar & Dönem */}
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isTr ? 'Tahsil Edilen Tutar *' : 'Amount Paid *'}
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="25000"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-white font-bold"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isTr ? 'Kira Dönemi (Ay/Yıl)' : 'Period (Month/Year)'}
                </Text>
                <TextInput
                  value={period}
                  onChangeText={setPeriod}
                  placeholder={isTr ? 'Örn: Ekim 2026' : 'e.g. October 2026'}
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-white font-semibold"
                />
              </View>
            </View>

            {/* Tahsilat Tarihi & Ödeme Yöntemi */}
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isTr ? 'Ödeme Tarihi' : 'Payment Date'}
                </Text>
                <TextInput
                  value={paymentDate}
                  onChangeText={setPaymentDate}
                  placeholder="DD.MM.YYYY"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-white font-semibold"
                />
              </View>
            </View>

            {/* Ödeme Türü */}
            <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isTr ? 'Ödeme Yöntemi' : 'Payment Method'}
            </Text>
            <View className="flex-row gap-2 mb-4">
              {[
                { id: 'bank_transfer', label: isTr ? 'Banka / Havale' : 'Bank Transfer' },
                { id: 'cash', label: isTr ? 'Nakit Tahsilat' : 'Cash' },
                { id: 'credit_card', label: isTr ? 'Kredi Kartı' : 'Credit Card' },
              ].map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setPaymentMethod(m.id as any)}
                  className={`flex-1 py-2.5 rounded-xl border items-center ${
                    paymentMethod === m.id
                      ? 'bg-emerald-600 border-emerald-500'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}>
                  <Text
                    className={`text-xs font-extrabold ${
                      paymentMethod === m.id ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Notlar */}
            <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isTr ? 'Açıklama / Not (Opsiyonel)' : 'Notes (Optional)'}
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={isTr ? 'Örn: Aidat dahil ödendi, kısmi ödeme' : 'e.g. Includes dues'}
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-white font-semibold mb-5"
            />

            {/* Kaydet Butonu */}
            <Pressable
              onPress={handleSavePayment}
              disabled={tenants.length === 0}
              className={`w-full py-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-lg mb-6 ${
                tenants.length === 0 ? 'bg-slate-300 dark:bg-slate-800 opacity-50' : 'bg-emerald-600 active:opacity-85'
              }`}>
              <CheckCircle2 size={18} color="#ffffff" />
              <Text className="text-sm font-extrabold text-white">
                {isTr ? 'Kira Ödemesini Kaydet & Makbuz Al' : 'Save Payment & Get Receipt'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
