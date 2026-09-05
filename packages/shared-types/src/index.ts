export enum AccountType {
  SUPER_ADMIN = 'SUPER_ADMIN',
  STAFF = 'STAFF',
  PAIKARI_SELLER = 'PAIKARI_SELLER',
  WHOLESALER_SELLER = 'WHOLESALER_SELLER',
  MPO = 'MPO',
  FOOD_VENDOR = 'FOOD_VENDOR',
  PUBLIC_USER = 'PUBLIC_USER',
}

export enum SectorType {
  PHARMACY = 'PHARMACY',
  WHOLESALE = 'WHOLESALE',
  OFFER_PARA = 'OFFER_PARA',
  MPO = 'MPO',
  FOOD = 'FOOD',
  SERVICES = 'SERVICES',
  LAB = 'LAB',
  COUNTER = 'COUNTER',
}

export enum SuspensionType {
  NONE = 'NONE',
  INDEFINITE = 'INDEFINITE',
  TEMPORARY = 'TEMPORARY',
}

export enum IpRuleType {
  ALLOW = 'ALLOW',
  BLOCK = 'BLOCK',
}

export enum RateType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT_RATE = 'FLAT_RATE',
}

export enum PricingLayer {
  CUSTOMER_MANUAL_OVERRIDE = 'CUSTOMER_MANUAL_OVERRIDE',
  PRODUCT_OVERRIDE = 'PRODUCT_OVERRIDE',
  COMPANY_RATE = 'COMPANY_RATE',
  TIER_DEFAULT = 'TIER_DEFAULT',
}

export enum OrderPlatformStatus {
  DRAFT_SALE = 'DRAFT_SALE',
  COMPLETE_SALE = 'COMPLETE_SALE',
  CANCELLED = 'CANCELLED',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  RETURNED = 'RETURNED',
}

export enum ApplicationStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum AuditAction {
  TIER_CHANGED = 'TIER_CHANGED',
  MANUAL_RATE_CHANGED = 'MANUAL_RATE_CHANGED',
  PRODUCT_PRICE_EDITED = 'PRODUCT_PRICE_EDITED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCOUNT_REACTIVATED = 'ACCOUNT_REACTIVATED',
  PRODUCT_DELETED = 'PRODUCT_DELETED',
  MPO_REASSIGNED = 'MPO_REASSIGNED',
  COMMISSION_RATE_CHANGED = 'COMMISSION_RATE_CHANGED',
  RETURN_APPROVED = 'RETURN_APPROVED',
  RETURN_REJECTED = 'RETURN_REJECTED',
  IP_RULE_CREATED = 'IP_RULE_CREATED',
  IP_RULE_DELETED = 'IP_RULE_DELETED',
  STAFF_ROLE_ASSIGNED = 'STAFF_ROLE_ASSIGNED',
  BULK_CUSTOMER_IMPORTED = 'BULK_CUSTOMER_IMPORTED',
  MEDICINE_BATCH_PUBLISHED = 'MEDICINE_BATCH_PUBLISHED',
  LOGIN_FAILED_LOCKOUT = 'LOGIN_FAILED_LOCKOUT',
}

export interface DynamicPermission {
  id: string;
  slug: string;
  name: string;
  category: string;
  description?: string;
}

export interface UserSession {
  id: string;
  email: string;
  phone?: string;
  name: string;
  accountType: AccountType;
  tierId?: string;
  tierName?: string;
  permissions?: string[];
  roles?: string[];
  requires2FA?: boolean;
  is2FAVerified?: boolean;
}

export interface CustomerManualOverride {
  productId: string;
  rateType: RateType;
  value: number; // Percentage (e.g. 15 for 15%) or flat unit rate in BDT (e.g. 85.00)
}

export interface BulkImportCustomerRow {
  shopName: string;
  ownerName: string;
  phone: string;
  email?: string;
  address: string;
  tradeLicenseNo?: string;
  drugLicenseNo?: string;
  tierCode: string; // e.g. "TIER_A", "TIER_B"
  creditLimit?: number;
  codLimit?: number;
  deliveryFeeThreshold?: number;
  manualRatesJson?: string;
}

export interface BulkImportResult {
  totalRows: number;
  importedCount: number;
  failedCount: number;
  errors: { row: number; reason: string; data?: any }[];
  importedCustomerIds: string[];
}

// -----------------------------------------------------------------------------
// MedEx-Style Pharmaceutical Engine Types (Phase 0-A)
// -----------------------------------------------------------------------------

export interface GenericInfo {
  id: string;
  name: string;
  slug: string;
  therapeuticClass?: string;
  description?: string;
  indications?: string;
  dosageGuidelines?: string;
  sideEffects?: string;
  precautions?: string;
  pregnancyCategory?: string;
}

export interface MedicineProductSummary {
  id: string;
  name: string;
  slug: string;
  genericId?: string;
  genericName: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  dosageForm: string;
  strength: string;
  mrp: number;
  unit: string;
  packSize?: string;
  category: string;
  description?: string;
  isPrescriptionRequired: boolean;
  isOfferParaLiveStock: boolean;
  offerParaStockQty: number;
  isPharmaTrackOpaque: boolean;
}

export interface GenericAlternativeResult {
  currentProduct: {
    id: string;
    name: string;
    genericName: string;
    dosageForm: string;
    strength: string;
    mrp: number;
    companyName: string;
  };
  genericInfo?: GenericInfo;
  alternatives: {
    productId: string;
    brandName: string;
    companyName: string;
    dosageForm: string;
    strength: string;
    mrp: number;
    priceDifference: number; // Positive = Cheaper than current product
    priceDifferencePercent: number; // % savings
    isLowerPriced: boolean;
    isOfferParaLiveDeal: boolean;
    offerParaStockQty?: number;
  }[];
}

export interface MedicineSearchParams {
  query?: string;
  generic?: string;
  company?: string;
  dosageForm?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}

export interface StagingBatchSummary {
  id: string;
  batchNumber: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorRows: number;
  status: string; // STAGED, PUBLISHED, REJECTED
  importedBy: string;
  createdAt: string;
}
