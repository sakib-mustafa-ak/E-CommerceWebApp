import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ResellerService } from '../src/modules/reseller/reseller.service';
import { PublicService } from '../src/modules/public/public.service';
import { ReturnsService } from '../src/modules/returns/returns.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { AccountType, ResellerBrandingMode } from '@siam-aqua/shared-types';

describe('Phase 7: Wholesalers Reselling to the Public Test Suite', () => {
  let prisma: PrismaClient;
  let resellerService: ResellerService;
  let publicService: PublicService;
  let returnsService: ReturnsService;
  let auditService: AuditService;

  let adminUser: any;
  let wholesalerUser: any;
  let publicUser: any;
  let testCompany: any;
  let testProduct: any;
  let defaultTier: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    auditService = new AuditService(prisma as any);
    resellerService = new ResellerService(prisma as any, auditService);
    publicService = new PublicService(prisma as any);
    const mockEventsGateway = { server: { emit: () => {}, to: () => ({ emit: () => {} }) } };
    returnsService = new ReturnsService(prisma as any, mockEventsGateway as any, auditService);

    const suffix = Date.now();

    // 1. Tier
    defaultTier = await prisma.pricingTier.upsert({
      where: { code: 'TIER_A' },
      update: {},
      create: {
        code: 'TIER_A',
        name: 'Standard Wholesaler Tier A',
        defaultValue: 0,
      },
    });

    // 2. Admin User
    adminUser = await prisma.user.create({
      data: {
        email: `admin_reseller_${suffix}@siamaqua.com`,
        passwordHash: 'dummy_hash',
        name: 'Siam Admin Reseller Desk',
        accountType: AccountType.SUPER_ADMIN,
      },
    });

    // 3. Wholesaler User with Reseller Profile
    wholesalerUser = await prisma.user.create({
      data: {
        email: `wholesaler_${suffix}@distributors.com`,
        passwordHash: 'dummy_hash',
        name: 'Kalam Wholesaler Boss',
        accountType: AccountType.WHOLESALER_SELLER,
        customerProfile: {
          create: {
            shopName: 'City Pharma Distributors Ltd',
            ownerName: 'Abul Kalam',
            address: 'Mitford Road, Dhaka',
            tierId: defaultTier.id,
            isPublicResellerEnabled: true,
            resellerCommissionRate: 2.0, // 2% platform commission
            resellerDefaultBranding: ResellerBrandingMode.WHITE_LABEL,
          },
        },
      },
      include: { customerProfile: true },
    });

    // 4. Public Customer
    publicUser = await prisma.user.create({
      data: {
        email: `public_customer_${suffix}@gmail.com`,
        passwordHash: 'dummy_hash',
        name: 'Sadia Rahman Consumer',
        accountType: AccountType.PUBLIC_USER,
      },
    });

    // 5. Test Company & Product
    testCompany = await prisma.company.upsert({
      where: { code: `SQUARE_${suffix}` },
      update: {},
      create: {
        code: `SQUARE_${suffix}`,
        name: `Square Pharmaceuticals ${suffix}`,
      },
    });

    testProduct = await prisma.product.create({
      data: {
        name: `Napa Extra 500mg/65mg ${suffix}`,
        slug: `napa-extra-reseller-${suffix}`,
        genericName: 'Paracetamol + Caffeine',
        companyId: testCompany.id,
        dosageForm: 'Tablet',
        strength: '500mg + 65mg',
        mrp: 550.0,
        unit: 'Box (100 tabs)',
        category: 'OTC',
        productType: 'PHYSICAL',
        isReturnable: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Commission Math: Wholesaler specifies net price (৳500) and platform adds 2% commission on top (৳510)', async () => {
    const listing = await resellerService.createPublicListing(wholesalerUser.id, {
      productId: testProduct.id,
      wholesalerBasePrice: 500.0,
      stockQuantity: 10,
      brandingMode: ResellerBrandingMode.WHITE_LABEL,
    });

    expect(listing.wholesalerBasePrice).toBe(500.0);
    expect(listing.commissionRate).toBe(2.0);
    expect(listing.commissionAmount).toBe(10.0);
    expect(listing.calculatedPublicPrice).toBe(510.0);
    expect(listing.stockQuantity).toBe(10);
    expect(listing.brandingMode).toBe(ResellerBrandingMode.WHITE_LABEL);
    expect(listing.sellerDisplayName).toBe("Siam's Aqua Verified Store");
    expect(listing.status).toBe('PENDING_REVIEW'); // Approval gate
  });

  it('2. Admin Approval Gate: Listing is hidden from public catalog until approved by Admin', async () => {
    // Before approval
    let activePublicListings = await resellerService.getPublicActiveListings(testProduct.id);
    expect(activePublicListings.length).toBe(0);

    // Get listing from review queue
    const queue = await resellerService.getAdminReviewQueue({ status: 'PENDING_REVIEW' });
    const pendingListing = queue.find((l) => l.productId === testProduct.id);
    expect(pendingListing).toBeDefined();

    // Admin approves listing
    const approved = await resellerService.reviewListing(
      pendingListing!.id,
      {
        status: 'APPROVED',
        reviewNotes: 'Verified stock inventory and pricing structure.',
      },
      adminUser,
    );

    expect(approved.status).toBe('APPROVED');

    // After approval: visible to public buyers
    activePublicListings = await resellerService.getPublicActiveListings(testProduct.id);
    expect(activePublicListings.length).toBe(1);
    expect(activePublicListings[0].calculatedPublicPrice).toBe(510.0);
  });

  it('3. Branding Mode: White-label vs Wholesaler Brand displays correct attribution', async () => {
    // Create second listing with WHOLESALER_BRAND
    const brandedListing = await resellerService.createPublicListing(wholesalerUser.id, {
      productId: testProduct.id,
      wholesalerBasePrice: 480.0,
      stockQuantity: 5,
      brandingMode: ResellerBrandingMode.WHOLESALER_BRAND,
    });

    expect(brandedListing.sellerDisplayName).toBe('Sold by City Pharma Distributors Ltd');

    // Admin approves it
    await resellerService.reviewListing(
      brandedListing.id,
      { status: 'APPROVED' },
      adminUser,
    );

    const publicView = await resellerService.getPublicActiveListings(testProduct.id);
    const brandedItem = publicView.find((l) => l.id === brandedListing.id);
    expect(brandedItem?.sellerDisplayName).toBe('Sold by City Pharma Distributors Ltd');
  });

  it('4. Reseller Public Checkout: Decrements inventory, logs running ledger entry, and accumulates wholesaler profile volume', async () => {
    // Buyer purchases 2 units via public checkout
    const checkoutResult = await publicService.checkout(
      {
        items: [{ productId: testProduct.id, quantity: 2 }],
        paymentMethod: 'BKASH',
        fulfillmentMethod: 'HOME_DELIVERY',
        deliveryAddress: 'House 42, Road 11, Banani, Dhaka',
      },
      publicUser.id,
    );

    expect(checkoutResult.orderNumber).toBeDefined();

    // Check running commission ledger
    const ledger = await resellerService.getCommissionLedger(wholesalerUser.id);
    expect(ledger.entries.length).toBeGreaterThanOrEqual(1);

    const saleEntry = ledger.entries.find((e) => e.orderId === checkoutResult.orderId);
    expect(saleEntry).toBeDefined();
    expect(saleEntry?.entryType).toBe('SALE_COMMISSION');
    expect(saleEntry?.quantity).toBe(2);
    expect(saleEntry?.wholesalerBaseAmount).toBe(1000.0); // ৳500 * 2
    expect(saleEntry?.platformCommission).toBe(20.0); // ৳10 * 2
    expect(saleEntry?.grossAmount).toBe(1020.0); // ৳510 * 2

    // Check Wholesaler CustomerProfile accumulated stats
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: wholesalerUser.id },
    });
    expect(profile?.totalResellerSalesCount).toBeGreaterThanOrEqual(1);
    expect(profile?.totalResellerGrossVolume).toBeGreaterThanOrEqual(1020.0);
    expect(profile?.totalResellerCommissionEarned).toBeGreaterThanOrEqual(20.0);
    expect(profile?.totalResellerNetOwed).toBeGreaterThanOrEqual(1000.0);
  });

  it('5. Returns Integration: Approved return reverses reseller commission, deducts payout, and restores stock', async () => {
    // 1. Fetch order item created in checkout
    const order = await prisma.order.findFirst({
      where: { userId: publicUser.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(order).toBeDefined();
    const orderItem = order!.items[0];

    // Mark order complete sale and received so return is allowed
    await prisma.order.update({
      where: { id: order!.id },
      data: {
        platformStatus: 'COMPLETE_SALE',
        fulfillmentStatus: 'DELIVERED',
        confirmedReceiptAt: new Date(),
      },
    });

    // 2. Request Partial Return of 1 unit
    const returnReq = await returnsService.createReturnRequest(
      publicUser.id,
      AccountType.PUBLIC_USER,
      {
        orderId: order!.id,
        reason: 'Customer ordered 1 excess box by mistake',
        items: [{ orderItemId: orderItem.id, returnedQuantity: 1 }],
      },
    );

    // 3. Admin reviews and approves return
    const approvedReturn = await returnsService.reviewReturnRequest(
      returnReq.id,
      adminUser.id,
      {
        approve: true,
        reviewNotes: 'Approved partial box return.',
      },
    );

    expect(approvedReturn.status).toBe('APPROVED');

    // 4. Verify Ledger Reversal Entry
    const ledger = await resellerService.getCommissionLedger(wholesalerUser.id);
    const reversalEntry = ledger.entries.find(
      (e) => e.entryType === 'RETURN_COMMISSION_REVERSAL' && e.orderId === order!.id,
    );

    expect(reversalEntry).toBeDefined();
    expect(reversalEntry?.quantity).toBe(1);
    expect(reversalEntry?.wholesalerBaseAmount).toBe(-500.0);
    expect(reversalEntry?.platformCommission).toBe(-10.0);
    expect(reversalEntry?.grossAmount).toBe(-510.0);
  });

  it('6. Monthly Statement Settlement Flow: Generates monthly statement and handles Acknowledge / Dispute reconciliation', async () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Admin generates statement
    const statement = await resellerService.generateMonthlyStatement(
      wholesalerUser.id,
      currentYear,
      currentMonth,
      adminUser,
    );

    expect(statement.statementNumber).toMatch(/^STMT-/);
    expect(statement.billingPeriodYear).toBe(currentYear);
    expect(statement.billingPeriodMonth).toBe(currentMonth);
    expect(statement.totalSalesCount).toBeGreaterThanOrEqual(1);
    expect(statement.totalReturnsDeduction).toBe(500.0);
    expect(statement.closingBalance).toBe(500.0); // ৳1000 sale - ৳500 return deduction
    expect(statement.status).toBe('PENDING_RECONCILIATION');

    // Wholesaler acknowledges statement (paid offline)
    const acknowledged = await resellerService.reconcileStatement(
      statement.id,
      wholesalerUser.id,
      {
        status: 'ACKNOWLEDGED_PAID',
        note: 'Funds received via bank transfer. Statement acknowledged.',
      },
    );

    expect(acknowledged.status).toBe('ACKNOWLEDGED_PAID');
    expect(acknowledged.wholesalerNote).toContain('Funds received');

    // Admin marks statement SETTLED
    const settled = await resellerService.adminSettleStatement(
      statement.id,
      adminUser,
      'Bank transaction TRX-99281 verified by accounts desk.',
    );

    expect(settled.status).toBe('SETTLED');
    expect(settled.adminSettlementNote).toContain('TRX-99281');
  });
});
