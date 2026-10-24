import { NativeModules } from 'react-native';

export type AppLanguage = 'tr' | 'en';
export type CurrencySymbol = '₺' | '$' | '€' | '£';

export interface I18nState {
  lang: AppLanguage;
  currency: CurrencySymbol;
}

export const CURRENCY_OPTIONS: Array<{
  code: string;
  symbol: CurrencySymbol;
  label: string;
}> = [
  { code: 'TRY', symbol: '₺', label: 'TRY (₺)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
];

export function detectDeviceLanguage(): AppLanguage {
  try {
    const locale =
      Intl.DateTimeFormat().resolvedOptions().locale ||
      NativeModules?.I18nManager?.localeIdentifier ||
      '';
    if (typeof locale === 'string' && locale.toLowerCase().startsWith('tr')) {
      return 'tr';
    }
  } catch {
    // fallback
  }
  return 'en';
}

export function detectDeviceCurrency(): CurrencySymbol {
  return detectDeviceLanguage() === 'tr' ? '₺' : '$';
}

const initialLang = detectDeviceLanguage();
const initialCurrency = initialLang === 'tr' ? '₺' : '$';

let currentI18nState: I18nState = {
  lang: initialLang,
  currency: initialCurrency,
};

type I18nListener = (state: I18nState) => void;
const i18nListeners = new Set<I18nListener>();

export function getI18nState(): I18nState {
  return currentI18nState;
}

export function setI18nState(partial: Partial<I18nState>): void {
  currentI18nState = { ...currentI18nState, ...partial };
  i18nListeners.forEach((fn) => fn(currentI18nState));
}

export function subscribeI18n(listener: I18nListener): () => void {
  i18nListeners.add(listener);
  listener(currentI18nState);
  return () => {
    i18nListeners.delete(listener);
  };
}

export function formatMoney(amount: number, currencySymbol?: string): string {
  const sym = currencySymbol || currentI18nState.currency;
  const locale = currentI18nState.lang === 'tr' ? 'tr-TR' : 'en-US';
  const numStr = (amount || 0).toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${sym}${numStr}`;
}

export const DICTIONARY = {
  tr: {
    appTitle: 'RentLedger Pro',
    appSubtitle: 'Kira Takip & Resmi PDF Makbuzu',
    tabDashboard: 'Kira Takip',
    tabProperties: 'Mülkler',
    tabSettings: 'Ayarlar',

    // Dashboard
    dashboardTitle: 'Kira Takip Paneli',
    dashboardSubtitle: 'Aylık kira tahsilatları ve yaklaşan vadeler',
    totalExpectedRent: 'Aylık Toplam Kira',
    totalCollectedThisMonth: 'Bu Ay Tahsil Edilen',
    totalPendingOrOverdue: 'Bekleyen / Geciken',
    addPaymentBtn: 'Kira Tahsilatı Ekle',
    newPropertyBtn: 'Yeni Mülk & Kiracı',
    activeTenantsCount: 'Aktif Kiracı',
    overdueAlertTitle: 'Süresi Yaklaşan & Geciken Kiralar',
    noOverdueAlerts: 'Harika! Şu anda vadesi yaklaşan veya geciken kira bulunmuyor.',
    remindViaWhatsApp: 'Hatırlat',
    sendReceiptWhatsApp: 'WhatsApp Makbuz',
    viewPdfReceipt: 'Makbuz PDF',
    recentPayments: 'Son Kira Tahsilatları',
    noPaymentsYet: 'Henüz kayıtlı bir kira tahsilatı yok.',
    noPaymentsSub: 'İlk kira ödemenizi ekleyerek saniyeler içinde resmi PDF makbuzu oluşturun.',

    // Properties
    propertiesTitle: 'Mülkler & Kiracılar',
    propertiesSubtitle: 'Kayıtlı taşınmazlar ve aktif kiracı listesi',
    noPropertiesYet: 'Henüz mülk eklenmedi',
    noPropertiesSub: 'Daire, dükkan veya ofislerinizi ekleyerek kira ödemelerini düzenli takip edin.',
    rentDayLabel: 'Ödeme Günü',
    rentAmountLabel: 'Kira Bedeli',
    depositLabel: 'Depozito',
    callTenant: 'Ara',
    whatsappTenant: 'WhatsApp',

    // Settings
    settingsTitle: 'Ayarlar & Profil',
    settingsSubtitle: 'Ev sahibi bilgileri ve uygulama tercihleri',
    landlordProfileTitle: 'Ev Sahibi / Yönetici Anteti',
    landlordProfileSub: 'Makbuzlarda ve WhatsApp mesajlarında görünür',
    fullName: 'Ad Soyad / Firma Ünvanı',
    phone: 'Telefon Numarası',
    iban: 'Banka IBAN Numarası',
    bankName: 'Banka Adı',
    saveProfileBtn: 'Profili Kaydet',
    membershipPro: 'RentLedger PRO',
    membershipFree: 'Ücretsiz Plan',
    statFreeReceiptsRemaining: 'Kalan Ücretsiz Makbuz',
    upgradeToPro: 'Sınırsız Makbuz & Mülk İçin PRO Al',
    languageLabel: 'Uygulama Dili',
    currencyLabel: 'Para Birimi',
    notificationsTitle: 'Kira Vade Bildirimleri',
    notificationsSub: 'Vadesi gelen kiraları otomatik hatırlatır',
    checkRemindersBtn: 'Kira Vadelerini Şimdi Tara',
    rateUs: 'Bizi Mağazada Değerlendirin ⭐',
    restorePurchases: 'Satın Alımları Geri Yükle',
    privacyPolicy: 'Gizlilik Politikası',
    termsOfUse: 'Kullanım Koşulları',
    resetDataBtn: 'Tüm Verileri Sıfırla',
  },
  en: {
    appTitle: 'RentLedger Pro',
    appSubtitle: 'Rent Tracker & Official PDF Receipt',
    tabDashboard: 'Rent Tracker',
    tabProperties: 'Properties',
    tabSettings: 'Settings',

    // Dashboard
    dashboardTitle: 'Rent Dashboard',
    dashboardSubtitle: 'Monthly collections and upcoming due dates',
    totalExpectedRent: 'Monthly Expected Rent',
    totalCollectedThisMonth: 'Collected This Month',
    totalPendingOrOverdue: 'Pending / Overdue',
    addPaymentBtn: 'Record Payment',
    newPropertyBtn: 'New Property & Tenant',
    activeTenantsCount: 'Active Tenants',
    overdueAlertTitle: 'Upcoming & Overdue Rents',
    noOverdueAlerts: 'Great! All rents are up to date.',
    remindViaWhatsApp: 'Remind',
    sendReceiptWhatsApp: 'WhatsApp Receipt',
    viewPdfReceipt: 'PDF Receipt',
    recentPayments: 'Recent Rent Payments',
    noPaymentsYet: 'No rent payments recorded yet.',
    noPaymentsSub: 'Record your first rent payment to generate an official PDF receipt in seconds.',

    // Properties
    propertiesTitle: 'Properties & Tenants',
    propertiesSubtitle: 'Registered properties and active leases',
    noPropertiesYet: 'No properties added yet',
    noPropertiesSub: 'Add your apartments, shops, or offices to track rent payments automatically.',
    rentDayLabel: 'Due Day',
    rentAmountLabel: 'Rent Amount',
    depositLabel: 'Deposit',
    callTenant: 'Call',
    whatsappTenant: 'WhatsApp',

    // Settings
    settingsTitle: 'Settings & Profile',
    settingsSubtitle: 'Landlord profile and preferences',
    landlordProfileTitle: 'Landlord / Manager Header',
    landlordProfileSub: 'Printed on PDF receipts & WhatsApp messages',
    fullName: 'Full Name / Company Name',
    phone: 'Phone Number',
    iban: 'Bank IBAN Number',
    bankName: 'Bank Name',
    saveProfileBtn: 'Save Profile',
    membershipPro: 'RentLedger PRO',
    membershipFree: 'Free Starter Plan',
    statFreeReceiptsRemaining: 'Free PDF Receipts Left',
    upgradeToPro: 'Upgrade to PRO for Unlimited',
    languageLabel: 'App Language',
    currencyLabel: 'Currency',
    notificationsTitle: 'Rent Due Reminders',
    notificationsSub: 'Automatic alerts for upcoming rents',
    checkRemindersBtn: 'Scan Due Dates Now',
    rateUs: 'Rate Us on the Store ⭐',
    restorePurchases: 'Restore Purchases',
    privacyPolicy: 'Privacy Policy',
    termsOfUse: 'Terms of Use',
    resetDataBtn: 'Reset All Data',
  },
};

export function t(key: keyof typeof DICTIONARY['tr'], lang?: AppLanguage): string {
  const activeLang = lang || currentI18nState.lang;
  return DICTIONARY[activeLang]?.[key] || DICTIONARY['en']?.[key] || DICTIONARY['tr'][key] || String(key);
}
