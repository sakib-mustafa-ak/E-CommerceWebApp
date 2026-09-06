import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { RecommendationsService } from '../src/modules/recommendations/recommendations.service';
import { AccountType } from '@siam-aqua/shared-types';

describe('Phase 11.1: Recommendation & Suggestion Engine Test Suite', () => {
  let prisma: PrismaClient;
  let service: RecommendationsService;

  let testUser: any;
  let pharmaCompanyBeximco: any;
  let pharmaCompanySquare: any;
  let genericParacetamol: any;
  let genericOmeprazole: any;

  let napaProduct: any;
  let aceProduct: any;
  let secloProduct: any;
  let losectilProduct: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    service = new RecommendationsService(prisma as any);

    const timestamp = Date.now();

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `recom_user_${timestamp}@test.com`,
        passwordHash: 'hash',
        name: 'Dr. Shakil Ahmed',
        accountType: AccountType.PUBLIC_USER,
      },
    });

    // Create companies
    pharmaCompanyBeximco = await prisma.company.create({
      data: {
        name: `Beximco Pharma ${timestamp}`,
        code: `BEX-${timestamp}`,
      },
    });

    pharmaCompanySquare = await prisma.company.create({
      data: {
        name: `Square Pharma ${timestamp}`,
        code: `SQR-${timestamp}`,
      },
    });

    // Create Generics
    genericParacetamol = await prisma.generic.create({
      data: {
        name: `Paracetamol 500mg ${timestamp}`,
        slug: `paracetamol-500mg-${timestamp}`,
      },
    });

    genericOmeprazole = await prisma.generic.create({
      data: {
        name: `Omeprazole 20mg ${timestamp}`,
        slug: `omeprazole-20mg-${timestamp}`,
      },
    });

    // Create Products
    napaProduct = await prisma.product.create({
      data: {
        name: 'Napa 500mg Tablet',
        slug: `napa-500mg-${timestamp}`,
        companyId: pharmaCompanyBeximco.id,
        genericId: genericParacetamol.id,
        genericName: genericParacetamol.name,
        category: 'OTC',
        dosageForm: 'Tablet',
        strength: '500mg',
        mrp: 12.0,
        unit: 'Strip (10 tabs)',
        offerParaStockQty: 500,
        isOfferParaLiveStock: true,
      },
    });

    aceProduct = await prisma.product.create({
      data: {
        name: 'Ace 500mg Tablet',
        slug: `ace-500mg-${timestamp}`,
        companyId: pharmaCompanySquare.id,
        genericId: genericParacetamol.id,
        genericName: genericParacetamol.name,
        category: 'OTC',
        dosageForm: 'Tablet',
        strength: '500mg',
        mrp: 10.0, // Cheaper equivalent
        unit: 'Strip (10 tabs)',
        offerParaStockQty: 400,
        isOfferParaLiveStock: true,
      },
    });

    secloProduct = await prisma.product.create({
      data: {
        name: 'Seclo 20mg Capsule',
        slug: `seclo-20mg-${timestamp}`,
        companyId: pharmaCompanySquare.id,
        genericId: genericOmeprazole.id,
        genericName: genericOmeprazole.name,
        category: 'Gastric',
        dosageForm: 'Capsule',
        strength: '20mg',
        mrp: 60.0,
        unit: 'Strip (10 caps)',
        offerParaStockQty: 300,
        isOfferParaLiveStock: true,
      },
    });

    losectilProduct = await prisma.product.create({
      data: {
        name: 'Losectil 20mg Capsule',
        slug: `losectil-20mg-${timestamp}`,
        companyId: pharmaCompanyBeximco.id,
        genericId: genericOmeprazole.id,
        genericName: genericOmeprazole.name,
        category: 'Gastric',
        dosageForm: 'Capsule',
        strength: '20mg',
        mrp: 55.0,
        unit: 'Strip (10 caps)',
        offerParaStockQty: 250,
        isOfferParaLiveStock: true,
      },
    });
  });

  afterAll(async () => {
    if (testUser) {
      await prisma.userBehaviorLog.deleteMany({
        where: { userId: testUser.id },
      });
    }
    const productIds = [napaProduct?.id, aceProduct?.id, secloProduct?.id, losectilProduct?.id].filter(Boolean);
    if (productIds.length > 0) {
      await prisma.product.deleteMany({
        where: { id: { in: productIds } },
      });
    }
    const genericIds = [genericParacetamol?.id, genericOmeprazole?.id].filter(Boolean);
    if (genericIds.length > 0) {
      await prisma.generic.deleteMany({
        where: { id: { in: genericIds } },
      });
    }
    const companyIds = [pharmaCompanyBeximco?.id, pharmaCompanySquare?.id].filter(Boolean);
    if (companyIds.length > 0) {
      await prisma.company.deleteMany({
        where: { id: { in: companyIds } },
      });
    }
    if (testUser) {
      await prisma.user.deleteMany({
        where: { id: testUser.id },
      });
    }
    await prisma.$disconnect();
  });

  describe('1. Behavior Event Tracking', () => {
    it('should log product view and cart addition events', async () => {
      const viewLog = await service.trackBehaviorEvent(testUser.id, undefined, {
        eventType: 'PRODUCT_VIEWED',
        productId: napaProduct.id,
        metadata: { source: 'product_page' },
      });

      const cartLog = await service.trackBehaviorEvent(testUser.id, undefined, {
        eventType: 'PRODUCT_ADDED_TO_CART',
        productId: napaProduct.id,
      });

      expect(viewLog.id).toBeDefined();
      expect(viewLog.eventType).toBe('PRODUCT_VIEWED');
      expect(cartLog.eventType).toBe('PRODUCT_ADDED_TO_CART');
    });
  });

  describe('2. Personalized Recommendations', () => {
    it('should recommend products matching user generic and category affinities', async () => {
      const recs = await service.getPersonalizedRecommendations(testUser.id, undefined, 4);

      expect(recs.length).toBeGreaterThan(0);
      // Since user interacted with Napa (Paracetamol 500mg), recommendations should include Ace or OTC items
      const hasAffinityMatch = recs.some(
        (r) => r.genericName === genericParacetamol.name || r.id === aceProduct.id,
      );
      expect(hasAffinityMatch).toBe(true);
    });
  });

  describe('3. Generic Drug Substitution & Savings Engine', () => {
    it('should identify equivalent brands for Napa (Paracetamol) and calculate savings percentage', async () => {
      const substitutes = await service.getGenericSubstitutes(napaProduct.id);

      expect(substitutes.length).toBeGreaterThan(0);
      const aceSub = substitutes.find((s) => s.id === aceProduct.id);
      expect(aceSub).toBeDefined();
      expect(aceSub?.genericName).toBe(genericParacetamol.name);
      // Napa is 12 BDT, Ace is 10 BDT -> savings should be calculated (around 16%)
      expect(aceSub?.discountPercentage).toBeGreaterThanOrEqual(16);
    });
  });

  describe('4. Frequently Bought Together Bundling', () => {
    it('should bundle complementary products and compute bundle discount', async () => {
      const bundle = await service.getFrequentlyBoughtTogether(napaProduct.id, 2);

      expect(bundle.mainProduct.id).toBe(napaProduct.id);
      expect(bundle.bundledProducts.length).toBeGreaterThan(0);
      expect(bundle.bundleOriginalPriceBdt).toBeGreaterThan(0);
      expect(bundle.bundleDiscountSavingsBdt).toBeGreaterThan(0);
      expect(bundle.bundleTotalPriceBdt).toBe(
        Math.round((bundle.bundleOriginalPriceBdt - bundle.bundleDiscountSavingsBdt) * 100) / 100,
      );
    });
  });

  describe('5. Trending & Velocity Scoring', () => {
    it('should compute trending products with weighted conversion events', async () => {
      // Log purchase event for Seclo
      await service.trackBehaviorEvent(testUser.id, undefined, {
        eventType: 'PRODUCT_PURCHASED',
        productId: secloProduct.id,
      });

      const trending = await service.getTrendingProducts(4);
      expect(trending.length).toBeGreaterThan(0);
      expect(trending.some((t) => t.id === secloProduct.id)).toBe(true);
    });
  });
});
