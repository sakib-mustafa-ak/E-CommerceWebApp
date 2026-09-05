import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ReturnsService } from '../src/modules/returns/returns.service';
import { OrdersService } from '../src/modules/orders/orders.service';
import { EventsGateway } from '../src/modules/events/events.gateway';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  AccountType,
  FulfillmentMethod,
  PaymentMethod,
  UnitType,
  LineVerificationStatus,
  FulfillmentStatus,
  ReturnStatus,
} from '@siam-aqua/shared-types';

describe('Phase 2: Returns Management Engine Test Suite', () => {
  let prisma: PrismaClient;
  let returnsService: ReturnsService;
  let ordersService: OrdersService;
  let eventsGateway: EventsGateway;
  let auditService: AuditService;

  let paikariUser: any;
  let staffUser: any;
  let superAdminUser: any;
  let napa500: any;
  let offerParaProduct: any;
  let nonReturnableInjection: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    eventsGateway = new EventsGateway();
    auditService = new AuditService(prisma as any);
    ordersService = new OrdersService(prisma, eventsGateway, auditService);
    returnsService = new ReturnsService(prisma, eventsGateway, auditService);

    paikariUser = await prisma.user.findFirst({
      where: { email: 'paikari@alaminpharma.com' },
      include: { customerProfile: true },
    });
    staffUser = await prisma.user.findFirst({ where: { email: 'orderstaff@siamaqua.com' } });
    superAdminUser = await prisma.user.findFirst({ where: { email: 'admin@siamaqua.com' } });

    napa500 = await prisma.product.findFirst({ where: { name: 'Napa 500mg Tablet' } });
    offerParaProduct = await prisma.product.findFirst({ where: { isOfferParaLiveStock: true } });

    // Seed a non-returnable cold-chain medicine for testing
    const squareCompany = await prisma.company.findFirst({ where: { code: 'SQUARE' } });
    nonReturnableInjection = await prisma.product.upsert({
      where: { slug: 'insulin-cold-chain-square' },
      update: { isReturnable: false },
      create: {
        name: 'Insulin Rapid 100IU Injection',
        slug: 'insulin-cold-chain-square',
        genericName: 'Insulin Human',
        companyId: squareCompany!.id,
        dosageForm: 'Injection',
        strength: '100 IU/ml',
        mrp: 450.0,
        unit: 'Vial',
        category: 'Cold Chain Biologics',
        isReturnable: false, // Non-returnable!
      },
    });

    // Reset customer credit balance and return metrics for test isolation
    await prisma.customerProfile.update({
      where: { userId: paikariUser.id },
      data: {
        creditBalance: 0,
        totalReturnsCount: 0,
        totalReturnsValue: 0,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Requirement 1: enforces return window based on Confirmed Receipt Date (not order date)', async () => {
    // 1. Create and fulfill order
    const order = await ordersService.createPaikariOrder(
      paikariUser.id,
      AccountType.PAIKARI_SELLER,
      {
        items: [{ productId: napa500.id, unitType: UnitType.STRIP, requestedQuantity: 10 }],
        fulfillmentMethod: FulfillmentMethod.SELF_PICKUP,
        paymentMethod: PaymentMethod.COD,
      },
    );

    // Verify line and deliver order
    await ordersService.verifyLineItem(order.id, staffUser.id, {
      itemId: order.items[0].id,
      status: LineVerificationStatus.FULL_STOCK,
    });
    await ordersService.publishFinalMemo(order.id, staffUser.id);
    await ordersService.updateOrderStatus(order.id, staffUser.id, FulfillmentStatus.DELIVERED);

    // Test A: Delivered today -> Within 3-day window -> Return request succeeds
    const returnReq = await returnsService.createReturnRequest(
      paikariUser.id,
      AccountType.PAIKARI_SELLER,
      {
        orderId: order.id,
        items: [{ orderItemId: order.items[0].id, returnedQuantity: 2 }],
        reason: 'Customer cancelled prescription',
        voiceNoteUrl: 'blob:http://localhost:3000/audio-note-sample',
      },
    );

    expect(returnReq).toBeDefined();
    expect(returnReq.returnNumber).toMatch(/^RET-/);
    expect(returnReq.status).toBe(ReturnStatus.PENDING);
    expect(returnReq.totalRefundCredit).toBe(21); // 2 strips * 10.50 unit price

    // Test B: Simulate receipt date 5 days in the past (> 3 day window)
    const expiredReceiptDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    await prisma.order.update({
      where: { id: order.id },
      data: { confirmedReceiptAt: expiredReceiptDate },
    });

    await expect(
      returnsService.createReturnRequest(paikariUser.id, AccountType.PAIKARI_SELLER, {
        orderId: order.id,
        items: [{ orderItemId: order.items[0].id, returnedQuantity: 1 }],
        reason: 'Attempting expired return',
      }),
    ).rejects.toThrow(/Return window expired/);
  });

  it('Requirement 2: blocks return requests for non-returnable products', async () => {
    // 1. Create and deliver order with non-returnable insulin
    const order = await ordersService.createPaikariOrder(
      paikariUser.id,
      AccountType.PAIKARI_SELLER,
      {
        items: [{ productId: nonReturnableInjection.id, unitType: UnitType.PIECE, requestedQuantity: 2 }],
        fulfillmentMethod: FulfillmentMethod.SELF_PICKUP,
        paymentMethod: PaymentMethod.COD,
      },
    );

    await ordersService.verifyLineItem(order.id, staffUser.id, {
      itemId: order.items[0].id,
      status: LineVerificationStatus.FULL_STOCK,
    });
    await ordersService.publishFinalMemo(order.id, staffUser.id);
    await ordersService.updateOrderStatus(order.id, staffUser.id, FulfillmentStatus.DELIVERED);

    // 2. Attempt to request return on non-returnable product
    await expect(
      returnsService.createReturnRequest(paikariUser.id, AccountType.PAIKARI_SELLER, {
        orderId: order.id,
        items: [{ orderItemId: order.items[0].id, returnedQuantity: 1 }],
        reason: 'Cold chain item return attempt',
      }),
    ).rejects.toThrow(/non-returnable/);
  });

  it('Requirement 3, 6, 7: partial returns, staff manual review, customer account credit, and dual-inventory reversal', async () => {
    // Initial Offer Para stock count
    const initialOfferProduct = await prisma.product.findUnique({
      where: { id: offerParaProduct.id },
    });
    const initialOfferStock = initialOfferProduct?.offerParaStockQty || 0;

    // 1. Place and deliver order with 10 Offer Para items
    const order = await ordersService.createPaikariOrder(
      paikariUser.id,
      AccountType.PAIKARI_SELLER,
      {
        items: [{ productId: offerParaProduct.id, unitType: UnitType.PIECE, requestedQuantity: 10 }],
        fulfillmentMethod: FulfillmentMethod.SELF_PICKUP,
        paymentMethod: PaymentMethod.COD,
      },
    );

    await ordersService.publishFinalMemo(order.id, staffUser.id);
    await ordersService.updateOrderStatus(order.id, staffUser.id, FulfillmentStatus.DELIVERED);

    const orderItem = order.items[0];

    // 2. Customer requests PARTIAL return of 3 pieces (out of 10 purchased)
    const returnReq = await returnsService.createReturnRequest(
      paikariUser.id,
      AccountType.PAIKARI_SELLER,
      {
        orderId: order.id,
        items: [{ orderItemId: orderItem.id, returnedQuantity: 3 }],
        reason: 'Boxes slightly crushed during transit',
      },
    );

    expect(returnReq.items[0].returnedQuantity).toBe(3);
    expect(returnReq.status).toBe(ReturnStatus.PENDING);

    // 3. Staff reviews and APPROVES return in judgment queue
    const reviewedReturn = await returnsService.reviewReturnRequest(returnReq.id, staffUser.id, {
      approve: true,
      reviewNotes: 'Verified damaged packaging on 3 units, approved store credit.',
    });

    expect(reviewedReturn.status).toBe(ReturnStatus.APPROVED);
    expect(reviewedReturn.reviewedByStaffName).toBe(staffUser.name);

    // 4. Verify Customer Profile creditBalance is credited for NEXT memo
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: paikariUser.id },
    });
    expect(profile?.creditBalance).toBe(reviewedReturn.totalRefundCredit);
    expect(profile?.totalReturnsCount).toBe(1);

    // 5. Verify Offer Para live stock was reversed back into inventory (+3 units)
    const updatedOfferProduct = await prisma.product.findUnique({
      where: { id: offerParaProduct.id },
    });
    expect(updatedOfferProduct?.offerParaStockQty).toBe(initialOfferStock + 3);
  });

  it('Requirement 8: auto-flags products with high return rates for admin review', async () => {
    // Configure threshold = 2 for quick testing
    await prisma.platformSetting.upsert({
      where: { key: 'high_return_product_threshold' },
      create: { key: 'high_return_product_threshold', value: '2' },
      update: { value: '2' },
    });

    // Reset returnCount on napa500
    await prisma.product.update({
      where: { id: napa500.id },
      data: { returnCount: 0, isHighReturnRate: false, highReturnFlagReason: null },
    });

    // Create 2 returns on napa500 to trigger threshold
    for (let i = 0; i < 2; i++) {
      const order = await ordersService.createPaikariOrder(
        paikariUser.id,
        AccountType.PAIKARI_SELLER,
        {
          items: [{ productId: napa500.id, unitType: UnitType.STRIP, requestedQuantity: 5 }],
          fulfillmentMethod: FulfillmentMethod.SELF_PICKUP,
          paymentMethod: PaymentMethod.COD,
        },
      );
      await ordersService.verifyLineItem(order.id, staffUser.id, {
        itemId: order.items[0].id,
        status: LineVerificationStatus.FULL_STOCK,
      });
      await ordersService.publishFinalMemo(order.id, staffUser.id);
      await ordersService.updateOrderStatus(order.id, staffUser.id, FulfillmentStatus.DELIVERED);

      const ret = await returnsService.createReturnRequest(paikariUser.id, AccountType.PAIKARI_SELLER, {
        orderId: order.id,
        items: [{ orderItemId: order.items[0].id, returnedQuantity: 1 }],
        reason: 'Defective seal on blister',
      });
      await returnsService.reviewReturnRequest(ret.id, staffUser.id, { approve: true });
    }

    // Verify Napa 500 is auto-flagged as High Return Rate
    const flaggedProduct = await prisma.product.findUnique({ where: { id: napa500.id } });
    expect(flaggedProduct?.isHighReturnRate).toBe(true);
    expect(flaggedProduct?.highReturnFlagReason).toContain('High return rate: 2 returns recorded');

    // Verify it appears in high return products query
    const highReturnList = await returnsService.getHighReturnProducts();
    const found = highReturnList.find((p) => p.productId === napa500.id);
    expect(found).toBeDefined();
    expect(found?.isHighReturnRate).toBe(true);
  });

  it('Requirement 9: generates monthly return history and running balance summary for customer', async () => {
    const history = await returnsService.getCustomerReturnHistory(paikariUser.id);
    expect(history).toBeDefined();
    expect(history.customerId).toBe(paikariUser.id);
    expect(history.creditBalance).toBeGreaterThan(0);
    expect(history.totalReturnsCount).toBeGreaterThan(0);
    expect(history.monthlyBreakdown.length).toBeGreaterThan(0);
  });
});
