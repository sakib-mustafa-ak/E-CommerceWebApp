import { RateType, PricingLayer } from '@siam-aqua/shared-types';

export interface RateRule {
  rateType: RateType;
  value: number; // e.g., 12 for 12% discount, or 85.50 for flat 85.50 BDT unit price
}

export interface ProductPricingContext {
  productId: string;
  mrp: number; // Base Maximum Retail Price in BDT
  companyId: string;
}

export interface CustomerPricingContext {
  customerId: string;
  tierId: string;
  manualOverrides?: Record<string, RateRule>; // key: productId -> RateRule
}

export interface PricingCatalogState {
  tierDefaults: Record<string, RateRule>; // key: tierId -> RateRule
  companyRates: Record<string, Record<string, RateRule>>; // key: companyId -> (key: tierId -> RateRule)
  productOverrides: Record<string, Record<string, RateRule>>; // key: productId -> (key: tierId -> RateRule)
}

export interface PricingResult {
  productId: string;
  mrp: number;
  finalUnitPrice: number; // Final calculated unit price in BDT
  effectiveDiscountPercentage: number; // Computed discount % from MRP
  effectiveDiscountAmount: number; // Computed flat savings in BDT
  appliedLayer: PricingLayer;
  appliedRule: RateRule;
  isManualOverride: boolean;
}
