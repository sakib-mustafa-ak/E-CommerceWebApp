import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { RewardsService } from '../src/modules/rewards/rewards.service';
import { AccountType } from '@siam-aqua/shared-types';

describe('Phase 11.3: Rewards Points & Referral Program Suite', () => {
  let prisma: PrismaClient;
  let rewardsService: RewardsService;

  let testUserA: any;
  let testUserB: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    rewardsService = new RewardsService(prisma as any);

    testUserA = await prisma.user.create({
      data: {
        email: `rewards_user_a_${Date.now()}@siamaqua.com`,
        passwordHash: 'hash',
        accountType: AccountType.PUBLIC_USER,
        name: 'Tanvir Ahmed Referrer',
      },
    });

    testUserB = await prisma.user.create({
      data: {
        email: `rewards_user_b_${Date.now()}@siamaqua.com`,
        passwordHash: 'hash',
        accountType: AccountType.PUBLIC_USER,
        name: 'Saif Islam Referee',
      },
    });
  });

  afterAll(async () => {
    if (testUserA) {
      const accA = await prisma.rewardAccount.findUnique({ where: { userId: testUserA.id } });
      if (accA) {
        await prisma.rewardTransaction.deleteMany({ where: { accountId: accA.id } });
        await prisma.rewardAccount.delete({ where: { id: accA.id } });
      }
      await prisma.user.delete({ where: { id: testUserA.id } });
    }
    if (testUserB) {
      const accB = await prisma.rewardAccount.findUnique({ where: { userId: testUserB.id } });
      if (accB) {
        await prisma.rewardTransaction.deleteMany({ where: { accountId: accB.id } });
        await prisma.rewardAccount.delete({ where: { id: accB.id } });
      }
      await prisma.user.delete({ where: { id: testUserB.id } });
    }
    await prisma.$disconnect();
  });

  it('1. should create reward account with welcome bonus and unique referral code', async () => {
    const acc = await rewardsService.getOrCreateAccount(testUserA.id);

    expect(acc).toBeDefined();
    expect(acc.pointsBalance).toBe(50); // Welcome bonus
    expect(acc.referralCode).toMatch(/^SIAM-[A-Z0-9]{5}$/);
    expect(acc.equivalentDiscountBdt).toBe(5.0); // 50 * 0.10 = ৳5.0
    expect(acc.tierLevel).toBe('BRONZE');
  });

  it('2. should award 1 point per ৳100 spent on completed orders', async () => {
    // ৳1,500 order = 15 points
    const pointsAwarded = await rewardsService.awardOrderPoints(testUserA.id, 'order-12345', 1500);

    expect(pointsAwarded).toBe(15);
    const updated = await rewardsService.getOrCreateAccount(testUserA.id);
    expect(updated.pointsBalance).toBe(65); // 50 + 15 = 65
    expect(updated.lifetimeEarned).toBe(65);
  });

  it('3. should redeem points for discount and enforce max 50% discount cap', async () => {
    // Redeem 50 points = ৳5 discount on order of ৳100
    const redeemRes = await rewardsService.redeemPoints(testUserA.id, {
      pointsToRedeem: 50,
      orderSubtotal: 100,
    });

    expect(redeemRes.redeemedPoints).toBe(50);
    expect(redeemRes.discountAmountBdt).toBe(5.0);
    expect(redeemRes.remainingPoints).toBe(15); // 65 - 50 = 15

    // Expect error if discount exceeds 50% of subtotal
    await expect(
      rewardsService.redeemPoints(testUserA.id, {
        pointsToRedeem: 15, // ৳1.5 discount
        orderSubtotal: 2, // 50% of ৳2 = ৳1.0 max discount
      }),
    ).rejects.toThrow(/cannot exceed 50% of order subtotal/);
  });

  it('4. should process referral claim and reward both referrer and referee', async () => {
    const accA = await rewardsService.getOrCreateAccount(testUserA.id);
    const balanceABefore = accA.pointsBalance;

    // User B claims User A's referral code
    const claimRes = await rewardsService.claimReferral(testUserB.id, accA.referralCode);
    expect(claimRes.success).toBe(true);
    expect(claimRes.awardedPoints).toBe(50);

    // Verify User B received 50 points + 50 signup = 100 points
    const accB = await rewardsService.getOrCreateAccount(testUserB.id);
    expect(accB.pointsBalance).toBe(100);
    expect(accB.referredByCode).toBe(accA.referralCode);

    // Verify User A received 100 referral bonus points
    const accAUpdated = await rewardsService.getOrCreateAccount(testUserA.id);
    expect(accAUpdated.pointsBalance).toBe(balanceABefore + 100);
  });
});
