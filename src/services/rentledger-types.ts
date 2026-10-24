/**
 * RentLedger alan modelleri (native SQLite ve web önizlemesi ortak kullanır).
 * Para birimi ISO kodu olarak saklanır (TRY, USD, EUR, GBP).
 */

export type PropertyType = 'apartment' | 'house' | 'shop' | 'office' | 'storage';

export interface PropertyRecord {
  id: string;
  name: string;
  address: string;
  propertyType: PropertyType;
  notes?: string;
  createdAt: string;
}

export interface TenantRecord {
  id: string;
  propertyId: string;
  /** SELECT sırasında properties tablosundan eklenir. */
  propertyName?: string | null;
  name: string;
  phone: string;
  email?: string;
  /** Kiracının TC kimlik / vergi numarası (isteğe bağlı, makbuzda basılır). */
  tcOrId?: string;
  rentAmount: number;
  depositAmount: number;
  currency: string;
  /** Ayın kaçıncı günü (1–31). */
  paymentDueDay: number;
  leaseStartDate: string;
  leaseEndDate?: string;
  status: 'active' | 'past';
  notes?: string;
  createdAt: string;
}

export type PaymentMethod = 'bank_transfer' | 'cash' | 'credit_card';

export interface PaymentRecord {
  id: string;
  tenantId: string;
  propertyId: string;
  tenantName: string;
  propertyName: string;
  /** Kalıcı yıllık sıra: `RL-2026-0001` (eski kayıtlar `MK-2026-001`). */
  receiptNo: string;
  /** Yeni kayıtlar `YYYY-MM-DD`; eski kayıtlar serbest metin (`24.10.2026`). */
  paymentDate: string;
  /** Kayıt anında yazılan dönem etiketi (eski kayıtlar için gösterim yedeği). */
  periodMonthYear: string;
  /** Makine-okunur kira dönemi `YYYY-MM`. */
  periodKey: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: 'paid' | 'partial' | 'pending';
  notes?: string;
  createdAt: string;
}

export interface LandlordProfile {
  fullName: string;
  companyTitle: string;
  phone: string;
  email: string;
  address: string;
  bankName: string;
  iban: string;
}

export const EMPTY_LANDLORD_PROFILE: LandlordProfile = {
  fullName: '',
  companyTitle: '',
  phone: '',
  email: '',
  address: '',
  bankName: '',
  iban: '',
};

/** Ücretsiz planda takip edilebilecek mülk sayısı (Pro'da sınırsız). */
export const FREE_PROPERTY_LIMIT = 2;
