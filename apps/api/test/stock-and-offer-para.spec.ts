import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { StockService } from '../src/modules/stock/stock.service';
import { OrdersService } from '../src/modules/orders/orders.service';
import { EventsGateway } from '../src/modules/events/events.gateway';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  AccountType,
  FulfillmentMethod,
  MemoState,
  PaymentMethod,
  UnitType,
} from '@siam-aqua/shared-types';

describe('Phase 4: Offer Para & Stock Management Module Integration Test Suite', () => {
  let prisma: PrismaClient;
  let stockService: StockService;
  let ordersService: OrdersService;
  let eventsGateway: EventsGateway;
  let auditService: AuditService;

  let superAdminUser: any;
  let grantedWholesaler: any;
  let ungrantedShopOwner: any;
  let offerParaProduct: any;
  let regularPaikariProduct: any;
  let testCompany: any;
  let testTierA: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    eventsGateway = new EventsGateway();
    auditService = new AuditService(prisma as any);
    stockService = new StockService(prisma as any);
    ordersService = new OrdersService(prisma as any, eventsGateway, auditService);

    // Setup Test Tier A
    testTierA = await prisma.pricingTier.upsert({
      where: { code: 'TIER_A' },
      update: {},
      create: {
        code: 'TIER_A',
        name: 'Tier A Wholesale',
        defaultRateType: 'PERCENTAGE',
        defaultValue: 15.0,
      },
    });

    // Setup Test Company
    testCompany = await prisma.company.upsert({
      where: { code: 'TEST_PHARMA_STOCK' },
      update: {},
      create: {
        code: 'TEST_PHARMA_STOCK',
        name: 'Test Pharma Stock & Deals',
      },
    });

    // Setup Super Admin
    superAdminUser = await prisma.user.create({
      data: {
        email: `admin.stock.${Date.now()}@siamaqua.com`,
        name: 'Offer Para Admin',
        accountType: AccountType.SUPER_ADMIN,
        passwordHash: 'dummy-hash',
      },
    });

    // Setup Granted Wholesaler (Allowed to use Stock Module)
    grantedWholesaler = await prisma.user.create({
      data: {
        email: `wholesaler.stock.${Date.now()}@resale.com`,
        name: 'Granted Wholesaler Partner',
        accountType: AccountType.WHOLESALER_SELLER,
        passwordHash: 'dummy-hash',
        customerProfile: {
          create: {
            shopName: 'Metro Resale Pharma',
            ownerName: 'Metro Partner',
            address: 'Chittagong Port Road',
            tierId: testTierA.id,
            creditLimit: 300000,
            hasStockModuleAccess: true, // Granted access!
          },
        },
      },
      include: { customerProfile: true },
    });

    // Setup Regular Shop Owner (Ungranted)
    ungrantedShopOwner = await prisma.user.create({
      data: {
        email: `paikari.buyer.${Date.now()}@retail.com`,
        name: 'Small Retailer',
        accountType: AccountType.PAIKARI_SELLER,
        passwordHash: 'dummy-hash',
        customerProfile: {
          create: {
            shopName: 'Small Village Pharmacy',
            ownerName: 'Village Owner',
            address: 'Gazipur Chourasta',
            tierId: testTierA.id,
            creditLimit: 10000,
            hasStockModuleAccess: false, // Not granted!
          },
        },
      },
      include: { customerProfile: true },
    });

    // Setup Offer Para Product (Live Stock)
    offerParaProduct = await prisma.product.create({
      data: {
        name: `Offer Para Azithromycin ${Date.now()}`,
        slug: `offer-azithro-${Date.now()}`,
        genericName: 'Azithromycin',
        companyId: testCompany.id,
        dosageForm: 'Capsule',
        strength: '500mg',
        mrp: 120.0,
        unit: 'Box (30 caps)',
        category: 'Allopathic',
        isOfferParaLiveStock: true,
        offerParaStockQty: 100,
        offerParaDisplayMode: 'EXACT_COUNT',
        wholesaleMoq: 1,
        isReturnable: true,
      },
    });

    // Setup Regular Paikari Product (Opaque Stock)
    regularPaikariProduct = await prisma.product.create({
      data: {
        name: `Paikari Paracetamol ${Date.now()}`,
        slug: `paikari-para-${Date.now()}`,
        genericName: 'Paracetamol',
        companyId: testCompany.id,
        dosageForm: 'Tablet',
        strength: '500mg',
        mrp: 35.0,
        unit: 'Strip (10 tabs)',
        category: 'Allopathic',
        isOfferParaLiveStock: false,
        isPharmaTrackOpaque: true,
        wholesaleMoq: 1,
        isReturnable: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // Requirement 1: Stock intake, live quantity, total valuation at cost & margin
  // ---------------------------------------------------------------------------
  it('Requirement 1: records stock batch intakes with purchase cost and accurately calculates total valuation and profit margin', async () => {
    // 1. Intake Batch 1: 50 units @ ৳70 cost, ৳120 selling price, expires in 180 days
    const expiryFar = new Date();
    expiryFar.setDate(expiryFar.getDate() + 180);

    const batch1 = await stockService.createBatch(grantedWholesaler.id, {
      productId: offerParaProduct.id,
      batchNumber: `BAT-TEST-001-${Date.now()}`,
      initialQuantity: 50,
      purchaseCost: 70.0,
      sellingPrice: 120.0,
      wholesalePrice: 100.0,
      expiryDate: expiryFar.toISOString(),
      supplierName: 'Direct Depot Tongi',
      lowStockThreshold: 15,
    });

    expect(batch1.id).toBeDefined();
    expect(batch1.currentQuantity).toBe(50);
    expect(batch1.purchaseCost).toBe(70.0);

    // 2. Intake Batch 2: 30 units @ ৳65 cost, ৳120 selling price
    const batch2 = await stockService.createBatch(grantedWholesaler.id, {
      productId: offerParaProduct.id,
      batchNumber: `BAT-TEST-002-${Date.now()}`,
      initialQuantity: 30,
      purchaseCost: 65.0,
      sellingPrice: 120.0,
      wholesalePrice: 100.0,
      expiryDate: expiryFar.toISOString(),
      supplierName: 'Direct Depot Tongi',
      lowStockThreshold: 15,
    });

    expect(batch2.currentQuantity).toBe(30);

    // 3. Verify total valuation summary
    // Total units = 50 + 30 = 80
    // Total cost = (50 * 70) + (30 * 65) = 3500 + 1950 = 5450 BDT
    // Total potential revenue = 80 * 120 = 9600 BDT
    // Estimated profit = 9600 - 5450 = 4150 BDT
    const summary = await stockService.getInventorySummary(
      grantedWholesaler.id,
      AccountType.WHOLESALER_SELLER,
    );

    expect(summary.totalStockUnits).toBe(80);
    expect(summary.totalValuationAtCost).toBe(5450.0);
    expect(summary.totalPotentialRevenue).toBe(9600.0);
    expect(summary.estimatedNetProfit).toBe(4150.0);
    expect(summary.overallMarginPercent).toBeGreaterThan(40);
  });

  // ---------------------------------------------------------------------------
  // Requirement 2: Expiry-date alerts & low-stock alerts
  // ---------------------------------------------------------------------------
  it('Requirement 2: fires ahead-of-time expiry alerts and low-stock threshold warnings', async () => {
    // 1. Create an expiring soon batch (expires in 25 days) with low quantity (5 units <= threshold 10)
    const expiringSoonDate = new Date();
    expiringSoonDate.setDate(expiringSoonDate.getDate() + 25);

    await stockService.createBatch(grantedWholesaler.id, {
      productId: regularPaikariProduct.id,
      initialQuantity: 5, // Low stock <= 10
      purchaseCost: 20.0,
      sellingPrice: 35.0,
      wholesalePrice: 30.0,
      expiryDate: expiringSoonDate.toISOString(),
      lowStockThreshold: 10,
    });

    // 2. Query alerts
    const alerts = await stockService.getAlerts(
      grantedWholesaler.id,
      AccountType.WHOLESALER_SELLER,
      90,
    );

    // Expiry alerts check
    const expiringBatch = alerts.expiringBatches.find(
      (b) => b.productId === regularPaikariProduct.id,
    );
    expect(expiringBatch).toBeDefined();
    expect(expiringBatch?.daysUntilExpiry).toBeLessThanOrEqual(25);
    expect(expiringBatch?.urgencyLevel).toBe('CRITICAL');

    // Low stock alerts check
    const lowStockItem = alerts.lowStockProducts.find(
      (p) => p.productId === regularPaikariProduct.id,
    );
    expect(lowStockItem).toBeDefined();
    expect(lowStockItem?.currentQuantity).toBe(5);
    expect(lowStockItem?.lowStockThreshold).toBe(10);
  });

  // ---------------------------------------------------------------------------
  // Requirement 3: Multi-tenant access control and isolation
  // ---------------------------------------------------------------------------
  it('Requirement 3: strictly isolates grantee stock data while allowing Super Admin to view and grant access', async () => {
    // 1. Super Admin creates a batch under Admin account
    const expiryFar = new Date();
    expiryFar.setDate(expiryFar.getDate() + 200);

    const adminBatch = await stockService.createBatch(superAdminUser.id, {
      productId: offerParaProduct.id,
      initialQuantity: 100,
      purchaseCost: 50.0,
      sellingPrice: 120.0,
      wholesalePrice: 100.0,
      expiryDate: expiryFar.toISOString(),
    });

    // 2. Granted wholesaler queries their batches -> MUST NOT see Admin's batch
    const wholesalerBatches = await stockService.getBatches(
      grantedWholesaler.id,
      AccountType.WHOLESALER_SELLER,
    );
    expect(wholesalerBatches.some((b) => b.id === adminBatch.id)).toBe(false);

    // 3. Super Admin queries with filterOwnerId -> can inspect grantee's batches
    const adminInspectingWholesaler = await stockService.getBatches(
      superAdminUser.id,
      AccountType.SUPER_ADMIN,
      { filterOwnerId: grantedWholesaler.id },
    );
    expect(adminInspectingWholesaler.length).toBeGreaterThan(0);

    // 4. Admin grants access to ungrantedShopOwner
    const grantResult = await stockService.grantStockModuleAccess(
      superAdminUser.id,
      ungrantedShopOwner.id,
      true,
    );
    expect(grantResult.success).toBe(true);

    const updatedProfile = await prisma.customerProfile.findUnique({
      where: { userId: ungrantedShopOwner.id },
    });
    expect(updatedProfile?.hasStockModuleAccess).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Requirement 4: Retail & wholesale sale records, discount tiers, FIFO batch deduction & memo
  // ---------------------------------------------------------------------------
  it('Requirement 4: records retail sale with 8% discount tier, deducts batch stock FIFO, and computes exact profit margin', async () => {
    // 1. Execute a retail sale of 20 units with 8% discount
    const sale = await stockService.recordSale(grantedWholesaler.id, {
      saleType: 'RETAIL',
      customerName: 'Customer Walk-in Clinic',
      customerPhone: '01700112233',
      discountPercent: 8.0,
      items: [
        {
          productId: offerParaProduct.id,
          quantity: 20,
        },
      ],
      notes: 'Monthly clinic supply order',
    });

    expect(sale.id).toBeDefined();
    expect(sale.receiptNumber.startsWith('REC-2026-')).toBe(true);
    expect(sale.discountPercent).toBe(8.0);
    expect(sale.subtotal).toBe(2400.0); // 20 * 120 MRP
    expect(sale.discountAmount).toBe(192.0); // 8% of 2400
    expect(sale.totalAmount).toBe(2208.0); // 2400 - 192
    expect(sale.profitMargin).toBeGreaterThan(0);

    // 2. Verify FIFO batch deduction
    // Batch 1 had 50 units. After deducting 20 units, it should have 30 remaining.
    const batches = await prisma.stockBatch.findMany({
      where: { ownerId: grantedWholesaler.id, productId: offerParaProduct.id },
      orderBy: { expiryDate: 'asc' },
    });
    expect(batches[0].currentQuantity).toBe(30);
  });

  // ---------------------------------------------------------------------------
  // Requirement 5: Offer Para live pricing & Mixed-Order Memo Merging
  // ---------------------------------------------------------------------------
  it('Requirement 5: pure Offer Para order skips preliminary MRP memo, while mixed order produces a single merged final memo', async () => {
    // 1. Pure Offer Para Order (skips MRP preliminary memo -> straight to FINAL_TIERED)
    const pureOfferOrder = await ordersService.createPaikariOrder(
      ungrantedShopOwner.id,
      AccountType.PAIKARI_SELLER,
      {
        items: [
          {
            productId: offerParaProduct.id,
            unitType: UnitType.BOX,
            requestedQuantity: 5,
          },
        ],
        fulfillmentMethod: FulfillmentMethod.HOME_DELIVERY,
        paymentMethod: PaymentMethod.COD,
        deliveryAddress: 'Gazipur, Dhaka',
      },
    );

    expect(pureOfferOrder.sectorType).toBe('OFFER_PARA');
    expect(pureOfferOrder.memoState).toBe(MemoState.FINAL_TIERED);
    expect(pureOfferOrder.isFinalMemoPublished).toBe(true);
    expect(pureOfferOrder.items[0].isOfferPara).toBe(true);
    expect(pureOfferOrder.items[0].verificationStatus).toBe('FULL_STOCK');

    // 2. Mixed Order (1 Offer Para item + 1 Paikari item)
    const mixedOrder = await ordersService.createPaikariOrder(
      ungrantedShopOwner.id,
      AccountType.PAIKARI_SELLER,
      {
        items: [
          {
            productId: offerParaProduct.id,
            unitType: UnitType.BOX,
            requestedQuantity: 5,
          },
          {
            productId: regularPaikariProduct.id,
            unitType: UnitType.STRIP,
            requestedQuantity: 10,
          },
        ],
        fulfillmentMethod: FulfillmentMethod.HOME_DELIVERY,
        paymentMethod: PaymentMethod.COD,
        deliveryAddress: 'Gazipur, Dhaka',
      },
    );

    expect(mixedOrder.items.length).toBe(2);
    // Offer Para item is pre-verified
    const offerItem = mixedOrder.items.find((i) => i.productId === offerParaProduct.id);
    expect(offerItem?.isOfferPara).toBe(true);
    expect(offerItem?.verificationStatus).toBe('FULL_STOCK');

    // Paikari item requires staff verification
    const paikariItem = mixedOrder.items.find((i) => i.productId === regularPaikariProduct.id);
    expect(paikariItem?.isOfferPara).toBe(false);
    expect(paikariItem?.verificationStatus).toBe('PENDING');

    // 3. Staff verifies the Paikari item and publishes final memo
    await ordersService.verifyLineItem(mixedOrder.id, superAdminUser.id, {
      itemId: paikariItem!.id,
      status: 'FULL_STOCK' as any,
      confirmedQuantity: 10,
    });

    const publishedMemo = await ordersService.publishFinalMemo(
      mixedOrder.id,
      superAdminUser.id,
    );

    expect(publishedMemo.memoState).toBe(MemoState.FINAL_TIERED);
    expect(publishedMemo.isFinalMemoPublished).toBe(true);
    expect(publishedMemo.items.length).toBe(2);
    expect(publishedMemo.finalSubtotal).toBeGreaterThan(0);
  });
});
