import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AccountsService } from '../src/modules/accounts/accounts.service';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PreOrdersService } from '../src/modules/pre-orders/pre-orders.service';
import { EventsGateway } from '../src/modules/events/events.gateway';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  AccountType,
  ApplicationStatus,
  FulfillmentMethod,
  PaymentMethod,
  PreOrderStatus,
  UnitType,
} from '@siam-aqua/shared-types';

describe('Phase 3: Wholesale Market Integration Test Suite', () => {
  let prisma: PrismaClient;
  let accountsService: AccountsService;
  let ordersService: OrdersService;
  let preOrdersService: PreOrdersService;
  let eventsGateway: EventsGateway;
  let auditService: AuditService;

  let testAdminUser: any;
  let testPaikariUser: any;
  let testWholesalerUser: any;
  let testAllopathicProduct: any;
  let testHerbalProduct: any;
  let testCompany: any;
  let testTierA: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    eventsGateway = new EventsGateway();
    auditService = new AuditService(prisma as any);
    accountsService = new AccountsService(prisma as any, auditService);
    ordersService = new OrdersService(prisma as any, eventsGateway, auditService);
    preOrdersService = new PreOrdersService(prisma as any);

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
      where: { code: 'TEST_PHARMA_WHL' },
      update: {},
      create: {
        code: 'TEST_PHARMA_WHL',
        name: 'Test Pharma Wholesale',
      },
    });

    // Setup Test Products
    testAllopathicProduct = await prisma.product.create({
      data: {
        name: `Wholesale Paracetamol ${Date.now()}`,
        slug: `whl-para-${Date.now()}`,
        genericName: 'Paracetamol',
        companyId: testCompany.id,
        dosageForm: 'Tablet',
        strength: '500mg',
        mrp: 100.0,
        unit: 'Master Box (50 strips)',
        category: 'Allopathic',
        wholesaleMoq: 10, // MOQ = 10 boxes
        isReturnable: true,
      },
    });

    testHerbalProduct = await prisma.product.create({
      data: {
        name: `Wholesale Herbal Syrup ${Date.now()}`,
        slug: `whl-herbal-${Date.now()}`,
        genericName: 'Herbal Extract',
        companyId: testCompany.id,
        dosageForm: 'Syrup',
        strength: '100ml',
        mrp: 200.0,
        unit: 'Carton (24 bottles)',
        category: 'Herbal',
        wholesaleMoq: 5, // MOQ = 5 cartons
        isReturnable: true,
      },
    });

    // Setup Admin User
    testAdminUser = await prisma.user.create({
      data: {
        email: `admin.whl.${Date.now()}@siamaqua.com`,
        name: 'Wholesale Super Admin',
        accountType: AccountType.SUPER_ADMIN,
        passwordHash: 'dummy-hash',
      },
    });

    // Setup Paikari User (for upgrade testing)
    testPaikariUser = await prisma.user.create({
      data: {
        email: `paikari.upgrade.${Date.now()}@shop.com`,
        name: 'Paikari Shop Owner',
        accountType: AccountType.PAIKARI_SELLER,
        passwordHash: 'dummy-hash',
        customerProfile: {
          create: {
            shopName: 'Green Life Pharmacy',
            ownerName: 'Green Owner',
            address: 'Dhanmondi, Dhaka',
            tierId: testTierA.id,
            creditLimit: 20000,
          },
        },
      },
      include: { customerProfile: true },
    });

    // Setup Wholesale User with restricted categories (Only Allopathic)
    testWholesalerUser = await prisma.user.create({
      data: {
        email: `wholesaler.restricted.${Date.now()}@distributor.com`,
        name: 'MediDistributor Wholesaler',
        accountType: AccountType.WHOLESALER_SELLER,
        passwordHash: 'dummy-hash',
        customerProfile: {
          create: {
            shopName: 'MediDistributors Dhaka',
            ownerName: 'Wholesale Partner',
            address: 'Mitford Road, Dhaka',
            tierId: testTierA.id,
            creditLimit: 500000,
            allowedCategories: JSON.stringify(['Allopathic']), // Restricted to Allopathic only!
          },
        },
      },
      include: { customerProfile: true },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // Requirement 1: Wholesale application → review → approval → correct dashboard access
  // ---------------------------------------------------------------------------
  it('Requirement 1: processes public wholesale application, approves it, and generates wholesale profile with Tier A', async () => {
    // 1. Submit public application
    const appRecord = await prisma.applicationQueue.create({
      data: {
        businessName: 'Apex Wholesale Hub',
        ownerName: 'Apex Partner',
        phone: `017${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `apex.whl.${Date.now()}@hub.com`,
        address: 'Babu Bazar, Dhaka',
        accountType: AccountType.WHOLESALER_SELLER,
        categoryInterest: 'Allopathic,Surgical',
        tradeLicenseNo: 'TR-WHL-9988',
        drugLicenseNo: 'DL-WHL-7766',
        status: ApplicationStatus.PENDING_REVIEW,
      },
    });

    // 2. Admin reviews and approves application
    const reviewResult = await accountsService.reviewApplication(
      appRecord.id,
      {
        action: 'APPROVE',
        tierId: testTierA.id,
        creditLimit: 300000,
        temporaryPassword: 'TempPassword@123',
      },
      { id: testAdminUser.id, email: testAdminUser.email },
    );

    expect(reviewResult.user).toBeDefined();
    expect(reviewResult.user.accountType).toBe(AccountType.WHOLESALER_SELLER);

    // 3. Verify user dashboard data
    const dashboard = await ordersService.getWholesaleDashboard(reviewResult.user.id);
    expect(dashboard.shopName).toBe('Apex Wholesale Hub');
    expect(dashboard.currentTierCode).toBe('TIER_A');
    expect(dashboard.creditLimit).toBe(300000);
  });

  // ---------------------------------------------------------------------------
  // Requirement 2: Category access restrictions are enforced server-side per account
  // ---------------------------------------------------------------------------
  it('Requirement 2: blocks wholesale orders containing products from non-allowed categories', async () => {
    // Attempt to order Herbal product when account is only allowed Allopathic
    await expect(
      ordersService.createPaikariOrder(testWholesalerUser.id, AccountType.WHOLESALER_SELLER, {
        items: [
          {
            productId: testHerbalProduct.id, // Herbal category
            unitType: UnitType.BOX,
            requestedQuantity: 10,
          },
        ],
        fulfillmentMethod: FulfillmentMethod.HOME_DELIVERY,
        paymentMethod: PaymentMethod.COD,
        deliveryAddress: 'Mitford Road, Dhaka',
      }),
    ).rejects.toThrow(/not allowed for your wholesale account/);

    // Allowed category (Allopathic) should proceed when MOQ is met
    const validOrder = await ordersService.createPaikariOrder(
      testWholesalerUser.id,
      AccountType.WHOLESALER_SELLER,
      {
        items: [
          {
            productId: testAllopathicProduct.id, // Allopathic category
            unitType: UnitType.BOX,
            requestedQuantity: 10, // Meets MOQ (10)
          },
        ],
        fulfillmentMethod: FulfillmentMethod.HOME_DELIVERY,
        paymentMethod: PaymentMethod.COD,
        deliveryAddress: 'Mitford Road, Dhaka',
      },
    );

    expect(validOrder).toBeDefined();
    expect(validOrder.orderNumber.startsWith('WHL-')).toBe(true);
    expect(validOrder.items.length).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Requirement 3: MOQ is enforced at checkout
  // ---------------------------------------------------------------------------
  it('Requirement 3: rejects wholesale orders where requested quantity is below product wholesale MOQ', async () => {
    // testAllopathicProduct has wholesaleMoq = 10. Attempt to order 4 boxes.
    await expect(
      ordersService.createPaikariOrder(testWholesalerUser.id, AccountType.WHOLESALER_SELLER, {
        items: [
          {
            productId: testAllopathicProduct.id,
            unitType: UnitType.BOX,
            requestedQuantity: 4, // Below MOQ (10)
          },
        ],
        fulfillmentMethod: FulfillmentMethod.HOME_DELIVERY,
        paymentMethod: PaymentMethod.COD,
        deliveryAddress: 'Mitford Road, Dhaka',
      }),
    ).rejects.toThrow(/Minimum order quantity/);
  });

  // ---------------------------------------------------------------------------
  // Requirement 4: 1-Click Paikari → Wholesaler upgrade instantly updates account and pricing
  // ---------------------------------------------------------------------------
  it('Requirement 4: 1-Click Paikari→Wholesaler upgrade immediately upgrades account type to WHOLESALER_SELLER and assigns Tier A', async () => {
    expect(testPaikariUser.accountType).toBe(AccountType.PAIKARI_SELLER);

    // Execute 1-click upgrade
    const result = await ordersService.upgradeCustomerToWholesaler(
      testPaikariUser.id,
      testAdminUser.id,
    );

    expect(result.success).toBe(true);

    // Verify upgraded user
    const updatedUser = await prisma.user.findUnique({
      where: { id: testPaikariUser.id },
      include: { customerProfile: { include: { tier: true } } },
    });

    expect(updatedUser?.accountType).toBe(AccountType.WHOLESALER_SELLER);
    expect(updatedUser?.customerProfile?.tier.code).toBe('TIER_A');
    expect(updatedUser?.customerProfile?.allowedCategories).toBe('ALL');
  });

  // ---------------------------------------------------------------------------
  // Requirement 5: Pre-order lead-time queue routing (2, 3, 4, 5 days)
  // ---------------------------------------------------------------------------
  it('Requirement 5: places pre-order with lead time (3 days) and surfaces it in the pre-order backlog', async () => {
    // 1. Wholesaler places a pre-order with 3-day lead time
    const preOrder = await preOrdersService.createPreOrder(
      testWholesalerUser.id,
      AccountType.WHOLESALER_SELLER,
      {
        productId: testAllopathicProduct.id,
        requestedQuantity: 50,
        unitType: UnitType.BOX,
        leadTimeDays: 3,
        targetPrice: 85.0,
        notes: 'Urgent clinic replenishment request. Need within 3 days.',
      },
    );

    expect(preOrder.id).toBeDefined();
    expect(preOrder.preOrderNumber.startsWith('PRE-2026-')).toBe(true);
    expect(preOrder.leadTimeDays).toBe(3);
    expect(preOrder.status).toBe(PreOrderStatus.PENDING);
    expect(preOrder.requestedQuantity).toBe(50);

    // 2. Verify visibility in admin / MPO unmet demand backlog
    const backlog = await preOrdersService.getAllPreOrders({
      leadTimeDays: 3,
    });

    const found = backlog.find((p) => p.id === preOrder.id);
    expect(found).toBeDefined();
    expect(found?.productName).toBe(testAllopathicProduct.name);
    expect(found?.shopName).toBe('MediDistributors Dhaka');

    // 3. Staff updates pre-order status to SOURCING
    const updated = await preOrdersService.updatePreOrderStatus(
      preOrder.id,
      testAdminUser.id,
      PreOrderStatus.SOURCING,
      'Contacted manufacturer depot in Tongi for allocation.',
    );

    expect(updated.status).toBe(PreOrderStatus.SOURCING);
  });
});
