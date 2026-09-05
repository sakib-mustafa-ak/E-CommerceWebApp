import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { GamingService } from '../src/modules/gaming/gaming.service';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  AccountType,
  GameFulfillmentMode,
  GameFulfillmentStatus,
} from '@siam-aqua/shared-types';

describe('Phase 8: Gaming (Diamond Top-Ups, Codashop-Style) Integration Test Suite', () => {
  let prisma: PrismaClient;
  let gamingService: GamingService;
  let auditService: AuditService;

  let adminUser: any;
  let publicGamerUser: any;
  let freeFireGame: any;
  let mlbbGame: any;
  let ffPackage100: any;
  let mlbbPackageWeekly: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    auditService = new AuditService(prisma as any);
    gamingService = new GamingService(prisma as any, auditService);

    const suffix = Date.now();

    // 1. Admin User
    adminUser = await prisma.user.create({
      data: {
        email: `admin_gaming_${suffix}@siamaqua.com`,
        passwordHash: 'dummy_hash',
        name: 'Siam Gaming Desk Admin',
        accountType: AccountType.SUPER_ADMIN,
      },
    });

    // 2. Public Gamer User
    publicGamerUser = await prisma.user.create({
      data: {
        email: `gamer_${suffix}@gmail.com`,
        passwordHash: 'dummy_hash',
        name: 'Rafi Pro Gamer',
        accountType: AccountType.PUBLIC_USER,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Catalog Management: Admin creates games (Auto API & Manual Staff) and top-up diamond packages', async () => {
    const suffix = Date.now();

    // 1. Create Free Fire (Automated Instant API top-up)
    freeFireGame = await gamingService.createGame(
      {
        name: `Garena Free Fire ${suffix}`,
        slug: `free-fire-${suffix}`,
        publisher: 'Garena',
        category: 'BATTLE_ROYALE',
        requiresZoneId: false,
        idFormatValidationRegex: '^[0-9]{8,12}$',
        idInstructions: 'Enter your 8-10 digit Free Fire Player ID found in your profile.',
        fulfillmentMode: GameFulfillmentMode.AUTO_API,
        sortOrder: 1,
      },
      adminUser,
    );

    expect(freeFireGame.id).toBeDefined();
    expect(freeFireGame.slug).toBe(`free-fire-${suffix}`);
    expect(freeFireGame.fulfillmentMode).toBe(GameFulfillmentMode.AUTO_API);

    // Add Package for Free Fire
    ffPackage100 = await gamingService.createPackage(
      {
        gameId: freeFireGame.id,
        name: '100 + 10 Bonus Diamonds',
        diamondCount: 100,
        bonusCount: 10,
        priceBdt: 85.0,
        badgeText: '+10% BONUS',
        sortOrder: 1,
      },
      adminUser,
    );

    expect(ffPackage100.diamondCount).toBe(100);
    expect(ffPackage100.totalDiamonds).toBe(110);
    expect(ffPackage100.priceBdt).toBe(85.0);

    // 2. Create Mobile Legends (Requires Zone ID & Manual Staff Fulfillment)
    mlbbGame = await gamingService.createGame(
      {
        name: `Mobile Legends: Bang Bang ${suffix}`,
        slug: `mobile-legends-${suffix}`,
        publisher: 'Moonton',
        category: 'MOBA',
        requiresZoneId: true,
        zoneIdLabel: 'Zone ID (4-5 digits)',
        idFormatValidationRegex: '^[0-9]{8,12}$',
        fulfillmentMode: GameFulfillmentMode.MANUAL_STAFF,
        sortOrder: 2,
      },
      adminUser,
    );

    expect(mlbbGame.requiresZoneId).toBe(true);
    expect(mlbbGame.fulfillmentMode).toBe(GameFulfillmentMode.MANUAL_STAFF);

    // Add Package for MLBB
    mlbbPackageWeekly = await gamingService.createPackage(
      {
        gameId: mlbbGame.id,
        name: 'Weekly Diamond Pass',
        diamondCount: 220,
        bonusCount: 0,
        priceBdt: 190.0,
        badgeText: 'HOT VALUE',
        sortOrder: 1,
      },
      adminUser,
    );

    expect(mlbbPackageWeekly.priceBdt).toBe(190.0);
  });

  it('2. Player ID Validation: Enforces regex format and mandatory Zone ID where required', async () => {
    // A. Free Fire valid player ID
    const validFF = await gamingService.validatePlayerId({
      gameSlug: freeFireGame.slug,
      playerId: '182736459',
    });
    expect(validFF.isValid).toBe(true);
    expect(validFF.playerNickname).toBeDefined();

    // B. Free Fire invalid player ID (letters not allowed by regex ^[0-9]{8,12}$)
    const invalidFF = await gamingService.validatePlayerId({
      gameSlug: freeFireGame.slug,
      playerId: 'INVALID_ID_ABC',
    });
    expect(invalidFF.isValid).toBe(false);
    expect(invalidFF.message).toContain('Invalid Player ID format');

    // C. MLBB missing Zone ID
    const missingZone = await gamingService.validatePlayerId({
      gameSlug: mlbbGame.slug,
      playerId: '891273641',
    });
    expect(missingZone.isValid).toBe(false);
    expect(missingZone.message).toContain('Zone ID is required');

    // D. MLBB with valid Zone ID
    const validMLBB = await gamingService.validatePlayerId({
      gameSlug: mlbbGame.slug,
      playerId: '891273641',
      zoneId: '2042',
    });
    expect(validMLBB.isValid).toBe(true);
    expect(validMLBB.zoneId).toBe('2042');
  });

  it('3. Payment Rule: Strictly blocks Cash-on-Delivery (COD) for digital game top-ups', async () => {
    await expect(
      gamingService.checkoutTopUp(
        {
          gameSlug: freeFireGame.slug,
          packageId: ffPackage100.id,
          playerId: '182736459',
          paymentMethod: 'COD' as any, // Attempt COD
        },
        publicGamerUser.id,
      ),
    ).rejects.toThrow('Cash on Delivery is strictly prohibited');
  });

  it('4. Automated Instant API Fulfillment: Top-ups for AUTO_API games deliver instantly with provider transaction ref', async () => {
    const order = await gamingService.checkoutTopUp(
      {
        gameSlug: freeFireGame.slug,
        packageId: ffPackage100.id,
        playerId: '182736459',
        paymentMethod: 'BKASH',
      },
      publicGamerUser.id,
    );

    expect(order.orderNumber).toMatch(/^ORD-GAME-/);
    expect(order.gameName).toContain('Free Fire');
    expect(order.diamondCount).toBe(100);
    expect(order.priceBdt).toBe(85.0);
    expect(order.paymentStatus).toBe('PAID');
    expect(order.fulfillmentStatus).toBe(GameFulfillmentStatus.DELIVERED);
    expect(order.fulfillmentMode).toBe(GameFulfillmentMode.AUTO_API);
    expect(order.providerTransactionRef).toMatch(/^GAME-TX-/);
    expect(order.fulfilledAt).toBeDefined();
  });

  it('5. Manual Admin Fulfillment Desk: MANUAL_STAFF top-ups queue in pending desk and are fulfilled by staff', async () => {
    // 1. Gamer orders MLBB Weekly Pass (MANUAL_STAFF mode)
    const order = await gamingService.checkoutTopUp(
      {
        gameSlug: mlbbGame.slug,
        packageId: mlbbPackageWeekly.id,
        playerId: '891273641',
        zoneId: '2042',
        paymentMethod: 'NAGAD',
        guestEmail: 'guest_gamer@gmail.com',
      },
    );

    expect(order.fulfillmentStatus).toBe(GameFulfillmentStatus.PENDING);
    expect(order.fulfillmentMode).toBe(GameFulfillmentMode.MANUAL_STAFF);
    expect(order.providerTransactionRef).toBeUndefined();

    // 2. Admin inspects pending queue
    const queue = await gamingService.getPendingTopUpQueue();
    const pendingOrder = queue.find((o) => o.id === order.id);
    expect(pendingOrder).toBeDefined();
    expect(pendingOrder?.zoneId).toBe('2042');

    // 3. Admin fulfills the top-up with provider voucher ref
    const fulfilled = await gamingService.fulfillManualTopUp(
      order.id,
      {
        status: 'DELIVERED',
        providerTransactionRef: 'MOONTON-VOUCHER-TRX-88219',
        notes: 'Diamond recharge verified on Moonton partner terminal.',
      },
      adminUser,
    );

    expect(fulfilled.fulfillmentStatus).toBe(GameFulfillmentStatus.DELIVERED);
    expect(fulfilled.providerTransactionRef).toBe('MOONTON-VOUCHER-TRX-88219');
    expect(fulfilled.fulfilledAt).toBeDefined();
  });

  it('6. Public Order Status Lookup: Returns real-time order tracking and transaction reference', async () => {
    // Create an order
    const created = await gamingService.checkoutTopUp(
      {
        gameSlug: freeFireGame.slug,
        packageId: ffPackage100.id,
        playerId: '998877665',
        paymentMethod: 'CARD',
      },
    );

    // Lookup by order number
    const lookup = await gamingService.getOrderByNumber(created.orderNumber);
    expect(lookup.id).toBe(created.id);
    expect(lookup.orderNumber).toBe(created.orderNumber);
    expect(lookup.fulfillmentStatus).toBe(GameFulfillmentStatus.DELIVERED);
    expect(lookup.playerNickname).toBeDefined();
  });
});
