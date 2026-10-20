import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import {
  BellRing,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  Receipt,
  Sparkles,
} from 'lucide-react-native';
import { AppLanguage, t } from '@/services/i18n';

interface OnboardingModalProps {
  visible: boolean;
  onFinish: () => void;
  lang: AppLanguage;
}

export function OnboardingModal({ visible, onFinish, lang }: OnboardingModalProps) {
  const isTr = lang === 'tr';
  const [step, setStep] = useState(0);

  const [selectedUnits, setSelectedUnits] = useState('1-2');
  const [selectedMethod, setSelectedMethod] = useState('excel');
  const [selectedPainPoint, setSelectedPainPoint] = useState('overdue');

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      onFinish();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View className="flex-1 bg-slate-900 justify-between p-6">
        {/* Top Progress bar */}
        <View className="pt-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              RentLedger Pro • {isTr ? `Adım ${step + 1} / ${totalSteps}` : `Step ${step + 1} of ${totalSteps}`}
            </Text>
            {step < totalSteps - 1 && (
              <Pressable onPress={onFinish} className="py-1 px-3 rounded-lg bg-slate-800">
                <Text className="text-xs font-semibold text-slate-400">
                  {isTr ? 'Atla' : 'Skip'}
                </Text>
              </Pressable>
            )}
          </View>
          <View className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex-row">
            <View
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </View>
        </View>

        {/* Content Body */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 24 }}>
          {step === 0 && (
            <View>
              <View className="w-16 h-16 rounded-3xl bg-emerald-500/20 items-center justify-center mb-6">
                <Building2 size={32} color="#10b981" />
              </View>
              <Text className="text-2xl font-black text-white mb-2">
                {isTr ? 'Kaç adet kiralık mülkünüz var?' : 'How many rental properties do you manage?'}
              </Text>
              <Text className="text-sm text-slate-400 mb-6">
                {isTr
                  ? 'Size en uygun kira takip düzenini oluşturabilmemiz için mülk sayınızı seçin.'
                  : 'Select your property count so we can optimize your rent ledger.'}
              </Text>

              {[
                { id: '1-2', label: isTr ? '1 - 2 Taşınmaz (Daire / Dükkan)' : '1 - 2 Properties (Apartment / Store)', desc: isTr ? 'Bireysel ev sahipleri için ideal' : 'Ideal for individual landlords' },
                { id: '3-5', label: isTr ? '3 - 5 Taşınmaz' : '3 - 5 Properties', desc: isTr ? 'Çoklu mülk ve kiracı yönetimi' : 'Multi-unit property management' },
                { id: '6+', label: isTr ? '6+ Taşınmaz / Bina & Apartman' : '6+ Properties / Commercial', desc: isTr ? 'Profesyonel mülk & site yöneticileri' : 'Professional property managers' },
              ].map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedUnits(item.id)}
                  className={`p-4 rounded-2xl border mb-3 flex-row items-center justify-between ${
                    selectedUnits === item.id
                      ? 'bg-emerald-950/60 border-emerald-500'
                      : 'bg-slate-800/60 border-slate-700/60'
                  }`}>
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-bold text-white mb-0.5">{item.label}</Text>
                    <Text className="text-xs text-slate-400">{item.desc}</Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border items-center justify-center ${
                      selectedUnits === item.id ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600'
                    }`}>
                    {selectedUnits === item.id && <CheckCircle2 size={16} color="#0f172a" />}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {step === 1 && (
            <View>
              <View className="w-16 h-16 rounded-3xl bg-blue-500/20 items-center justify-center mb-6">
                <Receipt size={32} color="#3b82f6" />
              </View>
              <Text className="text-2xl font-black text-white mb-2">
                {isTr ? 'Kiraları şimdiye kadar nasıl takip ediyordunuz?' : 'How were you tracking rents until now?'}
              </Text>
              <Text className="text-sm text-slate-400 mb-6">
                {isTr
                  ? 'Geleneksel yöntemlerin karmaşasından kurtulun.'
                  : 'Say goodbye to messy traditional methods.'}
              </Text>

              {[
                { id: 'excel', label: isTr ? 'Excel & Hesap Tabloları' : 'Excel & Spreadsheets', desc: isTr ? 'Mobilde kullanımı zor ve pratik değil' : 'Clunky on mobile phones' },
                { id: 'notebook', label: isTr ? 'Kağıt Not Defteri' : 'Paper Notebook / Diary', desc: isTr ? 'Kayıp riski yüksek, hatırlatma yapmaz' : 'Easy to lose, no auto-reminders' },
                { id: 'bank', label: isTr ? 'Banka Hareketlerinden Bakıyordum' : 'Checking Bank Statements', desc: isTr ? 'Kimin ödeyip ödemediği karışıyor' : 'Confusing to track who paid what' },
              ].map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedMethod(item.id)}
                  className={`p-4 rounded-2xl border mb-3 flex-row items-center justify-between ${
                    selectedMethod === item.id
                      ? 'bg-blue-950/60 border-blue-500'
                      : 'bg-slate-800/60 border-slate-700/60'
                  }`}>
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-bold text-white mb-0.5">{item.label}</Text>
                    <Text className="text-xs text-slate-400">{item.desc}</Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border items-center justify-center ${
                      selectedMethod === item.id ? 'bg-blue-500 border-blue-400' : 'border-slate-600'
                    }`}>
                    {selectedMethod === item.id && <CheckCircle2 size={16} color="#0f172a" />}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {step === 2 && (
            <View>
              <View className="w-16 h-16 rounded-3xl bg-amber-500/20 items-center justify-center mb-6">
                <BellRing size={32} color="#f59e0b" />
              </View>
              <Text className="text-2xl font-black text-white mb-2">
                {isTr ? 'En çok hangi konuda zorlanıyorsunuz?' : 'What is your biggest pain point?'}
              </Text>
              <Text className="text-sm text-slate-400 mb-6">
                {isTr
                  ? 'RentLedger Pro bu sorunların tümünü çözmek için tasarlandı.'
                  : 'RentLedger Pro is engineered to solve these exact headaches.'}
              </Text>

              {[
                { id: 'overdue', label: isTr ? 'Geciken Kiraları Takip & Hatırlatmak' : 'Tracking & Reminding Overdue Rents', desc: isTr ? 'Tek tuşla WhatsApp hatırlatması hazırlar' : '1-tap polite WhatsApp payment reminders' },
                { id: 'receipt', label: isTr ? 'Resmi PDF Makbuzu Düzenlemek' : 'Issuing Official PDF Receipts', desc: isTr ? 'Kaşeli, imzalı ve tutarı yazıyla makbuz üretir' : 'Numbered receipts with words & digital stamp' },
                { id: 'reports', label: isTr ? 'Kimin Ne Kadar Borcu Kaldı Karışıyor' : 'Confusion on Remaining Balances', desc: isTr ? 'Mülk ve kiracı bazında net özet sunar' : 'Clean monthly & yearly tenant ledger' },
              ].map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedPainPoint(item.id)}
                  className={`p-4 rounded-2xl border mb-3 flex-row items-center justify-between ${
                    selectedPainPoint === item.id
                      ? 'bg-amber-950/60 border-amber-500'
                      : 'bg-slate-800/60 border-slate-700/60'
                  }`}>
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-bold text-white mb-0.5">{item.label}</Text>
                    <Text className="text-xs text-slate-400">{item.desc}</Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border items-center justify-center ${
                      selectedPainPoint === item.id ? 'bg-amber-500 border-amber-400' : 'border-slate-600'
                    }`}>
                    {selectedPainPoint === item.id && <CheckCircle2 size={16} color="#0f172a" />}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {step === 3 && (
            <View>
              <View className="w-16 h-16 rounded-3xl bg-emerald-500/20 items-center justify-center mb-6">
                <FileCheck2 size={32} color="#10b981" />
              </View>
              <Text className="text-2xl font-black text-white mb-2">
                {isTr ? 'RentLedger Pro Sizin İçin Hazır!' : 'RentLedger Pro Is Ready!'}
              </Text>
              <Text className="text-sm text-slate-400 mb-6">
                {isTr
                  ? 'Kira gelirlerinizi artık profesyonelce yönetebilirsiniz.'
                  : 'You can now manage your rental income like a pro.'}
              </Text>

              {/* Showcase highlights */}
              <View className="rounded-2xl bg-slate-800/80 border border-slate-700/80 p-5 mb-4 gap-4">
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-xl bg-emerald-500/20 items-center justify-center">
                    <CheckCircle2 size={18} color="#10b981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white">
                      {isTr ? 'Otomatik Vade Takibi & Hatırlatıcı' : 'Auto Due-Date Tracking & Reminders'}
                    </Text>
                    <Text className="text-xs text-slate-400">
                      {isTr ? 'Kira günleri geldiğinde sizi uyarır, tek tıkla WhatsApp mesajı atar.' : 'Alerts you when rent is due with 1-tap WhatsApp follow-up.'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-xl bg-blue-500/20 items-center justify-center">
                    <CheckCircle2 size={18} color="#3b82f6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white">
                      {isTr ? 'Resmi PDF Kira & Tahsilat Makbuzu' : 'Official PDF Rent Payment Receipts'}
                    </Text>
                    <Text className="text-xs text-slate-400">
                      {isTr ? 'Tutarı yazıyla, IBAN ve kaşe/imza alanıyla resmi PDF üretir.' : 'Official PDF with amount in words, IBAN, and signature block.'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-xl bg-amber-500/20 items-center justify-center">
                    <CheckCircle2 size={18} color="#f59e0b" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white">
                      {isTr ? '%100 Güvenli & Çevrimdışı Çalışır' : '100% Private & Works Offline'}
                    </Text>
                    <Text className="text-xs text-slate-400">
                      {isTr ? 'Mülk ve kiracı verileriniz sadece telefonunuzda saklanır.' : 'Your data stays secure and local on your own device.'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Button */}
        <View className="pt-4 border-t border-slate-800">
          <Pressable
            onPress={handleNext}
            className="w-full py-4 rounded-2xl bg-emerald-500 active:opacity-85 flex-row items-center justify-center gap-2 shadow-lg">
            <Text className="text-sm font-extrabold text-slate-950">
              {step < totalSteps - 1 ? (isTr ? 'Devam Et' : 'Continue') : (isTr ? 'Uygulamayı Kullanmaya Başla' : 'Start Using RentLedger')}
            </Text>
            <ChevronRight size={18} color="#0f172a" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
