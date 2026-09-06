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

export enum FulfillmentStatus {
  PENDING = 'PENDING',
  VERIFYING = 'VERIFYING',
  PACKED = 'PACKED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUSED_DELIVERY = 'REFUSED_DELIVERY',
}

export enum FulfillmentMethod {
  SELF_PICKUP = 'SELF_PICKUP',
  SEND_SOMEONE = 'SEND_SOMEONE',
  HOME_DELIVERY = 'HOME_DELIVERY',
}

export enum UnitType {
  PIECE = 'PIECE',
  STRIP = 'STRIP', // পাতা
  BOX = 'BOX',
}

export enum PaymentMethod {
  COD = 'COD',
  BKASH = 'BKASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  ADVANCE = 'ADVANCE',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  ADVANCE_PAID = 'ADVANCE_PAID',
}

export enum MemoState {
  PRELIMINARY_MRP = 'PRELIMINARY_MRP',
  FINAL_TIERED = 'FINAL_TIERED',
}

export enum LineVerificationStatus {
  PENDING = 'PENDING',
  FULL_STOCK = 'FULL_STOCK',
  PARTIAL_STOCK = 'PARTIAL_STOCK',
  NONE_AVAILABLE = 'NONE_AVAILABLE',
}

export enum CancellationState {
  NONE = 'NONE',
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REFUSED_AT_DELIVERY = 'REFUSED_AT_DELIVERY',
}

