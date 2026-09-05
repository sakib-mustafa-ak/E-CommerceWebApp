import { RateType, PricingLayer } from '@siam-aqua/shared-types';
import {
  RateRule,
  ProductPricingContext,
  CustomerPricingContext,
  PricingCatalogState,
  PricingResult,
} from './types';

/**
 * Standard monetary rounding to 2 decimal places using half-up arithmetic.
 */
export function roundToCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates the dual-representation pricing from MRP and a rate rule.
 */
export function calculateFromRateRule(mrp: number, rule: RateRule): {
  finalUnitPrice: number;
  effectiveDiscountAmount: number;
  effectiveDiscountPercentage: number;
} {
  const cleanMrp = roundToCurrency(Math.max(0, mrp));

  if (rule.rateType === RateType.PERCENTAGE) {
    const percentage = Math.max(0, rule.value);
    const discountAmount = roundToCurrency(cleanMrp * (percentage / 100));
    const finalUnitPrice = roundToCurrency(Math.max(0, cleanMrp - discountAmount));
    return {
      finalUnitPrice,
      effectiveDiscountAmount: discountAmount,
      effectiveDiscountPercentage: percentage,
    };
  } else {
    // FLAT_RATE is the exact desired unit price
    const flatPrice = roundToCurrency(Math.max(0, rule.value));
    const finalUnitPrice = flatPrice;
    const discountAmount = roundToCurrency(Math.max(0, cleanMrp - finalUnitPrice));
    const effectiveDiscountPercentage =
      cleanMrp > 0 ? roundToCurrency((discountAmount / cleanMrp) * 100) : 0;

    return {
      finalUnitPrice,
      effectiveDiscountAmount: discountAmount,
      effectiveDiscountPercentage,
    };
  }
}

/**
 * 4-Layer Pricing Engine for Siam's Aqua E-Commerce.
 *
 * Precedence Order:
 * 1. Customer-specific manual rate for this exact product (CustomerManualOverride)
 * 2. Product-specific override rate for this customer's tier (ProductOverride)
 * 3. Company-level rate for this customer's tier (CompanyRate)
 * 4. Tier default rate (TierDefault)
 * Default: 0% discount (Full MRP)
 */
export class PricingEngine {
  /**
   * Resolves the price for a single product and customer.
   */
  public static calculatePrice(
    product: ProductPricingContext,
    customer: CustomerPricingContext,
    catalog: PricingCatalogState,
  ): PricingResult {
    let appliedLayer: PricingLayer = PricingLayer.TIER_DEFAULT;
    let appliedRule: RateRule = { rateType: RateType.PERCENTAGE, value: 0 };
    let isManualOverride = false;

    // Layer 1: Customer Manual Override
    const customerOverride = customer.manualOverrides?.[product.productId];
    if (customerOverride) {
      appliedLayer = PricingLayer.CUSTOMER_MANUAL_OVERRIDE;
      appliedRule = customerOverride;
      isManualOverride = true;
    }
    // Layer 2: Product-specific override for customer's tier
    else if (catalog.productOverrides?.[product.productId]?.[customer.tierId]) {
      appliedLayer = PricingLayer.PRODUCT_OVERRIDE;
      appliedRule = catalog.productOverrides[product.productId][customer.tierId];
    }
    // Layer 3: Company-level rate for customer's tier
    else if (catalog.companyRates?.[product.companyId]?.[customer.tierId]) {
      appliedLayer = PricingLayer.COMPANY_RATE;
      appliedRule = catalog.companyRates[product.companyId][customer.tierId];
    }
    // Layer 4: Tier default rate
    else if (catalog.tierDefaults?.[customer.tierId]) {
      appliedLayer = PricingLayer.TIER_DEFAULT;
      appliedRule = catalog.tierDefaults[customer.tierId];
    }

    const { finalUnitPrice, effectiveDiscountAmount, effectiveDiscountPercentage } =
      calculateFromRateRule(product.mrp, appliedRule);

    return {
      productId: product.productId,
      mrp: roundToCurrency(product.mrp),
      finalUnitPrice,
      effectiveDiscountAmount,
      effectiveDiscountPercentage,
      appliedLayer,
      appliedRule,
      isManualOverride,
    };
  }

  /**
   * Recalculates catalog prices when a customer's tier changes.
   * Manual overrides are strictly preserved.
   */
  public static recalculateForNewTier(
    products: ProductPricingContext[],
    customer: CustomerPricingContext,
    newTierId: string,
    catalog: PricingCatalogState,
  ): PricingResult[] {
    const updatedCustomer: CustomerPricingContext = {
      ...customer,
      tierId: newTierId,
      // Manual overrides survive tier changes
      manualOverrides: customer.manualOverrides,
    };

    return products.map((product) =>
      this.calculatePrice(product, updatedCustomer, catalog),
    );
  }
}
