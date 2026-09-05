import { describe, it, expect } from 'vitest';
import { RateType, PricingLayer } from '@siam-aqua/shared-types';
import { PricingEngine, calculateFromRateRule, roundToCurrency } from '../src/engine';
import {
  ProductPricingContext,
  CustomerPricingContext,
  PricingCatalogState,
} from '../src/types';

describe('PricingEngine - 4-Layer Precedence & Calculation', () => {
  const squarePharmaId = 'comp-square';
  const beximcoId = 'comp-beximco';

  const productNapaExtra: ProductPricingContext = {
    productId: 'prod-napa-extra',
    mrp: 35.0, // 35.00 BDT
    companyId: squarePharmaId,
  };

  const productAcePlus: ProductPricingContext = {
    productId: 'prod-ace-plus',
    mrp: 40.0, // 40.00 BDT
    companyId: squarePharmaId,
  };

  const productNapaSyrup: ProductPricingContext = {
    productId: 'prod-napa-syrup',
    mrp: 55.5, // 55.50 BDT
    companyId: squarePharmaId,
  };

  const productBexiCold: ProductPricingContext = {
    productId: 'prod-bexi-cold',
    mrp: 120.0, // 120.00 BDT
    companyId: beximcoId,
  };

  const catalog: PricingCatalogState = {
    // Layer 4: Tier Defaults
    tierDefaults: {
      'tier-gold': { rateType: RateType.PERCENTAGE, value: 10 }, // 10% off default
      'tier-silver': { rateType: RateType.PERCENTAGE, value: 5 }, // 5% off default
    },
    // Layer 3: Company-level rates
    companyRates: {
      [squarePharmaId]: {
        'tier-gold': { rateType: RateType.PERCENTAGE, value: 14 }, // 14% off for Square on Gold
        'tier-silver': { rateType: RateType.PERCENTAGE, value: 8 }, // 8% off for Square on Silver
      },
      [beximcoId]: {
        'tier-gold': { rateType: RateType.FLAT_RATE, value: 100 }, // Flat 100 BDT unit price on Gold
      },
    },
    // Layer 2: Product-specific overrides
    productOverrides: {
      'prod-napa-extra': {
        'tier-gold': { rateType: RateType.PERCENTAGE, value: 18 }, // 18% override for Napa Extra
      },
    },
  };

  it('Layer 4 (Tier Default): applies tier default when no company or product override exists', () => {
    const customer: CustomerPricingContext = {
      customerId: 'cust-1',
      tierId: 'tier-silver',
    };

    // Beximco has no silver rule, Napa Extra has no silver override -> fallback to Tier Default (5%)
    const result = PricingEngine.calculatePrice(productBexiCold, customer, catalog);
    expect(result.appliedLayer).toBe(PricingLayer.TIER_DEFAULT);
    expect(result.mrp).toBe(120.0);
    expect(result.finalUnitPrice).toBe(114.0); // 120 - (120 * 0.05)
    expect(result.effectiveDiscountAmount).toBe(6.0);
    expect(result.effectiveDiscountPercentage).toBe(5);
    expect(result.isManualOverride).toBe(false);
  });

  it('Layer 3 (Company Rate): overrides Tier Default for products of that manufacturer', () => {
    const customer: CustomerPricingContext = {
      customerId: 'cust-1',
      tierId: 'tier-gold',
    };

    // Ace Plus has no product override, but Square has 14% for tier-gold (beats 10% tier default)
    const result = PricingEngine.calculatePrice(productAcePlus, customer, catalog);
    expect(result.appliedLayer).toBe(PricingLayer.COMPANY_RATE);
    expect(result.mrp).toBe(40.0);
    expect(result.finalUnitPrice).toBe(34.4); // 40 - (40 * 0.14) = 34.40
    expect(result.effectiveDiscountAmount).toBe(5.6);
    expect(result.effectiveDiscountPercentage).toBe(14);
  });

  it('Layer 2 (Product Override): overrides Company Rate and Tier Default', () => {
    const customer: CustomerPricingContext = {
      customerId: 'cust-1',
      tierId: 'tier-gold',
    };

    // Napa Extra has 18% product override on tier-gold (beats 14% Square company rate and 10% tier default)
    const result = PricingEngine.calculatePrice(productNapaExtra, customer, catalog);
    expect(result.appliedLayer).toBe(PricingLayer.PRODUCT_OVERRIDE);
    expect(result.mrp).toBe(35.0);
    expect(result.finalUnitPrice).toBe(28.7); // 35 - (35 * 0.18) = 28.70
    expect(result.effectiveDiscountAmount).toBe(6.3);
    expect(result.effectiveDiscountPercentage).toBe(18);
  });

  it('Layer 1 (Customer Manual Override): beats all other layers (Product, Company, Tier)', () => {
    const customer: CustomerPricingContext = {
      customerId: 'cust-vip',
      tierId: 'tier-gold',
      manualOverrides: {
        // Napa Extra manual rate of flat 25.00 BDT
        'prod-napa-extra': { rateType: RateType.FLAT_RATE, value: 25.0 },
      },
    };

    const result = PricingEngine.calculatePrice(productNapaExtra, customer, catalog);
    expect(result.appliedLayer).toBe(PricingLayer.CUSTOMER_MANUAL_OVERRIDE);
    expect(result.isManualOverride).toBe(true);
    expect(result.finalUnitPrice).toBe(25.0);
    expect(result.effectiveDiscountAmount).toBe(10.0);
    expect(result.effectiveDiscountPercentage).toBe(28.57); // (10 / 35) * 100 = 28.5714 -> 28.57
  });

  it('Tier Change Recalculation: changes tier rates instantly while manual overrides strictly survive', () => {
    const customer: CustomerPricingContext = {
      customerId: 'cust-2',
      tierId: 'tier-silver',
      manualOverrides: {
        'prod-napa-syrup': { rateType: RateType.FLAT_RATE, value: 45.0 },
      },
    };

    const products = [productNapaExtra, productAcePlus, productNapaSyrup, productBexiCold];

    // Initial calculation on Silver
    const initialPrices = products.map((p) => PricingEngine.calculatePrice(p, customer, catalog));
    const initialAce = initialPrices.find((p) => p.productId === 'prod-ace-plus');
    const initialSyrup = initialPrices.find((p) => p.productId === 'prod-napa-syrup');

    expect(initialAce?.appliedLayer).toBe(PricingLayer.COMPANY_RATE);
    expect(initialAce?.finalUnitPrice).toBe(36.8); // 40 - (40 * 0.08) = 36.80
    expect(initialSyrup?.appliedLayer).toBe(PricingLayer.CUSTOMER_MANUAL_OVERRIDE);
    expect(initialSyrup?.finalUnitPrice).toBe(45.0);

    // Promote customer from tier-silver to tier-gold
    const recalculated = PricingEngine.recalculateForNewTier(products, customer, 'tier-gold', catalog);
    const updatedAce = recalculated.find((p) => p.productId === 'prod-ace-plus');
    const updatedNapaExtra = recalculated.find((p) => p.productId === 'prod-napa-extra');
    const updatedSyrup = recalculated.find((p) => p.productId === 'prod-napa-syrup');

    // Ace Plus changed to Gold rate (14%)
    expect(updatedAce?.finalUnitPrice).toBe(34.4);
    // Napa Extra changed to Gold product override (18%)
    expect(updatedNapaExtra?.finalUnitPrice).toBe(28.7);
    // Manual override for Napa Syrup SURVIVED and is unchanged
    expect(updatedSyrup?.appliedLayer).toBe(PricingLayer.CUSTOMER_MANUAL_OVERRIDE);
    expect(updatedSyrup?.finalUnitPrice).toBe(45.0);
    expect(updatedSyrup?.isManualOverride).toBe(true);
  });

  it('supports dual representation (% and flat currency) with half-up rounding', () => {
    // 1. Percentage discount on fractional MRP
    const res1 = calculateFromRateRule(33.33, { rateType: RateType.PERCENTAGE, value: 12.5 });
    // 33.33 * 0.125 = 4.16625 -> round 4.17
    // 33.33 - 4.17 = 29.16
    expect(res1.effectiveDiscountAmount).toBe(4.17);
    expect(res1.finalUnitPrice).toBe(29.16);
    expect(res1.effectiveDiscountPercentage).toBe(12.5);

    // 2. Flat rate currency price
    const res2 = calculateFromRateRule(100.0, { rateType: RateType.FLAT_RATE, value: 82.5 });
    expect(res2.finalUnitPrice).toBe(82.5);
    expect(res2.effectiveDiscountAmount).toBe(17.5);
    expect(res2.effectiveDiscountPercentage).toBe(17.5);
  });

  it('handles edge cases safely (0 MRP, 100% discount, zero rates)', () => {
    const zeroMrpRes = calculateFromRateRule(0, { rateType: RateType.PERCENTAGE, value: 20 });
    expect(zeroMrpRes.finalUnitPrice).toBe(0);
    expect(zeroMrpRes.effectiveDiscountAmount).toBe(0);

    const fullDiscountRes = calculateFromRateRule(50, { rateType: RateType.PERCENTAGE, value: 100 });
    expect(fullDiscountRes.finalUnitPrice).toBe(0);
    expect(fullDiscountRes.effectiveDiscountAmount).toBe(50);
  });
});
