import React, { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExternalLink, FileText, ShieldCheck, X } from 'lucide-react-native';

export type LegalDocType = 'privacy' | 'terms';

export interface LegalModalProps {
  visible: boolean;
  initialTab?: LegalDocType;
  onClose: () => void;
  externalPrivacyUrl?: string;
  externalTermsUrl?: string;
}

export function LegalModal({
  visible,
  initialTab = 'privacy',
  onClose,
  externalPrivacyUrl = 'https://expo.dev/privacy',
  externalTermsUrl = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
}: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<LegalDocType>(initialTab);

  React.useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  const handleOpenExternal = () => {
    const url = activeTab === 'privacy' ? externalPrivacyUrl : externalTermsUrl;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-[#070a12]">
        {/* Üst Başlık ve Kapat Butonu */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-3 border-b border-slate-800/80">
          <View className="flex-row items-center gap-2">
            {activeTab === 'privacy' ? (
              <ShieldCheck size={20} color="#34d399" />
            ) : (
              <FileText size={20} color="#818cf8" />
            )}
            <Text className="text-base font-extrabold text-white">
              {activeTab === 'privacy'
                ? 'Gizlilik Politikası / Privacy Policy'
                : 'Kullanım Koşulları / Terms of Use'}
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={12}
            className="w-9 h-9 rounded-full bg-slate-800/90 items-center justify-center active:opacity-70">
            <X size={18} color="#94a3b8" />
          </Pressable>
        </View>

        {/* Sekme Seçici (Privacy / Terms) */}
        <View className="flex-row px-5 pt-3 pb-2 gap-2">
          <Pressable
            onPress={() => setActiveTab('privacy')}
            className={`flex-1 py-2.5 rounded-xl items-center border ${
              activeTab === 'privacy'
                ? 'bg-emerald-500/20 border-emerald-500/50'
                : 'bg-slate-900 border-slate-800'
            }`}>
            <Text
              className={`text-xs font-bold ${
                activeTab === 'privacy' ? 'text-emerald-300' : 'text-slate-400'
              }`}>
              Gizlilik Politikası (Privacy)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('terms')}
            className={`flex-1 py-2.5 rounded-xl items-center border ${
              activeTab === 'terms'
                ? 'bg-indigo-500/20 border-indigo-500/50'
                : 'bg-slate-900 border-slate-800'
            }`}>
            <Text
              className={`text-xs font-bold ${
                activeTab === 'terms' ? 'text-indigo-300' : 'text-slate-400'
              }`}>
              Kullanım Koşulları (EULA)
            </Text>
          </Pressable>
        </View>

        {/* Tam Yasal Metin İçeriği */}
        <ScrollView
          className="flex-1 px-5 pt-2"
          contentContainerStyle={{ paddingBottom: 36 }}
          showsVerticalScrollIndicator={false}>
          {activeTab === 'privacy' ? (
            <View className="gap-4">
              <View className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4">
                <Text className="text-xs font-bold text-emerald-400 mb-1">
                  SON GÜNCELLEME / LAST UPDATED: EKİM 2026
                </Text>
                <Text className="text-xs text-slate-300 leading-relaxed">
                  Bu uygulama (&quot;VeloQuote / Mobile Factory App&quot;), kullanıcı gizliliğini en üst düzeyde korumak amacıyla &quot;Offline-First&quot; (Önce Çevrimdışı) mimariyle geliştirilmiştir.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-bold text-white">
                  1. Yerel Veri Depolama (SQLite Offline Storage)
                </Text>
                <Text className="text-xs text-slate-400 leading-relaxed">
                  Uygulama içerisinde oluşturduğunuz tüm müşteri bilgileri, fiyat teklifleri, proforma fatura kalemleri, vergi oranları ve firma ayarları yalnızca kendi cihazınızdaki yerel SQLite veritabanında saklanır. Bu ticari ve kişisel veriler hiçbir harici sunucuya gönderilmez veya üçüncü taraflarla paylaşılmaz.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-bold text-white">
                  2. Reklam Gösterimi ve Google AdMob
                </Text>
                <Text className="text-xs text-slate-400 leading-relaxed">
                  Ücretsiz sürümde uygulamanın sürdürülebilirliğini sağlamak için Google AdMob SDK&apos;sı aracılığıyla banner, geçiş ve ödüllü reklamlar gösterilir. Google AdMob; reklam performansı ölçümü, dolandırıcılık önleme ve reklam gösterimi amacıyla Cihaz Reklam Kimliği (Advertising ID / AAID / IDFA), yaklaşık konum ve temel uygulama etkileşim verilerini toplayabilir. Pro aboneliğe geçtiğinizde tüm reklamlar tamamen devre dışı bırakılır.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-bold text-white">
                  3. Uygulama İçi Satın Alımlar (RevenueCat & Store Billing)
                </Text>
                <Text className="text-xs text-slate-400 leading-relaxed">
                  Pro abonelik ve ömür boyu lisans işlemleri doğrudan Google Play Billing veya Apple StoreKit altyapısı üzerinden gerçekleştirilir. Kredi kartı veya ödeme bilgileriniz tarafımızca görülmez ve saklanmaz. Abonelik durumunuzu doğrulamak ve cihazlar arası satın alımları geri yüklemek için RevenueCat altyapısında anonim işlem doğrulama kimlikleri (App User ID & Purchase Token) işlenir.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-bold text-white">
                  4. PDF Dışa Aktarma ve Paylaşım İzinleri
                </Text>
                <Text className="text-xs text-slate-400 leading-relaxed">
                  Oluşturduğunuz PDF teklif dosyaları cihazınızın geçici önbelleğinde üretilir ve yalnızca siz &quot;Paylaş / PDF İndir&quot; butonuna bastığınızda işletim sisteminin standart paylaşım penceresi (WhatsApp, E-posta vb.) aracılığıyla seçtiğiniz alıcıya iletilir.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-bold text-white">
                  5. Veri Silme ve Kullanıcı Hakları (KVKK & GDPR)
                </Text>
                <Text className="text-xs text-slate-400 leading-relaxed">
                  Tüm iş verileriniz cihazınızda yerel olarak tutulduğundan, uygulama içerisinden teklifleri sildiğinizde veya uygulamayı cihazınızdan kaldırdığınızda tüm yerel veritabanı kalıcı olarak silinir. İletişim: support@mobilefactory.app
                </Text>
              </View>
            </View>
          ) : (
            <View className="gap-4">
              <View className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4">
                <Text className="text-xs font-bold text-indigo-400 mb-1">
                  STANDART SON KULLANICI LİSANS SÖZLEŞMESİ (EULA)
                </Text>
                <Text className="text-xs text-slate-300 leading-relaxed">
                  Uygulamayı indirerek veya kullanarak aşağıdaki abonelik, kullanım ve sorumluluk şartlarını kabul etmiş sayılırsınız.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-bold text-white">
                  1. Hizmetin Kapsamı ve Lisans
                </Text>
                <Text className="text-xs text-slate-400 leading-relaxed">
                  VeloQuote, serbest çalışanlar, ustalar, ajanslar ve işletmeler için hızlı fiyat teklifi ve proforma hesaplama aracıdır. Kullanıcıya münhasır olmayan, devredilemez, kişisel ve ticari teklif hazırlama lisansı sunulur.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-bold text-white">
                  2. Pro Abonelik, Otomatik Yenileme ve İptal Koşulları
                </Text>
                <Text className="text-xs text-slate-400 leading-relaxed">
                  • Sunulan Planlar: Haftalık Pro ($1.99/hafta), Yıllık Pro ($14.99/yıl) ve Ömür Boyu Pro ($24.99 tek seferlik).{'\n'}
                  • Otomatik Yenileme: Haftalık ve Yıllık abonelikler, mevcut abonelik döneminin bitiminden en az 24 saat önce iptal edilmediği sürece Google Play veya Apple App Store hesabınız üzerinden otomatik olarak yenilenir.{'\n'}
                  • İptal Yönetimi: Aboneliğinizi dilediğiniz zaman Google Play Store &gt; Ödemeler ve Abonelikler &gt; Abonelikler menüsünden (veya iOS Ayarlar &gt; Apple Kimliği &gt; Abonelikler) iptal edebilirsiniz. Uygulamayı cihazdan silmek aboneliği otomatik olarak iptal etmez.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-bold text-white">
                  3. Hesaplama Doğruluğu ve Sorumluluk Reddi
                </Text>
                <Text className="text-xs text-slate-400 leading-relaxed">
                  Uygulama içerisindeki KDV/vergi, iskonto ve kalem toplamı hesaplamaları kullanıcı tarafından girilen verilere dayanır. Müşteriye gönderilen nihai PDF tekliflerinin ticari, vergisel ve hukuki doğruluğunu kontrol etmek kullanıcının kendi sorumluluğundadır.
                </Text>
              </View>
            </View>
          )}

          {/* Harici Tarayıcıda Açma Seçeneği */}
          <Pressable
            onPress={handleOpenExternal}
            className="mt-6 py-3.5 px-4 rounded-2xl bg-slate-900 border border-slate-800 flex-row items-center justify-center gap-2 active:opacity-80">
            <ExternalLink size={15} color="#94a3b8" />
            <Text className="text-xs font-semibold text-slate-300">
              Web Tarayıcısında Görüntüle (External Link)
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
