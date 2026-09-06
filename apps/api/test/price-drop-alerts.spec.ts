import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PriceAlertsService } from '../src/modules/price-alerts/price-alerts.service';
import { AccountType } from '@siam-aqua/shared-types';

describe('Phase 11.6: Price-Drop Alerts Suite', () => {
  let prisma: PrismaClient;
  let priceAlertsService: PriceAlertsService;

  let testUser: any;
  let testCompany: any;
  let testProduct: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    priceAlertsService = new PriceAlertsService(prisma as any);

    testUser = await prisma.user.create({
      data: {
        email: `alert_user_${Date.now()}@siamaqua.com`,
        passwordHash: 'hash',
        accountType: AccountType.PUBLIC_USER,
        name: 'Price Watcher User',
      },
    });

    testCompany = await prisma.company.create({
      data: {
        name: 'Incepta Price Alerts Pharma',
        code: `INC-ALERT-${Date.now()}`,
      },
    });

    testProduct = await prisma.product.create({
      data: {
        name: 'Pantodac 20mg Tablet',
        slug: `pantodac-20-alert-${Date.now()}`,
        mrp: 80.0,
        genericName: 'Pantoprazole',
        dosageForm: 'TABLET',
        strength: '20mg',
        companyId: testCompany.id,
      },
    });
  });

  afterAll(async () => {
    if (testProduct) {
      await prisma.priceDropSubscription.deleteMany({ where: { productId: testProduct.id } });
      await prisma.product.deleteMany({ where: { id: testProduct.id } });
    }
    if (testCompany) {
      await prisma.company.deleteMany({ where: { id: testCompany.id } });
    }
    if (testUser) {
      await prisma.user.deleteMany({ where: { id: testUser.id } });
    }
    await prisma.$disconnect();
  });

  it('1. should create a price-drop subscription with baseline MRP', async () => {
    const sub = await priceAlertsService.subscribePriceDrop(testUser.id, {
      productId: testProduct.id,
      targetPriceBdt: 70.0, // Target ৳70 (MRP is ৳80)
      customerEmail: testUser.email,
    });

    expect(sub).toBeDefined();
    expect(sub.productId).toBe(testProduct.id);
    expect(sub.baselineMrp).toBe(80.0);
    expect(sub.targetPriceBdt).toBe(70.0);
    expect(sub.isNotified).toBe(false);
  });

  it('2. should trigger price drop notification when MRP is reduced below target price', async () => {
    // Admin/manufacturer reduces price to ৳65.0
    await prisma.product.update({
      where: { id: testProduct.id },
      data: { mrp: 65.0 },
    });

    const triggeredAlerts = await priceAlertsService.checkAndTriggerPriceDrops();
    expect(triggeredAlerts.length).toBeGreaterThanOrEqual(1);

    const match = triggeredAlerts.find((a) => a.productId === testProduct.id);
    expect(match).toBeDefined();
    expect(match?.currentMrp).toBe(65.0);
    expect(match?.savingsBdt).toBe(15.0); // 80 - 65 = ৳15 savings
    expect(match?.savingsPercent).toBe(18.8); // 15 / 80 = 18.75% -> 18.8%
    expect(match?.isNotified).toBe(true);
  });

  it('3. should list user alerts with updated pricing and savings status', async () => {
    const userAlerts = await priceAlertsService.getMyAlerts(testUser.id);
    expect(userAlerts.length).toBe(1);

    const alert = userAlerts[0];
    expect(alert.productName).toBe('Pantodac 20mg Tablet');
    expect(alert.currentMrp).toBe(65.0);
    expect(alert.savingsBdt).toBe(15.0);
    expect(alert.isTriggered).toBe(true);
  });
});
