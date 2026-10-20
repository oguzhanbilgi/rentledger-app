import type {
  CurrencyCode,
  LandlordProfile,
  PaymentRecord,
  PropertyRecord,
  ReceiptAllowanceInfo,
  TenantRecord,
} from './database';

export type {
  CurrencyCode,
  LandlordProfile,
  PaymentRecord,
  PropertyRecord,
  ReceiptAllowanceInfo,
  TenantRecord,
};

export const DEFAULT_LANDLORD_PROFILE: LandlordProfile = {
  fullName: '',
  phone: '',
  email: '',
  iban: '',
  bankName: '',
  address: '',
  companyTitle: '',
};

let memProperties: PropertyRecord[] = [];
let memTenants: TenantRecord[] = [];
let memPayments: PaymentRecord[] = [];
let memLandlord: LandlordProfile = { ...DEFAULT_LANDLORD_PROFILE };
let memPrefs: Record<string, string> = {};

export async function initLocalDatabase(): Promise<void> {}

export async function getProperties(): Promise<PropertyRecord[]> {
  return [...memProperties];
}

export async function saveProperty(property: PropertyRecord): Promise<void> {
  const idx = memProperties.findIndex((p) => p.id === property.id);
  if (idx >= 0) memProperties[idx] = property;
  else memProperties.unshift(property);
}

export async function deleteProperty(propertyId: string): Promise<void> {
  memProperties = memProperties.filter((p) => p.id !== propertyId);
  memTenants = memTenants.filter((t) => t.propertyId !== propertyId);
}

export async function getTenants(): Promise<TenantRecord[]> {
  return memTenants.map((t) => {
    const prop = memProperties.find((p) => p.id === t.propertyId);
    return { ...t, propertyName: prop?.name };
  });
}

export async function saveTenant(tenant: TenantRecord): Promise<void> {
  const idx = memTenants.findIndex((t) => t.id === tenant.id);
  if (idx >= 0) memTenants[idx] = tenant;
  else memTenants.unshift(tenant);
}

export async function deleteTenant(tenantId: string): Promise<void> {
  memTenants = memTenants.filter((t) => t.id !== tenantId);
}

export async function getPayments(): Promise<PaymentRecord[]> {
  return [...memPayments];
}

export async function savePayment(payment: PaymentRecord): Promise<void> {
  const idx = memPayments.findIndex((p) => p.id === payment.id);
  if (idx >= 0) memPayments[idx] = payment;
  else memPayments.unshift(payment);
}

export async function deletePayment(paymentId: string): Promise<void> {
  memPayments = memPayments.filter((p) => p.id !== paymentId);
}

export async function generateNextReceiptNo(): Promise<string> {
  const year = new Date().getFullYear();
  const nextNum = memPayments.length + 1;
  return `MK-${year}-${String(nextNum).padStart(3, '0')}`;
}

export async function getLandlordProfile(): Promise<LandlordProfile> {
  return { ...memLandlord };
}

export async function saveLandlordProfile(profile: LandlordProfile): Promise<void> {
  memLandlord = { ...profile };
}

export async function getReceiptAllowanceInfo(): Promise<ReceiptAllowanceInfo> {
  const usedCount = parseInt(memPrefs['receipts_used_count'] || '0', 10);
  const bonusEarned = parseInt(memPrefs['receipts_bonus_earned'] || '0', 10);
  const totalFreeAllowed = 3 + bonusEarned;
  const remainingFree = Math.max(0, totalFreeAllowed - usedCount);
  return { usedCount, bonusEarned, remainingFree, totalFreeAllowed };
}

export async function incrementReceiptUsage(): Promise<void> {
  const info = await getReceiptAllowanceInfo();
  memPrefs['receipts_used_count'] = String(info.usedCount + 1);
}

export async function grantBonusReceipt(): Promise<number> {
  const info = await getReceiptAllowanceInfo();
  const newBonus = info.bonusEarned + 1;
  memPrefs['receipts_bonus_earned'] = String(newBonus);
  return newBonus;
}

export async function getPreference(key: string): Promise<string | null> {
  return memPrefs[key] ?? null;
}

export async function setPreference(key: string, value: string): Promise<void> {
  memPrefs[key] = value;
}

export async function resetAllLocalData(): Promise<void> {
  memProperties = [];
  memTenants = [];
  memPayments = [];
  memLandlord = { ...DEFAULT_LANDLORD_PROFILE };
  memPrefs = {};
}
