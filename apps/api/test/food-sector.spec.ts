import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { FoodService } from '../src/modules/food/food.service';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  FoodFulfillmentType,
  FoodOrderStatus,
  AccountType,
} from '@siam-aqua/shared-types';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('Phase 9: Food Sector (Commission-based & Vendor Control)', () => {
  let service: FoodService;
  let prisma: PrismaClient;
  let auditService: AuditService;

  let vendorUser: any;
  let dinerUser: any;
  let staffUser: any;
  let testRestaurant: any;
  let starterCategory: any;
  let biryaniItem: any;
  let kebabItem: any;
  let soldOutItem: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    auditService = new AuditService(prisma as any);
    const mockEventsGateway: any = {
      server: {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
      },
    };

    service = new FoodService(prisma as any, auditService, mockEventsGateway);

    // Clean up test data
    await prisma.foodOrderItem.deleteMany({});
    await prisma.foodOrder.deleteMany({});
    await prisma.menuItem.deleteMany({});
    await prisma.menuCategory.deleteMany({});
    await prisma.restaurant.deleteMany({});

    // Create test users
    const timestamp = Date.now();
    vendorUser = await prisma.user.create({
      data: {
        email: `food_vendor_${timestamp}@test.com`,
        passwordHash: 'hash',
        name: 'Sultan Dine Vendor',
        accountType: AccountType.FOOD_VENDOR,
      },
    });

    dinerUser = await prisma.user.create({
      data: {
        email: `diner_${timestamp}@test.com`,
        passwordHash: 'hash',
        name: 'Tanvir Hossain',
        accountType: AccountType.PUBLIC_USER,
      },
    });

    staffUser = await prisma.user.create({
      data: {
        email: `staff_food_${timestamp}@test.com`,
        passwordHash: 'hash',
        name: 'Admin Reviewer',
        accountType: AccountType.SUPER_ADMIN,
      },
    });
  });

  afterAll(async () => {
    await prisma.foodOrderItem.deleteMany({});
    await prisma.foodOrder.deleteMany({});
    await prisma.menuItem.deleteMany({});
    await prisma.menuCategory.deleteMany({});
    await prisma.restaurant.deleteMany({});
    await prisma.user.deleteMany({
      where: { id: { in: [vendorUser.id, dinerUser.id, staffUser.id] } },
    });
    await prisma.$disconnect();
  });

  describe('1. Vendor Onboarding & Admin Approval', () => {
    it('should submit a restaurant application in pending state', async () => {
      const result = await service.applyForRestaurant(vendorUser.id, {
        name: "Sultan's Kacchi Banani",
        area: 'BANANI',
        address: 'Road 11, Block D, Banani, Dhaka',
        phone: '01711998877',
        cuisines: ['Biryani', 'Mughlai', 'Kebab'],
        commissionRate: 0.15,
        deliveryFee: 70,
        isPlatformDelivery: true,
      });

      expect(result).toBeDefined();
      expect(result.name).toBe("Sultan's Kacchi Banani");
      expect(result.isApproved).toBe(false);
      expect(result.area).toBe('BANANI');
      expect(result.commissionRate).toBe(0.15);
      expect(result.deliveryFee).toBe(70);

      testRestaurant = result;
    });

    it('should not appear in public marketplace before approval', async () => {
      const publicList = await service.getPublicRestaurants({ area: 'BANANI' });
      expect(publicList.some((r) => r.id === testRestaurant.id)).toBe(false);
    });

    it('should be approved by staff/admin and become visible in public marketplace', async () => {
      const approved = await service.approveRestaurant(staffUser.id, testRestaurant.id, 0.15);
      expect(approved.isApproved).toBe(true);

      const publicList = await service.getPublicRestaurants({ area: 'BANANI' });
      expect(publicList.some((r) => r.id === testRestaurant.id)).toBe(true);
    });
  });

  describe("2. Vendor Menu Management & 86'd Availability Control", () => {
    it('should create menu categories and items under vendor control', async () => {
      starterCategory = await service.createCategory(vendorUser.id, {
        restaurantId: testRestaurant.id,
        name: 'Signature Kacchi & Kebabs',
        sortOrder: 1,
      });

      biryaniItem = await service.createMenuItem(vendorUser.id, {
        restaurantId: testRestaurant.id,
        categoryId: starterCategory.id,
        name: 'Mutton Kacchi Biryani Platter',
        description: 'Tender mutton with aromatic basmati rice, aloo, and boiled egg',
        priceBdt: 450,
        isAvailable: true,
        preparationTimeMinutes: 25,
      });

      kebabItem = await service.createMenuItem(vendorUser.id, {
        restaurantId: testRestaurant.id,
        categoryId: starterCategory.id,
        name: 'Reshmi Chicken Kebab',
        description: 'Marinated spiced chicken skewers',
        priceBdt: 220,
        isAvailable: true,
        preparationTimeMinutes: 15,
      });

      soldOutItem = await service.createMenuItem(vendorUser.id, {
        restaurantId: testRestaurant.id,
        categoryId: starterCategory.id,
        name: 'Special Borhani (1 Liter)',
        description: 'Traditional spiced yogurt drink',
        priceBdt: 180,
        isAvailable: true,
        preparationTimeMinutes: 5,
      });

      expect(biryaniItem.priceBdt).toBe(450);
      expect(kebabItem.priceBdt).toBe(220);
      expect(soldOutItem.isAvailable).toBe(true);
    });

    it("should allow vendor to 86 (mark out of stock) an item with 1-click", async () => {
      const updated = await service.toggleMenuItemAvailability(vendorUser.id, soldOutItem.id, false);
      expect(updated.isAvailable).toBe(false);

      // Verify checkout rejects orders containing this 86'd item
      await expect(
        service.placeOrder(dinerUser.id, {
          restaurantId: testRestaurant.id,
          customerName: 'Tanvir Hossain',
          customerPhone: '01811223344',
          fulfillmentType: FoodFulfillmentType.HOME_DELIVERY,
          deliveryAddress: 'House 12, Road 5, Banani',
          paymentMethod: 'CASH_ON_DELIVERY',
          items: [
            { menuItemId: biryaniItem.id, quantity: 1 },
            { menuItemId: soldOutItem.id, quantity: 1 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Home Delivery vs Pickup & Large-Order Deposit Rule', () => {
    it('should place a Home Delivery order with delivery fee and calculate commission correctly', async () => {
      const order = await service.placeOrder(dinerUser.id, {
        restaurantId: testRestaurant.id,
        customerName: 'Tanvir Hossain',
        customerPhone: '01811223344',
        fulfillmentType: FoodFulfillmentType.HOME_DELIVERY,
        deliveryArea: 'BANANI',
        deliveryAddress: 'House 12, Road 5, Banani',
        paymentMethod: 'CASH_ON_DELIVERY',
        items: [
          { menuItemId: biryaniItem.id, quantity: 2 }, // 450 * 2 = 900
          { menuItemId: kebabItem.id, quantity: 1 }, // 220
        ],
      });

      // Subtotal = 1120, Delivery = 70, Total = 1190
      expect(order.subtotalBdt).toBe(1120);
      expect(order.deliveryFeeBdt).toBe(70);
      expect(order.totalAmountBdt).toBe(1190);
      // Under 2000 BDT -> no advance deposit required
      expect(order.depositRequiredBdt).toBe(0);
      // Commission 15% of 1120 = 168 BDT
      expect(order.commissionAmountBdt).toBe(168);
      // Net vendor earnings = 1120 - 168 = 952 BDT
      expect(order.netVendorEarningsBdt).toBe(952);
      expect(order.orderStatus).toBe(FoodOrderStatus.PENDING);
      expect(order.restaurantName).toBe("Sultan's Kacchi Banani");
    });

    it('should place a Pickup order with ZERO delivery fee', async () => {
      const order = await service.placeOrder(dinerUser.id, {
        restaurantId: testRestaurant.id,
        customerName: 'Tanvir Pickup',
        customerPhone: '01811223344',
        fulfillmentType: FoodFulfillmentType.PICKUP,
        paymentMethod: 'CASH_ON_DELIVERY',
        items: [{ menuItemId: biryaniItem.id, quantity: 1 }],
      });

      expect(order.subtotalBdt).toBe(450);
      expect(order.deliveryFeeBdt).toBe(0);
      expect(order.totalAmountBdt).toBe(450);
      expect(order.fulfillmentType).toBe(FoodFulfillmentType.PICKUP);
    });

    it('should enforce 30% advance deposit for large catering/party orders >= 2000 BDT', async () => {
      const order = await service.placeOrder(dinerUser.id, {
        restaurantId: testRestaurant.id,
        customerName: 'Office Party Order',
        customerPhone: '01911887766',
        fulfillmentType: FoodFulfillmentType.HOME_DELIVERY,
        deliveryAddress: 'Banani Commercial Tower, Level 8',
        paymentMethod: 'BKASH',
        items: [
          { menuItemId: biryaniItem.id, quantity: 5 }, // 450 * 5 = 2250
          { menuItemId: kebabItem.id, quantity: 2 }, // 220 * 2 = 440
        ],
      });

      // Subtotal = 2690 + 70 delivery = 2760
      expect(order.subtotalBdt).toBe(2690);
      expect(order.totalAmountBdt).toBe(2760);
      // 30% deposit of 2760 = 828
      expect(order.depositRequiredBdt).toBe(Math.ceil(2760 * 0.3));
      expect(order.paymentStatus).toBe('PAID');
    });
  });

  describe('4. Order Lifecycle & Live Cooking Countdown Timer', () => {
    let activeOrder: any;

    it('should transition from PENDING to CONFIRMED', async () => {
      const orders = await service.getVendorOrders(vendorUser.id);
      activeOrder = orders[0];

      const confirmed = await service.updateOrderStatus(vendorUser.id, false, activeOrder.id, {
        status: FoodOrderStatus.CONFIRMED,
      });

      expect(confirmed.orderStatus).toBe(FoodOrderStatus.CONFIRMED);
    });

    it('should start COOKING and set cooking target timestamp for real-time countdown', async () => {
      const cooking = await service.updateOrderStatus(vendorUser.id, false, activeOrder.id, {
        status: FoodOrderStatus.COOKING,
        cookingMinutes: 30,
      });

      expect(cooking.orderStatus).toBe(FoodOrderStatus.COOKING);
      expect(cooking.cookingMinutesEstimated).toBe(30);
      expect(cooking.cookingStartedAt).toBeDefined();
      expect(cooking.cookingTargetAt).toBeDefined();

      const started = new Date(cooking.cookingStartedAt).getTime();
      const target = new Date(cooking.cookingTargetAt!).getTime();
      // Target should be 30 minutes (1,800,000 ms) in future
      expect(target - started).toBe(30 * 60 * 1000);
    });

    it('should transition to OUT_FOR_DELIVERY and DELIVERED', async () => {
      const out = await service.updateOrderStatus(vendorUser.id, false, activeOrder.id, {
        status: FoodOrderStatus.OUT_FOR_DELIVERY,
      });
      expect(out.orderStatus).toBe(FoodOrderStatus.OUT_FOR_DELIVERY);

      const delivered = await service.updateOrderStatus(vendorUser.id, false, activeOrder.id, {
        status: FoodOrderStatus.DELIVERED,
      });
      expect(delivered.orderStatus).toBe(FoodOrderStatus.DELIVERED);
      expect(delivered.paymentStatus).toBe('PAID');
      expect(delivered.deliveredAt).toBeDefined();
    });

    it('should block unauthorized users from changing order status', async () => {
      await expect(
        service.updateOrderStatus(dinerUser.id, false, activeOrder.id, {
          status: FoodOrderStatus.CANCELLED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('5. Vendor-Branded Invoicing & Financial Ledger', () => {
    it('should generate vendor financial ledger with accurate commission and net earnings', async () => {
      const ledger = await service.getRestaurantLedger(vendorUser.id);

      expect(ledger.restaurantName).toBe("Sultan's Kacchi Banani");
      expect(ledger.deliveredOrdersCount).toBeGreaterThanOrEqual(1);
      expect(ledger.grossSalesBdt).toBeGreaterThan(0);
      expect(ledger.platformCommissionBdt).toBeGreaterThan(0);
      expect(ledger.netVendorPayoutBdt).toBe(
        Math.round((ledger.grossSalesBdt - ledger.platformCommissionBdt) * 100) / 100,
      );
    });

    it('should fetch order by orderNumber for customer live tracking and vendor receipt', async () => {
      const ledger = await service.getRestaurantLedger(vendorUser.id);
      const targetOrder = ledger.recentOrders[0];

      const receipt = await service.getOrderByOrderNumber(targetOrder.orderNumber);
      expect(receipt.restaurantName).toBe("Sultan's Kacchi Banani");
      expect(receipt.restaurantPhone).toBe('01711998877');
      expect(receipt.restaurantAddress).toBe('Road 11, Block D, Banani, Dhaka');
      expect(receipt.items.length).toBeGreaterThan(0);
    });
  });
});
