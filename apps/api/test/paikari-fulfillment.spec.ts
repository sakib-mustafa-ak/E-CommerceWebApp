import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
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
  MemoState,
  CancellationState,
  ShortListStatus,
} from '@siam-aqua/shared-types';

describe('Phase 1: Paikari Market Fulfillment & Multi-Staff Workflow Test Suite', () => {
  let prisma: PrismaClient;
  let ordersService: OrdersService;
  let eventsGateway: EventsGateway;
  let auditService: AuditService;

  let paikariUser: any;
  let staffUser1: any;
  let staffUser2: any;
  let superAdminUser: any;
  let napa500: any;
  let napaExtra: any;
  let offerParaProduct: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    eventsGateway = new EventsGateway();
    auditService = new AuditService(prisma as any);
    ordersService = new OrdersService(prisma, eventsGateway, auditService);

    // Fetch seeded users and products
    paikariUser = await prisma.user.findFirst({
      where: { email: 'paikari@alaminpharma.com' },
      include: { customerProfile: true },
    });
    staffUser1 = await prisma.user.findFirst({ where: { email: 'orderstaff@siamaqua.com' } });
    staffUser2 = await prisma.user.findFirst({ where: { email: 'wholesalestaff@siamaqua.com' } });
    superAdminUser = await prisma.user.findFirst({ where: { email: 'admin@siamaqua.com' } });

    napa500 = await prisma.product.findFirst({ where: { name: 'Napa 500mg Tablet' } });
    napaExtra = await prisma.product.findFirst({ where: { name: 'Napa Extra' } });
    offerParaProduct = await prisma.product.findFirst({ where: { isOfferParaLiveStock: true } });

    // Reset paikari user state for clean test isolation
    const tierB = await prisma.pricingTier.findFirst({ where: { code: 'TIER_B' } });
    await prisma.user.update({
      where: { id: paikariUser.id },
      data: { accountType: AccountType.PAIKARI_SELLER },
    });
    await prisma.customerProfile.update({
      where: { userId: paikariUser.id },
      data: {
        cancellationCount: 0,
        refusalCount: 0,
        isProblemCustomer: false,
        problemFlagReason: null,
        tierId: tierB?.id,
      },
    });
  });

  afterAll(async () => {
    // Restore default seed state
    const tierB = await prisma.pricingTier.findFirst({ where: { code: 'TIER_B' } });
    await prisma.user.update({
      where: { id: paikariUser.id },
      data: { accountType: AccountType.PAIKARI_SELLER },
    });
    await prisma.customerProfile.update({
      where: { userId: paikariUser.id },
      data: {
        cancellationCount: 0,
        refusalCount: 0,
        isProblemCustomer: false,
        problemFlagReason: null,
        tierId: tierB?.id,
      },
    });
    await prisma.$disconnect();
  });

  it('Requirement 1 & 2: places Paikari order with Piece/Strip/Box units and generates Preliminary MRP Memo', async () => {
    const orderResponse = await ordersService.createPaikariOrder(
      paikariUser.id,
      AccountType.PAIKARI_SELLER,
      {
        items: [
          { productId: napa500.id, unitType: UnitType.STRIP, requestedQuantity: 50 },
          { productId: napaExtra.id, unitType: UnitType.BOX, requestedQuantity: 20 },
          { productId: offerParaProduct.id, unitType: UnitType.PIECE, requestedQuantity: 10 },
        ],
        fulfillmentMethod: FulfillmentMethod.HOME_DELIVERY,
        deliveryAddress: 'Mirpur-10, Dhaka',
        paymentMethod: PaymentMethod.COD,
        orderNotes: 'Urgent delivery needed by 2 PM',
      },
    );

    expect(orderResponse).toBeDefined();
    expect(orderResponse.orderNumber).toMatch(/^PKR-/);
    expect(orderResponse.memoState).toBe(MemoState.PRELIMINARY_MRP);
    expect(orderResponse.isFinalMemoPublished).toBe(false);

    // Napa 500 MRP is 12, Napa Extra MRP is 35, Offer Para MRP is 150
    // Expected Preliminary Subtotal = (50 * 12) + (20 * 35) + (10 * 150) = 600 + 700 + 1500 = 2800
    expect(orderResponse.preliminarySubtotal).toBe(2800);

    // Shop free delivery threshold is 1500 (from seed), 2800 >= 1500 -> free delivery!
    expect(orderResponse.deliveryFee).toBe(0);
    expect(orderResponse.totalAmount).toBe(2800);

    // Offer Para items skip 3-step verification and are auto-confirmed in full
    const offerItem = orderResponse.items.find((i) => i.productId === offerParaProduct.id);
    expect(offerItem?.isOfferPara).toBe(true);
    expect(offerItem?.verificationStatus).toBe(LineVerificationStatus.FULL_STOCK);
    expect(offerItem?.confirmedQuantity).toBe(10);

    // Regular pharmacy items start in PENDING verification state
    const regularItem = orderResponse.items.find((i) => i.productId === napa500.id);
    expect(regularItem?.isOfferPara).toBe(false);
    expect(regularItem?.verificationStatus).toBe(LineVerificationStatus.PENDING);
    expect(regularItem?.confirmedQuantity).toBe(0);
  });

  it('Requirement 3, 4, 5: multi-staff concurrent verification, live socket updates, and PharmaTrack short list creation', async () => {
    // 1. Create a test order
    const order = await ordersService.createPaikariOrder(
      paikariUser.id,
      AccountType.PAIKARI_SELLER,
      {
        items: [
          { productId: napa500.id, unitType: UnitType.STRIP, requestedQuantity: 100 },
          { productId: napaExtra.id, unitType: UnitType.STRIP, requestedQuantity: 50 },
        ],
        fulfillmentMethod: FulfillmentMethod.SELF_PICKUP,
        paymentMethod: PaymentMethod.BKASH,
      },
    );

    const napa500Item = order.items.find((i) => i.productId === napa500.id)!;
    const napaExtraItem = order.items.find((i) => i.productId === napaExtra.id)!;

    // 2. Staff 1 verifies Napa 500 as PARTIAL stock (70 out of 100 available)
    const verified1 = await ordersService.verifyLineItem(order.id, staffUser1.id, {
      itemId: napa500Item.id,
      status: LineVerificationStatus.PARTIAL_STOCK,
      confirmedQuantity: 70,
    });

    const updatedNapa500 = verified1.items.find((i) => i.id === napa500Item.id)!;
    expect(updatedNapa500.verificationStatus).toBe(LineVerificationStatus.PARTIAL_STOCK);
    expect(updatedNapa500.confirmedQuantity).toBe(70);
    expect(updatedNapa500.fulfilledByStaffName).toBe(staffUser1.name);

    // 3. Staff 2 concurrently verifies Napa Extra as NONE_AVAILABLE
    const verified2 = await ordersService.verifyLineItem(order.id, staffUser2.id, {
      itemId: napaExtraItem.id,
      status: LineVerificationStatus.NONE_AVAILABLE,
    });

    const updatedNapaExtra = verified2.items.find((i) => i.id === napaExtraItem.id)!;
    expect(updatedNapaExtra.verificationStatus).toBe(LineVerificationStatus.NONE_AVAILABLE);
    expect(updatedNapaExtra.confirmedQuantity).toBe(0);
    expect(updatedNapaExtra.fulfilledByStaffName).toBe(staffUser2.name);

    // 4. Verify that NONE_AVAILABLE item automatically entered PharmaTrack short list demand log
    const shortList = await ordersService.getPharmaTrackShortList(ShortListStatus.OPEN);
    const shortListItem = shortList.find((s) => s.orderId === order.id && s.productId === napaExtra.id);
    expect(shortListItem).toBeDefined();
    expect(shortListItem?.productName).toContain('Napa Extra');
    expect(shortListItem?.requestedQuantity).toBe(50);
    expect(shortListItem?.shopName).toContain('Al-Amin');
  });

  it('Requirement 7: staff line manual price override and Final Tiered Memo generation', async () => {
    const order = await ordersService.createPaikariOrder(
      paikariUser.id,
      AccountType.PAIKARI_SELLER,
      {
        items: [
          { productId: napa500.id, unitType: UnitType.STRIP, requestedQuantity: 100 },
        ],
        fulfillmentMethod: FulfillmentMethod.SELF_PICKUP,
        paymentMethod: PaymentMethod.COD,
      },
    );

    const item = order.items[0];
    await ordersService.verifyLineItem(order.id, staffUser1.id, {
      itemId: item.id,
      status: LineVerificationStatus.FULL_STOCK,
    });

    // Staff performs manual price override (e.g. costs fluctuated, override unit price to 10.20 BDT)
    const overridden = await ordersService.overrideLineItemPrice(order.id, staffUser1.id, {
      itemId: item.id,
      manualPrice: 10.2,
    });

    const overriddenItem = overridden.items.find((i) => i.id === item.id)!;
    expect(overriddenItem.manualPriceOverrideByStaff).toBe(10.2);
    expect(overriddenItem.finalUnitPrice).toBe(10.2);
    expect(overriddenItem.totalPrice).toBe(1020); // 100 * 10.20

    // Staff publishes Final Memo
    const finalMemo = await ordersService.publishFinalMemo(order.id, staffUser1.id);
    expect(finalMemo.memoState).toBe(MemoState.FINAL_TIERED);
    expect(finalMemo.isFinalMemoPublished).toBe(true);
    expect(finalMemo.finalSubtotal).toBe(1020);
    expect(finalMemo.fulfillmentStatus).toBe(FulfillmentStatus.PACKED);

    // Preliminary MRP memo (100 * 12 = 1200) vs Final Tiered memo (1020) are visibly and correctly different
    expect(finalMemo.preliminarySubtotal).toBe(1200);
    expect(finalMemo.finalSubtotal).toBe(1020);
    expect(finalMemo.preliminarySubtotal).not.toBe(finalMemo.finalSubtotal);
  });

  it('Requirement 8: staff can add more items to an existing in-progress order', async () => {
    const order = await ordersService.createPaikariOrder(
      paikariUser.id,
      AccountType.PAIKARI_SELLER,
      {
        items: [{ productId: napa500.id, unitType: UnitType.STRIP, requestedQuantity: 10 }],
        fulfillmentMethod: FulfillmentMethod.SELF_PICKUP,
        paymentMethod: PaymentMethod.COD,
      },
    );

    expect(order.items.length).toBe(1);

    // Staff adds Napa Extra to this order via phone request
    const updated = await ordersService.addItemsToOrder(order.id, staffUser1.id, {
      items: [{ productId: napaExtra.id, unitType: UnitType.STRIP, requestedQuantity: 25 }],
    });

    expect(updated.items.length).toBe(2);
    const addedItem = updated.items.find((i) => i.productId === napaExtra.id);
    expect(addedItem).toBeDefined();
    expect(addedItem?.requestedQuantity).toBe(25);
    expect(addedItem?.verificationStatus).toBe(LineVerificationStatus.PENDING);
  });

  it('Requirement 12 & 13: 3-State cancellation lifecycle and auto-flagging repeat problem customers', async () => {
    // STATE 1: Cancel before staff picks up (PENDING) -> Instant outright cancel
    const order1 = await ordersService.createPaikariOrder(
      paikariUser.id,
      AccountType.PAIKARI_SELLER,
      {
        items: [{ productId: napa500.id, unitType: UnitType.STRIP, requestedQuantity: 10 }],
        fulfillmentMethod: FulfillmentMethod.SELF_PICKUP,
        paymentMethod: PaymentMethod.COD,
      },
    );

    const cancelled1 = await ordersService.requestOrExecuteCancellation(
      order1.id,
      paikariUser.id,
      AccountType.PAIKARI_SELLER,
      'Ordered by mistake',
    );
    expect(cancelled1.fulfillmentStatus).toBe(FulfillmentStatus.CANCELLED);
    expect(cancelled1.cancellationState).toBe(CancellationState.APPROVED);

    // STATE 2: Staff started fulfillment (VERIFYING) -> Request banner for staff approval
    const order2 = await ordersService.createPaikariOrder(
      paikariUser.id,
      AccountType.PAIKARI_SELLER,
      {
        items: [{ productId: napa500.id, unitType: UnitType.STRIP, requestedQuantity: 10 }],
        fulfillmentMethod: FulfillmentMethod.SELF_PICKUP,
        paymentMethod: PaymentMethod.COD,
      },
    );

    // Staff verifies line
    await ordersService.verifyLineItem(order2.id, staffUser1.id, {
      itemId: order2.items[0].id,
      status: LineVerificationStatus.FULL_STOCK,
    });

    // Customer requests cancellation while staff is in progress
    const requested = await ordersService.requestOrExecuteCancellation(
      order2.id,
      paikariUser.id,
      AccountType.PAIKARI_SELLER,
      'Need to cancel order',
    );
    expect(requested.fulfillmentStatus).toBe(FulfillmentStatus.VERIFYING);
    expect(requested.cancellationState).toBe(CancellationState.REQUESTED);

    // Staff approves cancellation request
    const approvedByStaff = await ordersService.respondToCancellationRequest(
      order2.id,
      staffUser1.id,
      true,
      'Approved as goods not yet packed',
    );
    expect(approvedByStaff.fulfillmentStatus).toBe(FulfillmentStatus.CANCELLED);
    expect(approvedByStaff.cancellationState).toBe(CancellationState.APPROVED);

    // STATE 3: Refused at delivery -> Full refund/return case & logs strike
    const order3 = await ordersService.createPaikariOrder(
      paikariUser.id,
      AccountType.PAIKARI_SELLER,
      {
        items: [{ productId: napa500.id, unitType: UnitType.STRIP, requestedQuantity: 10 }],
        fulfillmentMethod: FulfillmentMethod.HOME_DELIVERY,
        paymentMethod: PaymentMethod.COD,
      },
    );

    const refused = await ordersService.handleRefusedDelivery(
      order3.id,
      staffUser1.id,
      'Shop was closed upon delivery arrival',
    );
    expect(refused.fulfillmentStatus).toBe(FulfillmentStatus.REFUSED_DELIVERY);
    expect(refused.cancellationState).toBe(CancellationState.REFUSED_AT_DELIVERY);

    // Verify repeat problem customer auto-flagging (threshold is 3 strikes, we created 3 strikes)
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: paikariUser.id },
    });
    expect(profile?.isProblemCustomer).toBe(true);
    expect(profile?.problemFlagReason).toContain('Auto-flagged');
    expect(profile?.problemFlagReason).toContain('cancellations/refusals');
  });

  it('Requirement 18: customer ranking dashboard and 1-Click "Upgrade to Wholesaler"', async () => {
    const rankings = await ordersService.getCustomerRankings();
    expect(rankings.length).toBeGreaterThan(0);

    const paikariRank = rankings.find((r) => r.customerId === paikariUser.id);
    expect(paikariRank).toBeDefined();
    expect(paikariRank?.shopName).toContain('Al-Amin');
    expect(paikariRank?.isProblemCustomer).toBe(true);

    // Admin executes 1-click Upgrade to Wholesaler
    const upgradeResult = await ordersService.upgradeCustomerToWholesaler(
      paikariUser.id,
      superAdminUser.id,
    );
    expect(upgradeResult.success).toBe(true);

    // Verify account type switched to WHOLESALER_SELLER with TIER_A pricing
    const updatedUser = await prisma.user.findUnique({
      where: { id: paikariUser.id },
      include: { customerProfile: { include: { tier: true } } },
    });
    expect(updatedUser?.accountType).toBe(AccountType.WHOLESALER_SELLER);
    expect(updatedUser?.customerProfile?.tier.code).toBe('TIER_A');

    // Reset account type for future test runs
    const tierB = await prisma.pricingTier.findFirst({ where: { code: 'TIER_B' } });
    await prisma.user.update({
      where: { id: paikariUser.id },
      data: { accountType: AccountType.PAIKARI_SELLER },
    });
    await prisma.customerProfile.update({
      where: { userId: paikariUser.id },
      data: { tierId: tierB?.id },
    });
  });
});