export enum ShortListStatus {
  OPEN = 'OPEN',
  ORDERED = 'ORDERED',
  RESOLVED = 'RESOLVED',
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
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_VERIFIED = 'ORDER_VERIFIED',
  ORDER_PRICE_OVERRIDDEN = 'ORDER_PRICE_OVERRIDDEN',
  FINAL_MEMO_PUBLISHED = 'FINAL_MEMO_PUBLISHED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_REFUSED_AT_DELIVERY = 'ORDER_REFUSED_AT_DELIVERY',
  CUSTOMER_PROMOTED_TO_WHOLESALE = 'CUSTOMER_PROMOTED_TO_WHOLESALE',
  WHOLESALER_PUBLIC_LISTING_SUBMITTED = 'WHOLESALER_PUBLIC_LISTING_SUBMITTED',
  WHOLESALER_PUBLIC_LISTING_APPROVED = 'WHOLESALER_PUBLIC_LISTING_APPROVED',
  WHOLESALER_PUBLIC_LISTING_REJECTED = 'WHOLESALER_PUBLIC_LISTING_REJECTED',
  RESELLER_STATEMENT_GENERATED = 'RESELLER_STATEMENT_GENERATED',
  RESELLER_STATEMENT_RECONCILED = 'RESELLER_STATEMENT_RECONCILED',
  RESELLER_STATEMENT_SETTLED = 'RESELLER_STATEMENT_SETTLED',
  GAME_CATALOG_CREATED = 'GAME_CATALOG_CREATED',
  GAME_CATALOG_UPDATED = 'GAME_CATALOG_UPDATED',
  GAME_PACKAGE_CREATED = 'GAME_PACKAGE_CREATED',
  GAME_PACKAGE_UPDATED = 'GAME_PACKAGE_UPDATED',
  GAME_TOPUP_FULFILLED = 'GAME_TOPUP_FULFILLED',
  GAME_TOPUP_FAILED = 'GAME_TOPUP_FAILED',
  FOOD_VENDOR_REGISTERED = 'FOOD_VENDOR_REGISTERED',
  FOOD_VENDOR_APPROVED = 'FOOD_VENDOR_APPROVED',
  FOOD_ITEM_CREATED = 'FOOD_ITEM_CREATED',
  FOOD_ITEM_86ED = 'FOOD_ITEM_86ED',
  FOOD_ORDER_CREATED = 'FOOD_ORDER_CREATED',
  FOOD_ORDER_COOKING_STARTED = 'FOOD_ORDER_COOKING_STARTED',
  FOOD_ORDER_STATUS_CHANGED = 'FOOD_ORDER_STATUS_CHANGED',
  COMMUNITY_POST_CREATED = 'COMMUNITY_POST_CREATED',
  COMMUNITY_POST_APPROVED = 'COMMUNITY_POST_APPROVED',
  COMMUNITY_POST_REJECTED = 'COMMUNITY_POST_REJECTED',
  COMMUNITY_POST_REMOVED = 'COMMUNITY_POST_REMOVED',
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
  wholesaleMoq?: number;
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

// -----------------------------------------------------------------------------
// Phase 1: Paikari Market DTOs & Interfaces
// -----------------------------------------------------------------------------

export interface PaikariOrderItemInput {
  productId: string;
  unitType: UnitType;
  requestedQuantity: number;
}

export interface CreatePaikariOrderDto {
  items: PaikariOrderItemInput[];
  fulfillmentMethod: FulfillmentMethod;
  pickupPersonName?: string;
  pickupPersonPhone?: string;
  deliveryAddress?: string;
  isTodayDelivery?: boolean;
  paymentMethod: PaymentMethod;
  orderNotes?: string;
  voiceNoteUrl?: string;
  prescriptionUrl?: string;
  targetCustomerId?: string; // If placed by staff on behalf of customer
}

export interface VerifyLineItemDto {
  itemId: string;
  status: LineVerificationStatus; // FULL_STOCK, PARTIAL_STOCK, NONE_AVAILABLE
  confirmedQuantity?: number;
}

export interface PriceOverrideDto {
  itemId: string;
  manualPrice: number;
}

export interface AddOrderItemsDto {
  items: PaikariOrderItemInput[];
}

export interface OrderItemResponse {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  genericName: string;
  companyName: string;
  dosageForm: string;
  strength: string;
  unitType: UnitType;
  requestedQuantity: number;
  confirmedQuantity: number;
  verificationStatus: LineVerificationStatus;
  isOfferPara: boolean;
  unitMrp: number;
  tieredUnitPrice: number;
  finalUnitPrice: number;
  manualPriceOverrideByStaff?: number | null;
  appliedLayer: string;
  totalPrice: number;
  fulfilledByStaffId?: string | null;
  fulfilledByStaffName?: string | null;
  fulfilledAt?: string | null;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  shopName: string;
  customerPhone: string;
  sectorType: SectorType;
  platformStatus: OrderPlatformStatus;
  fulfillmentStatus: FulfillmentStatus;
  memoState: MemoState;
  isFinalMemoPublished: boolean;
  preliminarySubtotal: number;
  finalSubtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  fulfillmentMethod: FulfillmentMethod;
  pickupPersonName?: string | null;
  pickupPersonPhone?: string | null;
  deliveryAddress: string;
  isTodayDelivery: boolean;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  lastUpdatedByStaff?: string | null;
  lastUpdatedByStaffName?: string | null;
  cancellationState: CancellationState;
  cancellationReason?: string | null;
  cancellationRequestedAt?: string | null;
  orderNotes?: string | null;
  voiceNoteUrl?: string | null;
  prescriptionUrl?: string | null;
  placedByStaffId?: string | null;
  placedByStaffName?: string | null;
  items: OrderItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PharmaTrackShortListItem {
  id: string;
  orderId?: string | null;
  orderNumber?: string | null;
  productId: string;
  productName: string;
  genericName: string;
  companyName: string;
  requestedQuantity: number;
  unitType: string;
  shopId: string;
  shopName: string;
  shopPhone?: string | null;
  reportedByStaffId?: string | null;
  reportedByStaffName?: string | null;
  status: ShortListStatus;
  createdAt: string;
}

export interface CustomerRankingItem {
  customerId: string;
  shopName: string;
  ownerName: string;
  phone: string;
  accountType: AccountType;
  tierId: string;
  tierName: string;
  monthlySalesVolume: number;
  totalOrdersCount: number;
  cancellationCount: number;
  refusalCount: number;
  isProblemCustomer: boolean;
  problemFlagReason?: string | null;
  eligibleForWholesaleUpgrade: boolean;
}

export interface PlatformSettingsDto {
  problemCustomerThreshold: number;
  defaultDeliveryFee: number;
  defaultFreeDeliveryThreshold: number;
  bankAccountDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branchName: string;
    routingNumber?: string;
  };
  bkashMerchantNumber: string;
  returnWindowDays?: number;
  highReturnProductThreshold?: number;
}

// -----------------------------------------------------------------------------
// Phase 2: Returns Management Engine Types
// -----------------------------------------------------------------------------

export enum ReturnStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface ReturnItemInput {
  orderItemId: string;
  returnedQuantity: number;
}

export interface CreateReturnDto {
  orderId: string;
  items: ReturnItemInput[];
  reason: string;
  voiceNoteUrl?: string;
}

export interface ReviewReturnDto {
  approve: boolean;
  reviewNotes?: string;
}

export interface ReturnItemResponse {
  id: string;
  returnRequestId: string;
  orderItemId: string;
  productId: string;
  productName: string;
  genericName: string;
  unitType: string;
  originalUnitPrice: number;
  originalPurchasedQuantity: number;
  returnedQuantity: number;
  refundCreditAmount: number;
  isOfferParaStock: boolean;
  stockReversed: boolean;
}

export interface ReturnRequestResponse {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  shopName: string;
  customerPhone: string;
  sectorType: SectorType;
  status: ReturnStatus;
  totalRefundCredit: number;
  reason: string;
  voiceNoteUrl?: string | null;
  reviewedByStaffId?: string | null;
  reviewedByStaffName?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  items: ReturnItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface HighReturnProductSummary {
  productId: string;
  name: string;
  genericName: string;
  companyName: string;
  returnCount: number;
  isHighReturnRate: boolean;
  highReturnFlagReason?: string | null;
  totalUnitsReturned: number;
  isReturnable: boolean;
}

export interface CustomerMonthlyReturnSummary {
  customerId: string;
  shopName: string;
  creditBalance: number;
  totalReturnsCount: number;
  totalReturnsValue: number;
  monthlyBreakdown: {
    monthYear: string;
    returnsCount: number;
    totalCreditIssued: number;
  }[];
}

// -----------------------------------------------------------------------------
// Phase 3: Wholesale Market & Pre-Orders Types
// -----------------------------------------------------------------------------

export enum PreOrderStatus {
  PENDING = 'PENDING',
  SOURCING = 'SOURCING',
  CONFIRMED = 'CONFIRMED',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
}

export interface CreatePreOrderDto {
  productId: string;
  requestedQuantity: number;
  unitType?: UnitType;
  leadTimeDays: 2 | 3 | 4 | 5;
  targetPrice?: number;
  notes?: string;
}

export interface PreOrderResponse {
  id: string;
  preOrderNumber: string;
  userId: string;
  customerName: string;
  shopName: string;
  customerPhone: string;
  productId: string;
  productName: string;
  genericName: string;
  companyName: string;
  dosageForm: string;
  strength: string;
  unitType: UnitType;
  requestedQuantity: number;
  leadTimeDays: number;
  targetPrice?: number | null;
  status: PreOrderStatus;
  notes?: string | null;
  mpoAssignedId?: string | null;
  reviewedByStaffId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WholesaleDashboardSummary {
  userId: string;
  shopName: string;
  ownerName: string;
  currentTierId: string;
  currentTierCode: string;
  currentTierName: string;
  monthlySalesVolume: number;
  tierUpgradeTarget: number;
  upgradeProgressPercent: number;
  creditLimit: number;
  creditBalance: number;
  allowedCategories: string[];
  totalOrdersCount: number;
  activePreOrdersCount: number;
}

// -----------------------------------------------------------------------------
// Phase 4: Stock Management Module & Offer Para Types
// -----------------------------------------------------------------------------

export enum OfferParaDisplayMode {
  EXACT_COUNT = 'EXACT_COUNT',
  IN_STOCK_ONLY = 'IN_STOCK_ONLY',
}

export interface QuantityDiscountBreakpoint {
  minQty: number;
  discountPercent?: number;
  unitPrice?: number;
}

export interface StockBatchDto {
  productId: string;
  batchNumber?: string;
  initialQuantity: number;
  purchaseCost: number;
  sellingPrice: number;
  wholesalePrice: number;
  mfgDate?: string;
  expiryDate: string;
  supplierName?: string;
  lowStockThreshold?: number;
  notes?: string;
}

export interface StockBatchResponse {
  id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  genericName: string;
  companyName: string;
  ownerId: string;
  ownerName: string;
  initialQuantity: number;
  currentQuantity: number;
  purchaseCost: number;
  sellingPrice: number;
  wholesalePrice: number;
  mfgDate?: string | null;
  expiryDate: string;
  supplierName?: string | null;
  lowStockThreshold: number;
  isLowStock: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockSaleItemInput {
  productId: string;
  quantity: number;
  batchId?: string;
  customUnitPrice?: number;
}

export interface StockSaleCreateDto {
  saleType: 'RETAIL' | 'WHOLESALE' | 'COUNTER_OFFLINE';
  customerName?: string;
  customerPhone?: string;
  discountPercent?: number; // e.g. 5, 8, 10
  paymentMethod?: string;
  items: StockSaleItemInput[];
  notes?: string;
}

export interface StockSaleResponse {
  id: string;
  receiptNumber: string;
  ownerId: string;
  saleType: string;
  customerName?: string | null;
  customerPhone?: string | null;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  totalCost: number;
  profitMargin: number;
  profitMarginPercent: number;
  paymentMethod: string;
  notes?: string | null;
  createdAt: string;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    unitPrice: number;
    totalPrice: number;
    profit: number;
  }[];
}

export interface InventoryAnalyticsSummary {
  totalProductsCount: number;
  totalBatchesCount: number;
  totalStockUnits: number;
  totalValuationAtCost: number;
  totalPotentialRevenue: number;
  estimatedNetProfit: number;
  overallMarginPercent: number;
  lowStockAlertsCount: number;
  expiringSoonAlertsCount: number;
  reorderSuggestionsCount: number;
}

export interface StockAlertSummary {
  lowStockProducts: {
    productId: string;
    productName: string;
    companyName: string;
    currentQuantity: number;
    lowStockThreshold: number;
    suggestedReorderQuantity: number;
  }[];
  expiringBatches: {
    batchId: string;
    batchNumber: string;
    productId: string;
    productName: string;
    currentQuantity: number;
    expiryDate: string;
    daysUntilExpiry: number;
    urgencyLevel: 'CRITICAL' | 'WARNING' | 'NOTICE';
  }[];
  reorderSuggestions: {
    productId: string;
    productName: string;
    dailySalesVelocity: number;
    currentStockDaysLeft: number;
    recommendedOrderQty: number;
  }[];
}

// -----------------------------------------------------------------------------
// Phase 5: MPO Market & Pre-Order Sector Types
// -----------------------------------------------------------------------------

export interface MpoCreateAccountDto {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  photoUrl?: string;
  territory: string;
  assignedCompanyIds?: string[];
  companyIds?: string[];
  selectedProductIds?: string[];
  productIds?: string[];
  adminPrivateNotes?: string;
  adminNotes?: string;
}

export interface MpoProfileResponse {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  photoUrl?: string | null;
  territory: string;
  anonymousLabel: string;
  adminPrivateNotes?: string | null;
  adminNotes?: string | null;
  assignedCompanies: {
    id: string;
    name: string;
    code: string;
  }[];
  selectedProducts?: {
    id: string;
    name: string;
    genericName: string;
    companyName: string;
    mrp: number;
    unit: string;
  }[];
  productCount: number;
  totalSubmissions: number;
  totalSalesCount: number;
  totalSalesVolume: number;
  createdAt: string;
  updatedAt?: string;
}

export interface MpoTerritoryGroupSummary {
  territory: string;
  mpoCount: number;
  totalListingsCount?: number;
  totalAvailableUnits?: number;
  mpos: {
    id: string;
    userId?: string;
    name: string;
    email?: string;
    phone?: string;
    territory?: string;
    anonymousLabel?: string;
    photoUrl?: string;
    assignedCompanies?: { id: string; name: string; code: string }[];
    productCount?: number;
    totalSubmissions?: number;
    totalSalesCount?: number;
    totalSalesVolume?: number;
    adminPrivateNotes?: string;
    createdAt?: string;
  }[];
}

export interface MpoListingCreateDto {
  productId: string;
  offeredQuantity?: number;
  quantity?: number;
  bonusQuantity?: number;
  bonusRatio?: string; // e.g. "10+2", "20+5", "100+15"
  mpoTargetPrice?: number;
  mpoAskingDiscountPercent?: number;
  stockType?: 'IN_STOCK' | 'PRE_ORDER';
  leadTimeDays?: number;
  notes?: string;
}

export interface MpoListingReviewDto {
  status?: string;
  isApproved?: boolean;
  rejectionReason?: string;
  adminReviewNotes?: string;
  isVisiblePublic?: boolean;
  publishToPublic?: boolean;
  isVisiblePaikari?: boolean;
  publishToPaikari?: boolean;
  isVisibleWholesale?: boolean;
  publishToWholesale?: boolean;
  publicUnitPrice?: number;
  publicPrice?: number;
  paikariUnitPrice?: number;
  paikariPrice?: number;
  wholesaleUnitPrice?: number;
  wholesalePrice?: number;
  showBonus?: boolean;
}

export interface MpoListingResponse {
  id: string;
  listingNumber?: string;
  mpoProfileId?: string;
  productId: string;
  productName: string;
  genericName: string;
  companyName: string;
  dosageForm?: string;
  strength?: string;
  unitMrp?: number;
  mrp?: number;
  anonymousLabel: string;
  anonymousAlias?: string;
  offeredQuantity?: number;
  quantity?: number;
  bonusQuantity?: number;
  bonusRatio?: string | null;
  mpoTargetPrice?: number;
  unitPrice?: number;
  status: string;
  rejectionReason?: string;
  isVisiblePublic?: boolean;
  isVisiblePaikari?: boolean;
  isVisibleWholesale?: boolean;
  publicUnitPrice?: number;
  paikariUnitPrice?: number;
  wholesaleUnitPrice?: number;
  bids?: any[];
  myBid?: any;
  createdAt: string;
}

export interface MpoBidCreateDto {
  listingId?: string;
  bidUnitPrice?: number;
  bidQuantity?: number;
  bidDiscountPercent?: number;
  requestedQuantity?: number;
  counterNotes?: string;
}

export interface MpoBidResponse {
  id: string;
  listingId: string;
  wholesalerId?: string;
  wholesalerName?: string;
  anonymousBidderAlias?: string;
  bidUnitPrice?: number;
  bidQuantity?: number;
  bidDiscountPercent?: number;
  status: string;
  createdAt: string;
}

export interface PreOrderDraftMemoUpdateDto {
  items?: { orderItemId: string; actualReceivedQuantity: number }[];
  actualReceivedQuantity?: number;
  isUnfulfilledCancelled?: boolean;
  cancellationNotice?: string;
  cancelReason?: string;
  supplyStatus?: string;
}

// -----------------------------------------------------------------------------
// Phase 6: Public Market, Checkout, Digital Downloads & Reviews Types
// -----------------------------------------------------------------------------

export type ProductType = 'PHYSICAL' | 'DIGITAL' | 'SERVICE';

export interface QuantityDiscountTier {
  minQty: number;
  discountPercent: number;
}

export interface PublicCheckoutItemDto {
  productId: string;
  quantity: number;
  variant?: string;
  unitPrice?: number;
}

export interface PublicCheckoutDto {
  items: PublicCheckoutItemDto[];
  isGuest?: boolean;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  fulfillmentMethod: 'HOME_DELIVERY' | 'SELF_PICKUP' | 'DIGITAL_DOWNLOAD';
  deliveryAddress?: string;
  paymentMethod: 'COD' | 'BKASH' | 'CARD' | 'ADVANCE_DEPOSIT';
  prescriptionUrl?: string;
  orderNotes?: string;
}

export interface PublicCheckoutResponse {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  advanceDepositRequired: number;
  isAdvanceDepositRequired: boolean;
  orderType: ProductType;
  digitalDownloadTokens?: {
    productId: string;
    productName: string;
    token: string;
    downloadUrl: string;
    expiresAt: string;
    maxDownloads: number;
  }[];
  createdAt: string;
}

export interface DigitalDownloadTokenResponse {
  token: string;
  orderId: string;
  productId: string;
  productName: string;
  downloadCount: number;
  maxDownloads: number;
  remainingDownloads: number;
  expiresAt: string;
  isExpired: boolean;
  isLimitReached: boolean;
  fileUrl?: string;
}

export interface ProductReviewCreateDto {
  productId: string;
  rating: number; // 1 to 5
  comment: string;
  videoUrl?: string;
  imageUrl?: string;
  guestName?: string;
}

export interface ProductReviewResponse {
  id: string;
  productId: string;
  userId?: string | null;
  reviewerName: string;
  rating: number;
  comment: string;
  videoUrl?: string | null;
  imageUrl?: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export interface WishlistItemResponse {
  id: string;
  productId: string;
  productName: string;
  genericName: string;
  companyName: string;
  mrp: number;
  unit: string;
  isOfferParaLiveStock: boolean;
  offerParaStockQty: number;
  isInStock: boolean;
  addedAt: string;
}

export interface UserBehaviorEventDto {
  eventType: 'PRODUCT_VIEWED' | 'PRODUCT_ADDED_TO_CART' | 'PRODUCT_PURCHASED' | 'SEARCH_PERFORMED';
  productId?: string;
  guestSessionId?: string;
  metadata?: Record<string, any>;
}

// -----------------------------------------------------------------------------
// Phase 7: Wholesalers Selling to Public Types
// -----------------------------------------------------------------------------

export enum ResellerBrandingMode {
  WHITE_LABEL = 'WHITE_LABEL',
  WHOLESALER_BRAND = 'WHOLESALER_BRAND',
}

export interface WholesalerPublicListingCreateDto {
  productId: string;
  wholesalerBasePrice: number;
  stockQuantity: number;
  brandingMode?: ResellerBrandingMode;
  notes?: string;
}

export interface WholesalerListingReviewDto {
  status: 'APPROVED' | 'REJECTED' | 'PAUSED';
  adjustedCommissionRate?: number;
  adjustedBrandingMode?: ResellerBrandingMode;
  reviewNotes?: string;
}

export interface WholesalerPublicListingResponse {
  id: string;
  wholesalerId: string;
  wholesalerShopName: string;
  productId: string;
  productName: string;
  productGenericName: string;
  companyName: string;
  wholesalerBasePrice: number;
  commissionRate: number;
  commissionAmount: number;
  calculatedPublicPrice: number;
  stockQuantity: number;
  brandingMode: ResellerBrandingMode;
  sellerDisplayName: string;
  status: string;
  reviewNotes?: string;
  totalSoldUnits: number;
  totalGrossSales: number;
  totalCommissionPaid: number;
  isSuspended: boolean;
  createdAt: string;
}

export interface ResellerLedgerEntryResponse {
  id: string;
  entryNumber: string;
  wholesalerId: string;
  wholesalerShopName: string;
  listingId?: string;
  productName?: string;
  orderId?: string;
  entryType: string;
  quantity: number;
  wholesalerBaseAmount: number;
  platformCommissionRate: number;
  platformCommission: number;
  grossAmount: number;
  statementNumber?: string;
  note?: string;
  createdAt: string;
}

export interface ResellerMonthlyStatementResponse {
  id: string;
  statementNumber: string;
  wholesalerId: string;
  wholesalerShopName: string;
  billingPeriodMonth: number;
  billingPeriodYear: number;
  totalSalesCount: number;
  totalSoldUnits: number;
  grossSalesVolume: number;
  totalCommissionOwed: number;
  netWholesalerPayout: number;
  totalReturnsDeduction: number;
  commissionRefundAmount: number;
  closingBalance: number;
  status: string;
  wholesalerResponseAt?: string;
  wholesalerNote?: string;
  adminSettlementNote?: string;
  settledAt?: string;
  createdAt: string;
}

export interface ResellerStatementReconcileDto {
  status: 'ACKNOWLEDGED_PAID' | 'DISPUTED';
  note?: string;
}

// -----------------------------------------------------------------------------
// Phase 8: Gaming (Diamond Top-Ups & Game Voucher Recharge)
// -----------------------------------------------------------------------------

export enum GameFulfillmentMode {
  AUTO_API = 'AUTO_API',
  MANUAL_STAFF = 'MANUAL_STAFF',
}

export enum GameFulfillmentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export interface GameCreateDto {
  name: string;
  slug: string;
  publisher: string;
  category: string;
  imageUrl?: string;
  bannerUrl?: string;
  requiresZoneId?: boolean;
  zoneIdLabel?: string;
  requiresServer?: boolean;
  serverOptionsJson?: string; // JSON array of servers: ["Asia", "Europe", "North America"]
  idFormatValidationRegex?: string;
  idInstructions?: string;
  fulfillmentMode?: GameFulfillmentMode;
  sortOrder?: number;
  isActive?: boolean;
}

export interface GamePackageCreateDto {
  gameId: string;
  name: string;
  diamondCount: number;
  bonusCount?: number;
  priceBdt: number;
  badgeText?: string;
  iconUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface PlayerIdValidationDto {
  gameSlug: string;
  playerId: string;
  zoneId?: string;
  serverRegion?: string;
}

export interface PlayerIdValidationResponse {
  isValid: boolean;
  playerId: string;
  zoneId?: string;
  serverRegion?: string;
  playerNickname?: string;
  message?: string;
}

export interface GameTopUpCheckoutDto {
  gameSlug: string;
  packageId: string;
  playerId: string;
  zoneId?: string;
  serverRegion?: string;
  paymentMethod: 'BKASH' | 'NAGAD' | 'CARD'; // Explicitly no COD
  guestEmail?: string;
  guestPhone?: string;
}

export interface GamePackageResponse {
  id: string;
  gameId: string;
  name: string;
  diamondCount: number;
  bonusCount: number;
  totalDiamonds: number;
  priceBdt: number;
  badgeText?: string;
  iconUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface GameDetailResponse {
  id: string;
  name: string;
  slug: string;
  publisher: string;
  category: string;
  imageUrl?: string;
  bannerUrl?: string;
  requiresZoneId: boolean;
  zoneIdLabel?: string;
  requiresServer: boolean;
  serverOptions: string[];
  idFormatValidationRegex?: string;
  idInstructions?: string;
  fulfillmentMode: GameFulfillmentMode;
  sortOrder: number;
  isActive: boolean;
  packages: GamePackageResponse[];
}

export interface GameTopUpOrderResponse {
  id: string;
  orderNumber: string;
  gameName: string;
  gameSlug: string;
  packageName: string;
  diamondCount: number;
  bonusCount: number;
  playerId: string;
  zoneId?: string;
  serverRegion?: string;
  playerNickname?: string;
  priceBdt: number;
  paymentMethod: string;
  paymentStatus: string;
  fulfillmentStatus: GameFulfillmentStatus;
  fulfillmentMode: GameFulfillmentMode;
  providerTransactionRef?: string;
  fulfilledAt?: string;
  createdAt: string;
}

export interface GameFulfillmentActionDto {
  status: 'DELIVERED' | 'FAILED';
  providerTransactionRef?: string;
  notes?: string;
}

// -----------------------------------------------------------------------------
// Phase 9: Food Sector (Foodpanda-Style, Commission-Based)
// -----------------------------------------------------------------------------

export enum FoodFulfillmentType {
  HOME_DELIVERY = 'HOME_DELIVERY',
  PICKUP = 'PICKUP',
}

export enum FoodOrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COOKING = 'COOKING',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export interface RestaurantCreateDto {
  name: string;
  slug?: string;
  description?: string;
  area: string;
  address: string;
  phone: string;
  bannerImageUrl?: string;
  logoUrl?: string;
  cuisines: string[];
  commissionRate?: number;
  deliveryFee?: number;
  isPlatformDelivery?: boolean;
}

export interface RestaurantUpdateDto extends Partial<RestaurantCreateDto> {
  isOpen?: boolean;
}

export interface MenuCategoryDto {
  restaurantId?: string;
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface MenuItemCreateDto {
  restaurantId?: string;
  categoryId: string;
  name: string;
  description?: string;
  priceBdt: number;
  imageUrl?: string;
  isAvailable?: boolean;
  isVegetarian?: boolean;
  preparationTimeMinutes?: number;
  sortOrder?: number;
}

export interface MenuItemUpdateDto extends Partial<MenuItemCreateDto> {
  isAvailable?: boolean;
}

export interface MenuItemResponse {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  priceBdt: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  isVegetarian: boolean;
  preparationTimeMinutes: number;
  sortOrder: number;
  createdAt?: string;
}

export interface MenuCategoryResponse {
  id: string;
  restaurantId: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  menuItems: MenuItemResponse[];
}

export interface RestaurantDetailResponse {
  id: string;
  vendorUserId: string;
  name: string;
  slug: string;
  description?: string | null;
  area: string;
  address: string;
  phone: string;
  bannerImageUrl?: string | null;
  logoUrl?: string | null;
  cuisines: string[];
  commissionRate: number;
  deliveryFee: number;
  isPlatformDelivery: boolean;
  isOpen: boolean;
  isApproved: boolean;
  approvedAt?: string | null;
  approvedByStaffId?: string | null;
  createdAt?: string;
  categories: MenuCategoryResponse[];
}

export interface FoodOrderItemInput {
  menuItemId: string;
  quantity: number;
  specialNotes?: string;
}

export interface FoodOrderCreateDto {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  fulfillmentType: FoodFulfillmentType;
  deliveryArea?: string;
  deliveryAddress?: string;
  paymentMethod: string;
  specialInstructions?: string;
  items: FoodOrderItemInput[];
}

export interface FoodOrderItemResponse {
  id: string;
  menuItemId: string;
  itemName: string;
  unitPriceBdt: number;
  quantity: number;
  totalPriceBdt: number;
  specialNotes?: string | null;
}

export interface FoodOrderResponse {
  id: string;
  orderNumber: string;
  restaurantId: string;
  restaurantName: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  userId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  fulfillmentType: FoodFulfillmentType;
  deliveryArea?: string | null;
  deliveryAddress?: string | null;
  subtotalBdt: number;
  deliveryFeeBdt: number;
  totalAmountBdt: number;
  depositRequiredBdt: number;
  depositPaidBdt: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: FoodOrderStatus;
  cookingMinutesEstimated: number;
  cookingStartedAt?: string | null;
  cookingTargetAt?: string | null;
  specialInstructions?: string | null;
  commissionRate: number;
  commissionAmountBdt: number;
  netVendorEarningsBdt: number;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  items: FoodOrderItemResponse[];
}

export interface FoodOrderStatusUpdateDto {
  status: FoodOrderStatus;
  cookingMinutes?: number;
  cancellationReason?: string;
}

export interface RestaurantLedgerResponse {
  restaurantId: string;
  restaurantName: string;
  commissionRate: number;
  totalOrdersCount: number;
  deliveredOrdersCount: number;
  grossSalesBdt: number;
  platformCommissionBdt: number;
  netVendorPayoutBdt: number;
  recentOrders: FoodOrderResponse[];
}

// -----------------------------------------------------------------------------
// Phase 10: Hub & Community (Classifieds & Discussions)
// -----------------------------------------------------------------------------

export enum CommunityPostCategory {
  BUY_SELL = 'BUY_SELL',
  LOGISTICS_COURIER = 'LOGISTICS_COURIER',
  HIRING_JOBS = 'HIRING_JOBS',
  EQUIPMENT = 'EQUIPMENT',
  SERVICES = 'SERVICES',
  GENERAL_DISCUSSION = 'GENERAL_DISCUSSION',
}

export enum CommunityPostStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REMOVED = 'REMOVED',
}

export interface CommunityPostCreateDto {
  title: string;
  content: string;
  category: CommunityPostCategory;
  location?: string;
  priceBdt?: number;
  tags?: string[];
  linkedSector?: string;
  linkedEntityId?: string;
  linkedUrl?: string;
  authorPhone?: string;
  authorEmail?: string;
}

export interface CommunityPostUpdateDto extends Partial<CommunityPostCreateDto> {}

export interface CommunityPostModerationDto {
  status: CommunityPostStatus.APPROVED | CommunityPostStatus.REJECTED;
  rejectionReason?: string;
}

export interface CommunityPostResponse {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: CommunityPostCategory;
  status: CommunityPostStatus;
  authorId: string;
  authorName: string;
  authorPhone?: string | null;
  authorEmail?: string | null;
  location?: string | null;
  priceBdt?: number | null;
  tags: string[];
  linkedSector?: string | null;
  linkedEntityId?: string | null;
  linkedUrl?: string | null;
  reviewedById?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  removalReason?: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Phase 11.1: Recommendation & Suggestion Engine
// -----------------------------------------------------------------------------

export enum RecommendationStrategy {
  PERSONALIZED = 'PERSONALIZED',
  FREQUENTLY_BOUGHT_TOGETHER = 'FREQUENTLY_BOUGHT_TOGETHER',
  GENERIC_SUBSTITUTES = 'GENERIC_SUBSTITUTES',
  TRENDING_POPULAR = 'TRENDING_POPULAR',
}

export interface BehaviorEventDto {
  eventType: 'PRODUCT_VIEWED' | 'PRODUCT_ADDED_TO_CART' | 'PRODUCT_PURCHASED' | 'SEARCH_PERFORMED';
  productId?: string;
  metadata?: Record<string, any>;
  guestSessionId?: string;
}

export interface RecommendationItemResponse {
  id: string;
  name: string;
  slug: string;
  genericName?: string | null;
  dosageForm?: string | null;
  companyName?: string | null;
  priceBdt: number;
  mrpBdt?: number | null;
  imageUrl?: string | null;
  categoryName?: string | null;
  stockCount: number;
  recommendationScore: number;
  recommendationReason: string;
  discountPercentage?: number;
}

export interface FrequentlyBoughtTogetherResponse {
  mainProduct: RecommendationItemResponse;
  bundledProducts: RecommendationItemResponse[];
  bundleTotalPriceBdt: number;
  bundleOriginalPriceBdt: number;
  bundleDiscountSavingsBdt: number;
}

// -----------------------------------------------------------------------------
// Phase 11.3: Rewards Points + Referral Program Types
// -----------------------------------------------------------------------------

export interface RewardTransactionResponse {
  id: string;
  type: string;
  points: number;
  balanceAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  description: string;
  createdAt: string;
}

export interface RewardAccountResponse {
  id: string;
  userId: string;
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  referralCode: string;
  referredByCode?: string | null;
  tierLevel: string;
  equivalentDiscountBdt: number;
  recentTransactions?: RewardTransactionResponse[];
}

export interface RedeemPointsDto {
  pointsToRedeem: number;
  orderSubtotal: number;
}

export interface ClaimReferralDto {
  referralCode: string;
}

// -----------------------------------------------------------------------------
// Phase 11.4: Bundle Deals & Flash Sales Types
// -----------------------------------------------------------------------------

export interface FlashSaleDealDto {
  title: string;
  productId: string;
  flashPriceBdt: number;
  quotaLimit?: number;
  startTime: string;
  endTime: string;
}

export interface FlashSaleDealResponse {
  id: string;
  title: string;
  slug: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  flashPriceBdt: number;
  originalMrp: number;
  discountPercent: number;
  quotaLimit: number;
  quotaClaimed: number;
  remainingQuota: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isExpired: boolean;
}

export interface ProductBundleDealDto {
  title: string;
  description?: string;
  bundlePriceBdt: number;
  items: Array<{ productId: string; quantity: number }>;
}

export interface ProductBundleDealResponse {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  bundlePriceBdt: number;
  totalMrpBdt: number;
  savingsPercent: number;
  items: Array<{
    productId: string;
    productName: string;
    productSlug: string;
    quantity: number;
    unitMrp: number;
  }>;
  isActive: boolean;
}

// -----------------------------------------------------------------------------
// Phase 11.5: Abandoned Cart Reminders Types
// -----------------------------------------------------------------------------

export interface AbandonedCartSessionResponse {
  id: string;
  userId?: string | null;
  guestSessionId?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  items: any[];
  cartSubtotalBdt: number;
  lastActivityAt: string;
  reminderSentCount: number;
  lastReminderSentAt?: string | null;
  status: string;
}

export interface AbandonedCartReminderTriggerDto {
  sessionId: string;
  channel?: 'SMS' | 'EMAIL' | 'NOTIFICATION';
  customMessage?: string;
}

// -----------------------------------------------------------------------------
// Phase 11.6: Price-Drop Alerts Types
// -----------------------------------------------------------------------------

export interface CreatePriceDropSubscriptionDto {
  productId: string;
  targetPriceBdt?: number;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PriceDropAlertResponse {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  baselineMrp: number;
  currentMrp: number;
  targetPriceBdt: number;
  savingsBdt: number;
  savingsPercent: number;
  isTriggered: boolean;
  isNotified: boolean;
}

// -----------------------------------------------------------------------------
// Phase 11.7: Support Ticket System Types
// -----------------------------------------------------------------------------

export interface CreateSupportTicketDto {
  subject: string;
  category: 'ORDER' | 'PAYMENT' | 'RETURN' | 'QUALITY' | 'GENERAL';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  message: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  attachments?: string[];
}

export interface TicketMessageResponse {
  id: string;
  ticketId: string;
  senderId?: string | null;
  senderName: string;
  senderRole: string;
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface SupportTicketResponse {
  id: string;
  ticketNumber: string;
  userId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assignedToStaffId?: string | null;
  assignedToStaffName?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessageResponse[];
}

export interface TicketReplyDto {
  message: string;
  attachments?: string[];
}

export interface UpdateTicketStatusDto {
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedToStaffId?: string;
}

// -----------------------------------------------------------------------------
// Phase 11.8: Bulk Order Upload / Quotation Request Tool Types
// -----------------------------------------------------------------------------

export interface BulkQuotationItemInput {
  rawQuery: string;
  requestedQuantity: number;
}

export interface BulkQuotationRequestDto {
  rawText?: string;
  items?: BulkQuotationItemInput[];
  buyerName?: string;
  buyerPhone?: string;
}

export interface BulkQuotationItemResponse {
  id: string;
  rawQuery: string;
  matchedProductId?: string | null;
  matchedProductName?: string | null;
  genericName?: string | null;
  requestedQuantity: number;
  unitMrp: number;
  quotedUnitPrice: number;
  totalQuotedPrice: number;
  isAvailable: boolean;
  matchConfidence: 'EXACT_SKU' | 'GENERIC_MATCH' | 'FUZZY_MATCH' | 'NOT_FOUND';
  notes?: string | null;
}

export interface BulkQuotationResponse {
  id: string;
  quoteNumber: string;
  buyerId?: string | null;
  buyerName: string;
  buyerPhone: string;
  buyerAccountType: string;
  tierCode?: string | null;
  totalMatchedItems: number;
  totalUnmatchedItems: number;
  estimatedTotalBdt: number;
  status: string;
  convertedOrderId?: string | null;
  createdAt: string;
  items: BulkQuotationItemResponse[];
}











