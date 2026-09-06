import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { BulkOrderService } from '../src/modules/bulk-order/bulk-order.service';
import { AccountType } from '@siam-aqua/shared-types';

describe('Phase 11.8: Bulk Order Upload & Quotation Request Tool Suite', () => {
  let prisma: PrismaClient;
  let bulkOrderService: BulkOrderService;

  let testCompany: any;
  let productA: any;
  let productB: any;
  let testWholesaler: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    bulkOrderService = new BulkOrderService(prisma as any);

    testCompany = await prisma.company.create({
      data: {
        name: 'Square Bulk Pharma',
        code: `SQ-BULK-${Date.now()}`,
      },
    });

    productA = await prisma.product.create({
      data: {
        name: 'Napa Extra 500mg/65mg',
        slug: `napa-extra-bulk-${Date.now()}`,
        mrp: 30.0,
        genericName: 'Paracetamol + Caffeine',
        dosageForm: 'TABLET',
        strength: '500mg+65mg',
        companyId: testCompany.id,
      },
    });

    productB = await prisma.product.create({
      data: {
        name: 'Seclo 20mg Capsule',
        slug: `seclo-20-bulk-${Date.now()}`,
        mrp: 50.0,
        genericName: 'Omeprazole',
        dosageForm: 'CAPSULE',
        strength: '20mg',
        companyId: testCompany.id,
      },
    });

    testWholesaler = await prisma.user.create({
      data: {
        email: `wholesaler_bulk_${Date.now()}@siamaqua.com`,
        passwordHash: 'hash',
        accountType: AccountType.WHOLESALER_SELLER,
        name: 'Faridpur Bulk Traders',
        phone: '01711998877',
      },
    });
  });

  afterAll(async () => {
    if (productA) {
      await prisma.bulkQuotationItem.deleteMany({ where: { matchedProductId: productA.id } });
      await prisma.product.deleteMany({ where: { id: productA.id } });
    }
    if (productB) {
      await prisma.bulkQuotationItem.deleteMany({ where: { matchedProductId: productB.id } });
      await prisma.product.deleteMany({ where: { id: productB.id } });
    }
    if (testWholesaler) {
      await prisma.bulkQuotationRequest.deleteMany({ where: { buyerId: testWholesaler.id } });
      await prisma.user.deleteMany({ where: { id: testWholesaler.id } });
    }
    if (testCompany) {
      await prisma.company.deleteMany({ where: { id: testCompany.id } });
    }
    await prisma.$disconnect();
  });

  it('1. should parse multiline raw text and generate instant quotation with exact & fuzzy matches', async () => {
    const rawText = `
      Napa Extra 500mg/65mg - 50
      Seclo 20mg x 100
      Unknown Rare Medicine 500mg, 10
    `;

    const quote = await bulkOrderService.generateQuotation(testWholesaler.id, {
      rawText,
    });

    expect(quote).toBeDefined();
    expect(quote.quoteNumber).toMatch(/^QUOTE-2026-\d{4}-\d{4}$/);
    expect(quote.totalMatchedItems).toBe(2);
    expect(quote.totalUnmatchedItems).toBe(1);
    expect(quote.items.length).toBe(3);

    // Item 1: Exact / Fuzzy Match on Napa Extra
    // MRP ৳30, 15% wholesale discount -> ৳25.50 * 50 = ৳1,275.00
    const item1 = quote.items.find((i) => i.matchedProductId === productA.id);
    expect(item1).toBeDefined();
    expect(item1?.unitMrp).toBe(30.0);
    expect(item1?.quotedUnitPrice).toBe(25.5);
    expect(item1?.totalQuotedPrice).toBe(1275.0);

    // Item 2: Fuzzy Match on Seclo 20mg
    // MRP ৳50, 15% wholesale discount -> ৳42.50 * 100 = ৳4,250.00
    const item2 = quote.items.find((i) => i.matchedProductId === productB.id);
    expect(item2).toBeDefined();
    expect(item2?.unitMrp).toBe(50.0);
    expect(item2?.quotedUnitPrice).toBe(42.5);
    expect(item2?.totalQuotedPrice).toBe(4250.0);

    // Total Estimated = 1275 + 4250 = ৳5,525.00
    expect(quote.estimatedTotalBdt).toBe(5525.0);

    // Item 3: Unmatched item
    const item3 = quote.items.find((i) => i.matchConfidence === 'NOT_FOUND');
    expect(item3).toBeDefined();
    expect(item3?.isAvailable).toBe(false);
  });

  it('2. should fetch generated quotation by quote number', async () => {
    const quote = await bulkOrderService.generateQuotation(testWholesaler.id, {
      rawText: 'Napa Extra - 10',
    });

    const retrieved = await bulkOrderService.getQuotationByNumber(quote.quoteNumber);
    expect(retrieved).toBeDefined();
    expect(retrieved.quoteNumber).toBe(quote.quoteNumber);
    expect(retrieved.buyerName).toBe('Faridpur Bulk Traders');
    expect(retrieved.items.length).toBe(1);
  });
});
