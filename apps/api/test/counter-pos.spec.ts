import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { StockService } from '../src/modules/stock/stock.service';
import { AccountType } from '@siam-aqua/shared-types';

describe('Phase 11.2: Counter / Offline POS Sale Entry Suite', () => {
  let prisma: PrismaClient;
  let stockService: StockService;

  let testAdminUser: any;
  let testProduct: any;
  let testCompany: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    stockService = new StockService(prisma as any);

    // Setup Admin user
    testAdminUser = await prisma.user.create({
      data: {
        email: `pos_admin_${Date.now()}@siamaqua.com`,
        passwordHash: 'hashed_pw',
        accountType: AccountType.SUPER_ADMIN,
        name: 'POS Central Admin',
        phone: '01811223344',
      },
    });

    testCompany = await prisma.company.create({
      data: {
        name: 'Square Pharmaceuticals POS',
        code: `SQ-POS-${Date.now()}`,
      },
    });

    testProduct = await prisma.product.create({
      data: {
        name: 'Napa Extend 665mg POS',
        slug: `napa-extend-pos-${Date.now()}`,
        mrp: 25.0,
        genericName: 'Paracetamol',
        dosageForm: 'TABLET',
        strength: '665mg',
        companyId: testCompany.id,
        category: 'OTC',
      },
    });
  });

  afterAll(async () => {
    if (testProduct) {
      await prisma.stockBatch.deleteMany({ where: { productId: testProduct.id } });
      await prisma.stockSaleItem.deleteMany({ where: { productId: testProduct.id } });
      await prisma.product.deleteMany({ where: { id: testProduct.id } });
    }
    if (testCompany) {
      await prisma.company.deleteMany({ where: { id: testCompany.id } });
    }
    if (testAdminUser) {
      await prisma.stockSaleRecord.deleteMany({ where: { ownerId: testAdminUser.id } });
      await prisma.user.deleteMany({ where: { id: testAdminUser.id } });
    }
    await prisma.$disconnect();
  });

  it('1. should intake stock batch with purchase cost for counter POS', async () => {
    const batch = await stockService.createBatch(testAdminUser.id, {
      productId: testProduct.id,
      batchNumber: 'POS-BATCH-001',
      initialQuantity: 100,
      purchaseCost: 15.0, // cost ৳15, MRP ৳25
      sellingPrice: 25.0,
      wholesalePrice: 20.0,
      expiryDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      supplierName: 'Direct Central Depot',
    });

    expect(batch).toBeDefined();
    expect(batch.currentQuantity).toBe(100);
    expect(batch.purchaseCost).toBe(15.0);
  });

  it('2. should process retail counter sale with 10% discount tier and deduct batch FIFO', async () => {
    const sale = await stockService.recordSale(testAdminUser.id, {
      saleType: 'RETAIL',
      customerName: 'Rahim Walk-in Customer',
      customerPhone: '01700000001',
      paymentMethod: 'CASH',
      discountPercent: 10, // 10% retail discount
      items: [
        {
          productId: testProduct.id,
          quantity: 20, // 20 * ৳25 = ৳500 subtotal
        },
      ],
    });

    expect(sale).toBeDefined();
    expect(sale.receiptNumber).toMatch(/^REC-2026-\d{4}-\d{4}$/);
    expect(sale.subtotal).toBe(500.0);
    expect(sale.discountPercent).toBe(10);
    expect(sale.discountAmount).toBe(50.0); // ৳500 * 10% = ৳50
    expect(sale.totalAmount).toBe(450.0); // ৳500 - ৳50 = ৳450
    expect(sale.totalCost).toBe(300.0); // 20 * ৳15 = ৳300
    expect(sale.profitMargin).toBe(150.0); // ৳450 - ৳300 = ৳150

    // Check remaining stock in batch
    const batches = await prisma.stockBatch.findMany({ where: { productId: testProduct.id } });
    expect(batches[0].currentQuantity).toBe(80); // 100 - 20 = 80
  });

  it('3. should process wholesale rate counter sale with MFS (bKash) payment', async () => {
    const wholesaleSale = await stockService.recordSale(testAdminUser.id, {
      saleType: 'WHOLESALE',
      customerName: 'Mohsin Pharmacy Counter',
      customerPhone: '01900000002',
      paymentMethod: 'BKASH',
      items: [
        {
          productId: testProduct.id,
          quantity: 30, // 30 units at wholesale rate (mrp * 0.85 = ৳21.25)
        },
      ],
    });

    expect(wholesaleSale.saleType).toBe('WHOLESALE');
    expect(wholesaleSale.paymentMethod).toBe('BKASH');
    expect(wholesaleSale.totalAmount).toBe(637.5); // 30 * 21.25
    expect(wholesaleSale.totalCost).toBe(450.0); // 30 * 15
    expect(wholesaleSale.profitMargin).toBe(187.5); // 637.5 - 450.0 = 187.5

    // Check remaining stock
    const batches = await prisma.stockBatch.findMany({ where: { productId: testProduct.id } });
    expect(batches[0].currentQuantity).toBe(50); // 80 - 30 = 50
  });

  it('4. should prevent counter sale if requested quantity exceeds available stock', async () => {
    await expect(
      stockService.recordSale(testAdminUser.id, {
        saleType: 'RETAIL',
        items: [
          {
            productId: testProduct.id,
            quantity: 999, // exceeds 50 available
          },
        ],
      }),
    ).rejects.toThrow(/Insufficient stock/);
  });
});
