import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { MpoService } from '../src/modules/mpo/mpo.service';
import { CatalogService } from '../src/modules/catalog/catalog.service';
import {
  AccountType,
} from '@siam-aqua/shared-types';

describe('Phase 5: MPO Market, Pre-Orders & All Companies Integration Test Suite', () => {
  let prisma: PrismaClient;
  let mpoService: MpoService;
  let catalogService: CatalogService;

  let superAdminUser: any;
  let wholesalerUser: any;
  let wholesalerUser2: any;
  let testCompanyA: any;
  let testCompanyB: any;
  let product1: any;
  let product2: any;
  let createdMpo1: any;
  let createdMpo2: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    mpoService = new MpoService(prisma as any);
    catalogService = new CatalogService(prisma as any, {
      search: async () => ({ results: [], total: 0, page: 1, limit: 10, totalPages: 1 }),
      findGenericAlternatives: async () => ({ originalProduct: null as any, exactGenericMatches: [], therapeuticAlternatives: [] }),
      getGenericDetails: async () => null,
    } as any);

    const suffix = Date.now();

    // Setup Test Companies
    testCompanyA = await prisma.company.upsert({
      where: { code: `SQUARE_PHARMA_${suffix}` },
      update: {},
      create: {
        code: `SQUARE_PHARMA_${suffix}`,
        name: `Square Pharmaceuticals Ltd ${suffix}`,
      },
    });

    testCompanyB = await prisma.company.upsert({
      where: { code: `BEXIMCO_PHARMA_${suffix}` },
      update: {},
      create: {
        code: `BEXIMCO_PHARMA_${suffix}`,
        name: `Beximco Pharmaceuticals Ltd ${suffix}`,
      },
    });

    // Setup Test Products
    product1 = await prisma.product.create({
      data: {
        name: `Napa Extra 500mg ${suffix}`,
        slug: `napa-extra-500mg-${suffix}`,
        genericName: 'Paracetamol + Caffeine',
        companyId: testCompanyA.id,
        dosageForm: 'Tablet',
        strength: '500mg + 65mg',
        mrp: 35.0,
        unit: 'Strip (10 tabs)',
        category: 'Allopathic',
      },
    });

    product2 = await prisma.product.create({
      data: {
        name: `Napa Rapid 500mg ${suffix}`,
        slug: `napa-rapid-500mg-${suffix}`,
        genericName: 'Paracetamol',
        companyId: testCompanyA.id,
        dosageForm: 'Tablet',
        strength: '500mg',
        mrp: 25.0,
        unit: 'Strip (10 tabs)',
        category: 'Allopathic',
      },
    });

    // Setup Admin
    superAdminUser = await prisma.user.create({
      data: {
        email: `admin_mpo_${suffix}@siamaqua.com`,
        passwordHash: 'dummy_hash',
        name: 'Super Admin MPO Manager',
        accountType: AccountType.SUPER_ADMIN,
      },
    });

    // Setup Wholesalers
    const tier = await prisma.pricingTier.upsert({
      where: { code: 'TIER_A' },
      update: {},
      create: {
        code: 'TIER_A',
        name: 'Tier A Wholesale',
        defaultRateType: 'PERCENTAGE',
        defaultValue: 15.0,
      },
    });

    wholesalerUser = await prisma.user.create({
      data: {
        email: `wholesaler1_${suffix}@siamaqua.com`,
        passwordHash: 'dummy_hash',
        name: 'City Wholesale Enterprise',
        accountType: AccountType.WHOLESALER_SELLER,
        customerProfile: {
          create: {
            shopName: 'City Wholesale Enterprise',
            ownerName: 'City Wholesaler',
            address: 'Mitford, Dhaka',
            tierId: tier.id,
          },
        },
      },
    });

    wholesalerUser2 = await prisma.user.create({
      data: {
        email: `wholesaler2_${suffix}@siamaqua.com`,
        passwordHash: 'dummy_hash',
        name: 'Apex Pharma Distributors',
        accountType: AccountType.WHOLESALER_SELLER,
        customerProfile: {
          create: {
            shopName: 'Apex Pharma Distributors',
            ownerName: 'Apex Owner',
            address: 'Chittagong Port',
            tierId: tier.id,
          },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // TEST 1: Admin Creates MPO Accounts & Sequential Anonymous Labeling
  it('1. Should allow Admin to create MPO accounts with sequential anonymous labels and product subsets', async () => {
    const mpo1Dto = {
      name: 'Rahim Medical Rep',
      email: `mpo1_${Date.now()}@squarepharma.com`,
      phone: `01711${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'SecureMpoPassword123!',
      territory: 'Dhaka South - Dhanmondi',
      adminPrivateNotes: 'Represents Square Pharma in Dhanmondi. High quota performer.',
      assignedCompanyIds: [testCompanyA.id],
      selectedProductIds: [product1.id, product2.id],
    };

    createdMpo1 = await mpoService.createMpoAccount(mpo1Dto, superAdminUser.id);
    expect(createdMpo1).toBeDefined();
    expect(createdMpo1.territory).toBe('Dhaka South - Dhanmondi');
    expect(createdMpo1.anonymousLabel).toMatch(/^Anonymous \d+ \(Siam's Aqua Store\)$/);
    expect(createdMpo1.assignedCompanies.length).toBe(1);
    expect(createdMpo1.selectedProducts.length).toBe(2);

    const mpo2Dto = {
      name: 'Karim Pharma Rep',
      email: `mpo2_${Date.now()}@beximco.com`,
      phone: `01811${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'SecureMpoPassword123!',
      territory: 'Chittagong Central',
      adminPrivateNotes: 'Represents Beximco. Sells excess quota monthly.',
      assignedCompanyIds: [testCompanyB.id],
      selectedProductIds: [],
    };

    createdMpo2 = await mpoService.createMpoAccount(mpo2Dto, superAdminUser.id);
    expect(createdMpo2).toBeDefined();
    expect(createdMpo2.territory).toBe('Chittagong Central');
  });

  // TEST 2: Territory Auto-Grouping & Dynamic Updates
  it('2. Should automatically group MPOs by territory and reflect updates dynamically', async () => {
    const groups = await mpoService.getTerritoriesGrouping();
    expect(groups.length).toBeGreaterThanOrEqual(2);

    const dhakaGroup = groups.find((g) => g.territory === 'Dhaka South - Dhanmondi');
    expect(dhakaGroup).toBeDefined();
    expect(dhakaGroup?.mpoCount).toBeGreaterThanOrEqual(1);

    const ctgGroup = groups.find((g) => g.territory === 'Chittagong Central');
    expect(ctgGroup).toBeDefined();
    expect(ctgGroup?.mpoCount).toBeGreaterThanOrEqual(1);

    // Update MPO 2 territory to Dhaka South - Dhanmondi
    await mpoService.updateMpoProfile(createdMpo2.id, {
      territory: 'Dhaka South - Dhanmondi',
    });

    const updatedGroups = await mpoService.getTerritoriesGrouping();
    const updatedDhakaGroup = updatedGroups.find((g) => g.territory === 'Dhaka South - Dhanmondi');
    expect(updatedDhakaGroup?.mpoCount).toBeGreaterThanOrEqual(2);
  });

  // TEST 3: MPO Catalog Subset Filtering
  it('3. Should restrict MPO catalog view to their hand-picked subset', async () => {
    const subset = await mpoService.getMpoCatalogSubset(createdMpo1.userId);
    expect(subset.length).toBe(2);
    expect(subset.map((p) => p.id)).toContain(product1.id);
    expect(subset.map((p) => p.id)).toContain(product2.id);

    const searchedSubset = await mpoService.getMpoCatalogSubset(createdMpo1.userId, 'Extra');
    expect(searchedSubset.length).toBe(1);
    expect(searchedSubset[0].name).toContain('Extra');
  });

  // TEST 4: MPO Submits Stock Listing with Bonus Ratio
  let listing1: any;
  it('4. Should calculate bonus quantities from ratios (e.g. 10+2) on stock submission', async () => {
    const submission = await mpoService.createListing(createdMpo1.userId, {
      productId: product1.id,
      offeredQuantity: 50, // 50 items with 10+2 ratio => 5 sets of 2 = 10 bonus items
      bonusRatio: '10+2',
      mpoTargetPrice: 28.0,
    });

    expect(submission).toBeDefined();
    expect(submission.offeredQuantity).toBe(50);
    expect(submission.bonusQuantity).toBe(10);
    expect(submission.bonusRatio).toBe('10+2');
    expect(submission.status).toBe('PENDING_ADMIN_REVIEW');

    listing1 = submission;
  });

  // TEST 5: Admin Review & Multi-Channel Pricing Matrix
  it('5. Should allow Admin to review listing and configure channel visibility & wholesale pricing', async () => {
    const reviewed = await mpoService.reviewListing(superAdminUser.id, listing1.id, {
      status: 'APPROVED',
      isVisiblePublic: false,
      isVisiblePaikari: true,
      isVisibleWholesale: true,
      paikariUnitPrice: 31.0,
      wholesaleUnitPrice: 30.0,
    });

    expect(reviewed.status).toBe('APPROVED');
    expect(reviewed.isVisibleWholesale).toBe(true);
    expect(reviewed.wholesaleUnitPrice).toBe(30.0);
  });

  // TEST 6: Strict Anonymity & Wholesaler Bid Visibility Isolation
  it('6. Should enforce strict anonymity in wholesale feed and isolate wholesaler bids', async () => {
    const feedForW1 = await mpoService.getWholesaleFeed(wholesalerUser.id);
    expect(feedForW1.length).toBeGreaterThanOrEqual(1);

    const item = feedForW1.find((i) => i.id === listing1.id);
    expect(item).toBeDefined();
    // Must display anonymous label, NOT real name or email
    expect(item?.anonymousLabel).toMatch(/^Anonymous \d+ \(Siam's Aqua Store\)$/);
    expect((item as any).mpoTargetPrice).toBeUndefined(); // MPO target price hidden from wholesaler
    expect(item?.unitPrice).toBe(30.0);

    // Wholesaler 1 places counter-bid: ৳29.00 for 40 boxes
    const bid1 = await mpoService.placeBid(wholesalerUser.id, listing1.id, {
      bidUnitPrice: 29.0,
      bidQuantity: 40,
    });
    expect(bid1.status).toBe('PENDING');

    // Wholesaler 2 places counter-bid: ৳29.50 for 50 boxes
    const bid2 = await mpoService.placeBid(wholesalerUser2.id, listing1.id, {
      bidUnitPrice: 29.5,
      bidQuantity: 50,
    });
    expect(bid2.status).toBe('PENDING');

    // Wholesaler 1 checks feed again: should only see their OWN bid (৳29.00), NEVER Wholesaler 2's bid
    const recheckedFeedW1 = await mpoService.getWholesaleFeed(wholesalerUser.id);
    const w1Item = recheckedFeedW1.find((i) => i.id === listing1.id);
    expect(w1Item?.myBid?.bidUnitPrice).toBe(29.0);
    expect(w1Item?.bids).toBeUndefined(); // Competing bids hidden

    // Wholesaler 2 checks feed: only sees their own bid (৳29.50)
    const recheckedFeedW2 = await mpoService.getWholesaleFeed(wholesalerUser2.id);
    const w2Item = recheckedFeedW2.find((i) => i.id === listing1.id);
    expect(w2Item?.myBid?.bidUnitPrice).toBe(29.5);
  });

  // TEST 7: MPO Final Bid Acceptance Authority & Auto-Order Generation
  it('7. Should allow MPO to accept winning bid, auto-confirming order under Siam Aqua Store with itemized ৳0 bonus', async () => {
    // MPO views their own listings with anonymous bidders
    const mpoListings = await mpoService.getMpoListings(createdMpo1.userId);
    const myListing = mpoListings.find((l) => l.id === listing1.id);
    expect(myListing?.bids?.length).toBe(2);

    // Bidders are masked as "Wholesaler Bidder #1", "Wholesaler Bidder #2"
    expect(myListing?.bids?.[0].wholesalerName).toMatch(/^Wholesaler Bidder #\d+$/);

    // MPO chooses to accept Wholesaler 2's higher bid (৳29.50 for 50 boxes)
    const winningBid = myListing?.bids?.find((b) => b.bidUnitPrice === 29.5);
    expect(winningBid).toBeDefined();

    const acceptResult = await mpoService.acceptBid(createdMpo1.userId, listing1.id, winningBid!.id);
    expect(acceptResult.acceptedBidId).toBe(winningBid!.id);

    // Verify created order in database for Wholesaler 2
    const confirmedOrder = await prisma.order.findFirst({
      where: { userId: wholesalerUser2.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    expect(confirmedOrder).toBeDefined();
    expect(confirmedOrder?.fulfillmentStatus).toBe('CONFIRMED');
    expect(confirmedOrder?.sectorType).toBe('WHOLESALE');
    expect(confirmedOrder?.totalAmount).toBe(29.5 * 50); // 1475.0

    // Verify line items: Paid items + Itemized Bonus items at ৳0.00
    expect(confirmedOrder?.items.length).toBe(2);
    const paidItem = confirmedOrder?.items.find((i) => !i.isBonusItem);
    const bonusItem = confirmedOrder?.items.find((i) => i.isBonusItem);

    expect(paidItem?.confirmedQuantity).toBe(50);
    expect(paidItem?.finalUnitPrice).toBe(29.5);

    expect(bonusItem?.confirmedQuantity).toBe(10);
    expect(bonusItem?.finalUnitPrice).toBe(0);
    expect(bonusItem?.totalPrice).toBe(0);
    expect(bonusItem?.bonusRatio).toBe('10+2');
  });

  // TEST 8: Pre-Order Draft Memo Arrival Syncing & Unfulfilled Adjustments
  it('8. Should sync arrival quantities on Pre-Order draft memos and recalculate totals', async () => {
    // Create a Pre-Order draft memo
    const preOrderDraft = await prisma.order.create({
      data: {
        orderNumber: `PRE-DRAFT-${Date.now()}`,
        userId: wholesalerUser.id,
        sectorType: 'WHOLESALE',
        fulfillmentStatus: 'PENDING_VERIFICATION',
        memoState: 'PRELIMINARY_MRP',
        isPreOrderDraft: true,
        preOrderSupplyStatus: 'PENDING_ARRIVAL',
        preliminarySubtotal: 1000.0,
        subtotal: 1000.0,
        totalAmount: 1000.0,
        deliveryAddress: 'Mitford Pre-Order Hub',
        items: {
          create: [
            {
              productId: product1.id,
              unitType: 'BOX',
              requestedQuantity: 20,
              confirmedQuantity: 20,
              unitMrp: 35.0,
              finalUnitPrice: 30.0,
              totalPrice: 600.0,
            },
            {
              productId: product2.id,
              unitType: 'BOX',
              requestedQuantity: 20,
              confirmedQuantity: 20,
              unitMrp: 25.0,
              finalUnitPrice: 20.0,
              totalPrice: 400.0,
            },
          ],
        },
      },
      include: { items: true },
    });

    // Shipment arrives: Product 1 arrives full (20 boxes), Product 2 partially arrives (10 boxes out of 20)
    const updateResult = await mpoService.updatePreOrderDraftMemo(
      superAdminUser.id,
      preOrderDraft.id,
      {
        items: [
          { orderItemId: preOrderDraft.items[0].id, actualReceivedQuantity: 20 },
          { orderItemId: preOrderDraft.items[1].id, actualReceivedQuantity: 10 },
        ],
        isUnfulfilledCancelled: true,
        cancellationNotice: 'Supplier had short stock for Napa Rapid. Partial shipment accepted.',
      },
    );

    expect(updateResult.preOrderSupplyStatus).toBe('PARTIALLY_ARRIVED');
    // New total: 20 * 30 + 10 * 20 = 600 + 200 = 800
    expect(updateResult.finalSubtotal).toBe(800.0);
    expect(updateResult.totalAmount).toBe(800.0);
    expect(updateResult.orderNotes).toContain('Supplier had short stock');
  });

  // TEST 9: "All Companies" Directory with Offer Pins
  it('9. Should return All Companies directory with active offer flags and metrics', async () => {
    // Put an active offer on Company A product
    await prisma.product.update({
      where: { id: product1.id },
      data: {
        isOfferParaLiveStock: true,
        offerParaStockQty: 100,
      },
    });

    const companies = await catalogService.getAllCompanies();
    expect(companies.length).toBeGreaterThanOrEqual(2);

    const companyA = companies.find((c) => c.id === testCompanyA.id);
    expect(companyA?.hasActiveOffers).toBe(true);
    expect(companyA?.offerParaProductCount).toBeGreaterThanOrEqual(1);

    // Company A with active offers should be sorted ahead of companies without offers
    const firstCompanyWithOffers = companies.findIndex((c) => c.hasActiveOffers);
    const firstCompanyWithoutOffers = companies.findIndex((c) => !c.hasActiveOffers);
    if (firstCompanyWithOffers !== -1 && firstCompanyWithoutOffers !== -1) {
      expect(firstCompanyWithOffers).toBeLessThan(firstCompanyWithoutOffers);
    }
  });
});
