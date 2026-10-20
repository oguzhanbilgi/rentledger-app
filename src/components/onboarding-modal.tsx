import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BellRing,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  FileText,
  Home,
  MessageCircle,
  Receipt,
  Send,
  Share2,
  Sparkles,
  Store,
  Wallet,
} from 'lucide-react-native';
import { AppLanguage } from '@/services/i18n';

interface OnboardingModalProps {
  visible: boolean;
  onFinish: () => void;
  lang: AppLanguage;
}

export function OnboardingModal({ visible, onFinish, lang }: OnboardingModalProps) {
  const insets = useSafeAreaInsets();
  const isTr = lang === 'tr';

  const [step, setStep] = useState(0);
  const [selectedUnits, setSelectedUnits] = useState('1-2');
  const [selectedMethod, setSelectedMethod] = useState('excel');
  const [selectedPainPoint, setSelectedPainPoint] = useState('overdue');
  const [tutorialTab, setTutorialTab] = useState<0 | 1 | 2>(0);

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      onFinish();
    }
  };

  // Android navigation bar fix:
  // On devices with 3-button navigation, insets.bottom inside Modal can be 0 or ~48dp.
  // We guarantee at least 56dp bottom space so buttons NEVER collide with system navigation!
  const safeBottomPadding = Math.max(insets.bottom, 48) + 12;
  const safeTopPadding = Math.max(insets.top, 24) + 8;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={true}>
      <View
        style={{
          flex: 1,
          backgroundColor: '#070b14',
          paddingTop: safeTopPadding,
          paddingBottom: safeBottomPadding,
          paddingHorizontal: 20,
          justifyContent: 'space-between',
        }}>
        {/* Top Header & Progress Indicator */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-2.5">
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-emerald-400" />
              <Text className="text-xs font-black tracking-widest text-emerald-400 uppercase">
                RentLedger Pro • {isTr ? `Adım ${step + 1} / ${totalSteps}` : `Step ${step + 1} of ${totalSteps}`}
              </Text>
            </View>

            {step < totalSteps - 1 && (
              <Pressable
                onPress={onFinish}
                hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
                className="py-1 px-3 rounded-lg bg-slate-800/80 active:bg-slate-700 border border-slate-700/60">
                <Text className="text-xs font-bold text-slate-400">
                  {isTr ? 'Atla' : 'Skip'}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Progress Bar */}
          <View className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex-row">
            <View
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </View>
        </View>

        {/* Scrollable Step Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled">

          {/* STEP 0: MÜLK SAYISI */}
          {step === 0 && (
            <View>
              <View className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 items-center justify-center mb-4">
                <Building2 size={28} color="#34d399" />
              </View>

              <Text className="text-2xl font-black text-white mb-2 tracking-tight">
                {isTr ? 'Kaç adet kiralık mülkünüz var?' : 'How many properties do you manage?'}
              </Text>
              <Text className="text-sm text-slate-400 mb-5 leading-5">
                {isTr
                  ? 'Size en uygun kira takip düzenini oluşturabilmemiz için taşınmaz sayınızı seçin.'
                  : 'Select your property count to optimize your personal rent ledger.'}
              </Text>

              {[
                {
                  id: '1-2',
                  icon: Home,
                  label: isTr ? '1 - 2 Taşınmaz (Daire / Dükkan)' : '1 - 2 Properties (Apartment / Store)',
                  desc: isTr ? 'Bireysel ev sahipleri için ideal başlangıç' : 'Ideal for individual property owners',
                },
                {
                  id: '3-5',
                  icon: Store,
                  label: isTr ? '3 - 5 Taşınmaz' : '3 - 5 Properties',
                  desc: isTr ? 'Çoklu mülk, konut ve kiracı yönetimi' : 'Multi-unit residential & commercial ledger',
                },
                {
                  id: '6+',
                  icon: Building2,
                  label: isTr ? '6+ Taşınmaz / Bina & Apartman' : '6+ Properties / Commercial Buildings',
                  desc: isTr ? 'Profesyonel mülk ve gayrimenkul yöneticileri' : 'Professional real estate managers',
                },
              ].map((item) => {
                const IconComp = item.icon;
                const isSelected = selectedUnits === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedUnits(item.id)}
                    className={`p-4 rounded-2xl border mb-3 flex-row items-center gap-3.5 transition-all ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-500 shadow-md'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}>
                    <View
                      className={`w-10 h-10 rounded-xl items-center justify-center ${
                        isSelected ? 'bg-emerald-500/25' : 'bg-slate-800'
                      }`}>
                      <IconComp size={20} color={isSelected ? '#34d399' : '#94a3b8'} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-white mb-0.5">{item.label}</Text>
                      <Text className="text-xs text-slate-400">{item.desc}</Text>
                    </View>
                    <View
                      className={`w-6 h-6 rounded-full border items-center justify-center ${
                        isSelected ? 'bg-emerald-500 border-emerald-400' : 'border-slate-700'
                      }`}>
                      {isSelected && <CheckCircle2 size={16} color="#070b14" />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* STEP 1: ESKİ YÖNTEMLER */}
          {step === 1 && (
            <View>
              <View className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/40 items-center justify-center mb-4">
                <Receipt size={28} color="#60a5fa" />
              </View>

              <Text className="text-2xl font-black text-white mb-2 tracking-tight">
                {isTr ? 'Kiraları şimdiye kadar nasıl takip ediyordunuz?' : 'How were you tracking rents?'}
              </Text>
              <Text className="text-sm text-slate-400 mb-5 leading-5">
                {isTr
                  ? 'Geleneksel yöntemlerin karmaşasından ve kaybolan kağıtlardan kurtulun.'
                  : 'Say goodbye to lost paper notes and messy spreadsheets.'}
              </Text>

              {[
                {
                  id: 'excel',
                  label: isTr ? 'Excel & Hesap Tabloları' : 'Excel & Spreadsheets',
                  desc: isTr ? 'Telefonda doldurması zor, hatırlatıcı yapmaz' : 'Hard to use on mobile phones, no reminders',
                },
                {
                  id: 'notebook',
                  label: isTr ? 'Kağıt Not Defteri / Ajanda' : 'Paper Notebook / Diary',
                  desc: isTr ? 'Kayıp riski yüksek, resmi makbuz üretmez' : 'High risk of loss, no official receipts',
                },
                {
                  id: 'bank',
                  label: isTr ? 'Banka Hareketlerinden Bakıyordum' : 'Checking Bank Statements',
                  desc: isTr ? 'Kimin eksik ödediği veya geciktiği karışıyor' : 'Confusing to track who paid in full',
                },
              ].map((item) => {
                const isSelected = selectedMethod === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedMethod(item.id)}
                    className={`p-4 rounded-2xl border mb-3 flex-row items-center justify-between ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 shadow-md'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}>
                    <View className="flex-1 pr-3">
                      <Text className="text-sm font-bold text-white mb-0.5">{item.label}</Text>
                      <Text className="text-xs text-slate-400">{item.desc}</Text>
                    </View>
                    <View
                      className={`w-6 h-6 rounded-full border items-center justify-center ${
                        isSelected ? 'bg-blue-500 border-blue-400' : 'border-slate-700'
                      }`}>
                      {isSelected && <CheckCircle2 size={16} color="#070b14" />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* STEP 2: ZORLANILAN KONU */}
          {step === 2 && (
            <View>
              <View className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 items-center justify-center mb-4">
                <BellRing size={28} color="#fbbf24" />
              </View>

              <Text className="text-2xl font-black text-white mb-2 tracking-tight">
                {isTr ? 'En çok hangi konuda zorlanıyorsunuz?' : 'What is your biggest headache?'}
              </Text>
              <Text className="text-sm text-slate-400 mb-5 leading-5">
                {isTr
                  ? 'RentLedger Pro tüm bu pürüzleri tek tıkla ortadan kaldırmak için geliştirildi.'
                  : 'RentLedger Pro is built specifically to automate these chores.'}
              </Text>

              {[
                {
                  id: 'overdue',
                  label: isTr ? 'Geciken Kiraları Takip & Hatırlatmak' : 'Tracking & Reminding Overdue Rents',
                  desc: isTr ? 'Tek dokunuşla hazır WhatsApp ödeme mesajı oluşturur' : '1-tap WhatsApp payment reminder with IBAN',
                },
                {
                  id: 'receipt',
                  label: isTr ? 'Resmi PDF Makbuzu Düzenlemek' : 'Issuing Official PDF Receipts',
                  desc: isTr ? 'Kaşeli, imzalı ve tutarı yazıyla yasal makbuz üretir' : 'Numbered receipts with words & signature block',
                },
                {
                  id: 'reports',
                  label: isTr ? 'Kimin Ne Kadar Borcu Kaldı Karışıyor' : 'Unclear Remaining Balances',
                  desc: isTr ? 'Mülk ve kiracı bazında net bakiye ve tahsilat takibi' : 'Clean balance tracking and payment history',
                },
              ].map((item) => {
                const isSelected = selectedPainPoint === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedPainPoint(item.id)}
                    className={`p-4 rounded-2xl border mb-3 flex-row items-center justify-between ${
                      isSelected
                        ? 'bg-amber-950/60 border-amber-500 shadow-md'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}>
                    <View className="flex-1 pr-3">
                      <Text className="text-sm font-bold text-white mb-0.5">{item.label}</Text>
                      <Text className="text-xs text-slate-400">{item.desc}</Text>
                    </View>
                    <View
                      className={`w-6 h-6 rounded-full border items-center justify-center ${
                        isSelected ? 'bg-amber-500 border-amber-400' : 'border-slate-700'
                      }`}>
                      {isSelected && <CheckCircle2 size={16} color="#070b14" />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* STEP 3: İNTERAKTİF ÖĞRETİCİ (TUTORIAL WALKTHROUGH) */}
          {step === 3 && (
            <View>
              <View className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 items-center justify-center mb-3">
                <Sparkles size={28} color="#34d399" />
              </View>

              <Text className="text-2xl font-black text-white mb-1.5 tracking-tight">
                {isTr ? '3 Adımda Kolay Kira Takibi' : 'Rent Tracking in 3 Simple Steps'}
              </Text>
              <Text className="text-xs text-slate-400 mb-4">
                {isTr
                  ? 'RentLedger Pro nasıl çalışır? Aşağıdaki adımlara dokunarak inceleyin:'
                  : 'How RentLedger Pro works. Tap each step below to preview:'}
              </Text>

              {/* Interactive Tutorial Stepper Tabs */}
              <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl p-1 mb-4">
                {[
                  { id: 0, title: isTr ? '1. Mülk Ekle' : '1. Add Unit' },
                  { id: 1, title: isTr ? '2. Tahsil Et' : '2. Collect' },
                  { id: 2, title: isTr ? '3. Makbuz Kes' : '3. Receipt' },
                ].map((tab) => (
                  <Pressable
                    key={tab.id}
                    onPress={() => setTutorialTab(tab.id as 0 | 1 | 2)}
                    className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
                      tutorialTab === tab.id ? 'bg-emerald-500 shadow-sm' : 'bg-transparent'
                    }`}>
                    <Text
                      className={`text-xs font-black ${
                        tutorialTab === tab.id ? 'text-slate-950' : 'text-slate-400'
                      }`}>
                      {tab.title}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Dynamic Step Walkthrough Card */}
              {tutorialTab === 0 && (
                <View className="rounded-2xl bg-slate-900 border border-emerald-500/40 p-4 mb-3">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Home size={18} color="#34d399" />
                    <Text className="text-sm font-black text-emerald-400">
                      {isTr ? 'Adım 1: Mülk ve Kiracıyı Kaydedin' : 'Step 1: Save Property & Tenant'}
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-300 mb-3 leading-5">
                    {isTr
                      ? 'Daire, dükkan veya arsanızı ekleyin. Kiracının adı, kira tutarı ve her ayın hangi günü ödeme yapacağını belirleyin.'
                      : 'Add your apartment or shop. Set the tenant name, rent amount, and the monthly due date.'}
                  </Text>
                  <View className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex-row justify-between items-center">
                    <View>
                      <Text className="text-xs font-bold text-white">
                        {isTr ? 'Kadıköy Daire 4' : 'Sunset Apt #4'}
                      </Text>
                      <Text className="text-[11px] text-slate-400">
                        {isTr ? 'Mehmet Demir • Her ayın 15\'i' : 'John Doe • 15th of every month'}
                      </Text>
                    </View>
                    <Text className="text-xs font-black text-emerald-400">
                      {isTr ? '₺ 28.500 / ay' : '$ 850 / mo'}
                    </Text>
                  </View>
                </View>
              )}

              {tutorialTab === 1 && (
                <View className="rounded-2xl bg-slate-900 border border-blue-500/40 p-4 mb-3">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Wallet size={18} color="#60a5fa" />
                    <Text className="text-sm font-black text-blue-400">
                      {isTr ? 'Adım 2: 15 Saniyede Tahsilat Kaydı' : 'Step 2: Record Payment in 15s'}
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-300 mb-3 leading-5">
                    {isTr
                      ? 'Kiracı ödeme yaptığında Banka Havalesi, Nakit veya Kart seçerek tek tıkla kaydedin. Kalan borç anında sıfırlanır.'
                      : 'When tenant pays, select Bank Transfer, Cash or Card. Balances update instantly in real-time.'}
                  </Text>
                  <View className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                      <View className="w-2 h-2 rounded-full bg-emerald-400" />
                      <Text className="text-xs font-bold text-white">
                        {isTr ? 'Ekim 2026 Kirası' : 'October 2026 Rent'}
                      </Text>
                    </View>
                    <Text className="text-xs font-black text-emerald-400">
                      {isTr ? '✓ Tahsil Edildi' : '✓ Paid & Collected'}
                    </Text>
                  </View>
                </View>
              )}

              {tutorialTab === 2 && (
                <View className="rounded-2xl bg-slate-900 border border-amber-500/40 p-4 mb-3">
                  <View className="flex-row items-center gap-2 mb-2">
                    <FileText size={18} color="#fbbf24" />
                    <Text className="text-sm font-black text-amber-400">
                      {isTr ? 'Adım 3: Resmi PDF Makbuz & WhatsApp' : 'Step 3: Official PDF Receipt & WhatsApp'}
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-300 mb-3 leading-5">
                    {isTr
                      ? 'Otomatik tutarı yazıyla, IBAN ve imza alanıyla yasal geçerli A4 PDF Kira Tahsilat Makbuzu üretin ve doğrudan WhatsApp’tan paylaşın!'
                      : 'Generate official A4 rent payment receipts with amount in words and signature box. Share via WhatsApp with 1 tap!'}
                  </Text>
                  <View className="bg-emerald-950/40 rounded-xl p-2.5 border border-emerald-500/40 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Send size={14} color="#34d399" />
                      <Text className="text-xs font-bold text-white">
                        {isTr ? 'Makbuz No: RNT-2026-001' : 'Receipt #RNT-2026-001'}
                      </Text>
                    </View>
                    <Text className="text-[11px] font-black text-emerald-300">
                      {isTr ? "WhatsApp'la Gönder" : 'Send via WhatsApp'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Value proposition pill */}
              <View className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex-row items-center gap-2.5">
                <CheckCircle2 size={16} color="#34d399" />
                <Text className="text-xs text-slate-300 font-medium flex-1">
                  {isTr
                    ? '%100 Güvenli & Çevrimdışı: Verileriniz sunucuda değil, cihazınızda saklanır.'
                    : '100% Private & Offline: Your records stay safely on your device.'}
                </Text>
              </View>
            </View>
          )}

        </ScrollView>

        {/* Elevated Action Button Container */}
        {/* Placed firmly above any Android navigation bar */}
        <View className="pt-3 border-t border-slate-800/80 bg-[#070b14]">
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            className="w-full py-4 rounded-2xl bg-emerald-500 flex-row items-center justify-center gap-2 shadow-xl shadow-emerald-500/20">
            <Text className="text-sm font-black text-slate-950">
              {step < totalSteps - 1
                ? (isTr ? 'Devam Et' : 'Continue')
                : (isTr ? 'Uygulamayı Kullanmaya Başla' : 'Start Using RentLedger')}
            </Text>
            <ChevronRight size={18} color="#070b14" />
          </Pressable>
        </View>

      </View>
    </Modal>
  );
}
