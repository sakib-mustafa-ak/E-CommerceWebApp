import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DealsService } from '../src/modules/deals/deals.service';

describe('Phase 11.4: Bundle Deals & Flash Sales Suite', () => {
  let prisma: PrismaClient;
  let dealsService: DealsService;

  let testCompany: any;
  let productA: any;
  let productB: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    dealsService = new DealsService(prisma as any);

    testCompany = await prisma.company.create({
      data: {
        name: 'Beximco Deals Pharma',
        code: `BEX-DEAL-${Date.now()}`,
      },
    });

    productA = await prisma.product.create({
      data: {
        name: 'Napa 500mg Strip',
        slug: `napa-500-deal-${Date.now()}`,
        mrp: 12.0,
        genericName: 'Paracetamol',
        dosageForm: 'TABLET',
        strength: '500mg',
        companyId: testCompany.id,
      },
    });

    productB = await prisma.product.create({
      data: {
        name: 'Ceevit 250mg Chewable',
        slug: `ceevit-250-deal-${Date.now()}`,
        mrp: 20.0,
        genericName: 'Ascorbic Acid',
        dosageForm: 'TABLET',
        strength: '250mg',
        companyId: testCompany.id,
      },
    });
  });

  afterAll(async () => {
    if (productA) {
      await prisma.flashSaleDeal.deleteMany({ where: { productId: productA.id } });
      await prisma.product.deleteMany({ where: { id: productA.id } });
    }
    if (productB) {
      await prisma.flashSaleDeal.deleteMany({ where: { productId: productB.id } });
      await prisma.product.deleteMany({ where: { id: productB.id } });
    }
    await prisma.productBundleDeal.deleteMany({});
    if (testCompany) {
      await prisma.company.deleteMany({ where: { id: testCompany.id } });
    }
    await prisma.$disconnect();
  });

  it('1. should create a flash sale deal with discount percentage and quota limit', async () => {
    const startTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    const endTime = new Date(Date.now() + 86400000).toISOString(); // 24 hours from now

    // MRP ৳12, flash price ৳9.0 -> 25% discount
    const flashSale = await dealsService.createFlashSale({
      title: 'Midnight Flash: Napa 500mg',
      productId: productA.id,
      flashPriceBdt: 9.0,
      quotaLimit: 30,
      startTime,
      endTime,
    });

    expect(flashSale).toBeDefined();
    expect(flashSale.discountPercent).toBe(25.0);
    expect(flashSale.quotaLimit).toBe(30);
    expect(flashSale.remainingQuota).toBe(30);
    expect(flashSale.isActive).toBe(true);
  });

  it('2. should fetch active ongoing flash sales', async () => {
    const activeFlashSales = await dealsService.getActiveFlashSales();
    expect(activeFlashSales.length).toBeGreaterThanOrEqual(1);

    const deal = activeFlashSales.find((d) => d.productId === productA.id);
    expect(deal).toBeDefined();
    expect(deal?.flashPriceBdt).toBe(9.0);
    expect(deal?.isExpired).toBe(false);
  });

  it('3. should create a curated multi-product bundle deal with savings math', async () => {
    // Bundle of: 2 x Napa (2*12=24) + 1 x Ceevit (20) = total MRP ৳44
    // Bundle price: ৳33 -> 25% savings
    const bundle = await dealsService.createProductBundle({
      title: 'Fever & Immunity Relief Combo Kit',
      description: 'Contains 2 strips of Napa 500mg and 1 bottle of Ceevit 250mg',
      bundlePriceBdt: 33.0,
      items: [
        { productId: productA.id, quantity: 2 },
        { productId: productB.id, quantity: 1 },
      ],
    });

    expect(bundle).toBeDefined();
    expect(bundle.totalMrpBdt).toBe(44.0);
    expect(bundle.bundlePriceBdt).toBe(33.0);
    expect(bundle.savingsPercent).toBe(25.0);
    expect(bundle.items.length).toBe(2);
  });

  it('4. should fetch active product bundles', async () => {
    const activeBundles = await dealsService.getActiveBundles();
    expect(activeBundles.length).toBeGreaterThanOrEqual(1);

    const bundle = activeBundles.find((b) => b.title === 'Fever & Immunity Relief Combo Kit');
    expect(bundle).toBeDefined();
    expect(bundle?.items.length).toBe(2);
  });
});
