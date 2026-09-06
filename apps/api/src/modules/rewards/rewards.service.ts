import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import {
  RewardAccountResponse,
  RewardTransactionResponse,
  RedeemPointsDto,
} from '@siam-aqua/shared-types';

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

  // Conversion rate: 100 points = ৳10 BDT discount (1 point = ৳0.10)
  private readonly POINT_TO_BDT_RATE = 0.10;
  // Earn rate: 1 point per ৳100 spent
  private readonly SPEND_PER_POINT = 100;

  async getOrCreateAccount(userId: string): Promise<RewardAccountResponse> {
    let account = await this.prisma.rewardAccount.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!account) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Generate unique referral code
      const randomEntropy = Math.random().toString(36).substring(2, 7).toUpperCase();
      const referralCode = `SIAM-${randomEntropy}`;

      account = await this.prisma.rewardAccount.create({
        data: {
          userId,
          pointsBalance: 50, // Welcome signup bonus
          lifetimeEarned: 50,
          lifetimeRedeemed: 0,
          referralCode,
          tierLevel: 'BRONZE',
          transactions: {
            create: [
              {
                type: 'ADMIN_ADJUSTMENT',
                points: 50,
                balanceAfter: 50,
                description: 'Welcome Sign-up Reward Bonus',
              },
            ],
          },
        },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    }

    // Determine tier level based on lifetime earned
    let tierLevel = 'BRONZE';
    if (account.lifetimeEarned >= 2000) {
      tierLevel = 'PLATINUM';
    } else if (account.lifetimeEarned >= 1000) {
      tierLevel = 'GOLD';
    } else if (account.lifetimeEarned >= 500) {
      tierLevel = 'SILVER';
    }

    if (tierLevel !== account.tierLevel) {
      await this.prisma.rewardAccount.update({
        where: { id: account.id },
        data: { tierLevel },
      });
      account.tierLevel = tierLevel;
    }

    return {
      id: account.id,
      userId: account.userId,
      pointsBalance: account.pointsBalance,
      lifetimeEarned: account.lifetimeEarned,
      lifetimeRedeemed: account.lifetimeRedeemed,
      referralCode: account.referralCode,
      referredByCode: account.referredByCode,
      tierLevel: account.tierLevel,
      equivalentDiscountBdt: Number((account.pointsBalance * this.POINT_TO_BDT_RATE).toFixed(2)),
      recentTransactions: account.transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        points: tx.points,
        balanceAfter: tx.balanceAfter,
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
        description: tx.description,
        createdAt: tx.createdAt.toISOString(),
      })),
    };
  }

  async awardOrderPoints(userId: string, orderId: string, orderTotal: number): Promise<number> {
    const pointsToAward = Math.floor(orderTotal / this.SPEND_PER_POINT);
    if (pointsToAward <= 0) return 0;

    const accountRes = await this.getOrCreateAccount(userId);
    const newBalance = accountRes.pointsBalance + pointsToAward;

    await this.prisma.$transaction([
      this.prisma.rewardAccount.update({
        where: { id: accountRes.id },
        data: {
          pointsBalance: newBalance,
          lifetimeEarned: accountRes.lifetimeEarned + pointsToAward,
        },
      }),
      this.prisma.rewardTransaction.create({
        data: {
          accountId: accountRes.id,
          type: 'EARN_ORDER',
          points: pointsToAward,
          balanceAfter: newBalance,
          referenceType: 'ORDER',
          referenceId: orderId,
          description: `Earned ${pointsToAward} pts on Order #${orderId.slice(0, 8)} (৳${orderTotal})`,
        },
      }),
    ]);

    return pointsToAward;
  }

  async redeemPoints(userId: string, dto: RedeemPointsDto) {
    const accountRes = await this.getOrCreateAccount(userId);

    if (dto.pointsToRedeem <= 0) {
      throw new BadRequestException('Points to redeem must be greater than 0');
    }

    if (dto.pointsToRedeem > accountRes.pointsBalance) {
      throw new BadRequestException(
        `Insufficient points balance. Available: ${accountRes.pointsBalance}, Requested: ${dto.pointsToRedeem}`,
      );
    }

    const discountAmount = Number((dto.pointsToRedeem * this.POINT_TO_BDT_RATE).toFixed(2));
    const maxAllowedDiscount = dto.orderSubtotal * 0.5; // Max 50% order discount

    if (discountAmount > maxAllowedDiscount) {
      throw new BadRequestException(
        `Rewards redemption cannot exceed 50% of order subtotal (Max discount allowed: ৳${maxAllowedDiscount.toFixed(2)})`,
      );
    }

    const newBalance = accountRes.pointsBalance - dto.pointsToRedeem;

    await this.prisma.$transaction([
      this.prisma.rewardAccount.update({
        where: { id: accountRes.id },
        data: {
          pointsBalance: newBalance,
          lifetimeRedeemed: accountRes.lifetimeRedeemed + dto.pointsToRedeem,
        },
      }),
      this.prisma.rewardTransaction.create({
        data: {
          accountId: accountRes.id,
          type: 'REDEEM_ORDER',
          points: -dto.pointsToRedeem,
          balanceAfter: newBalance,
          referenceType: 'ORDER_DISCOUNT',
          description: `Redeemed ${dto.pointsToRedeem} pts for ৳${discountAmount} discount`,
        },
      }),
    ]);

    return {
      redeemedPoints: dto.pointsToRedeem,
      discountAmountBdt: discountAmount,
      remainingPoints: newBalance,
    };
  }

  async claimReferral(userId: string, referralCode: string) {
    const myAccount = await this.getOrCreateAccount(userId);

    if (myAccount.referredByCode) {
      throw new BadRequestException('You have already applied a referral code');
    }

    if (myAccount.referralCode === referralCode) {
      throw new BadRequestException('You cannot use your own referral code');
    }

    const referrerAccount = await this.prisma.rewardAccount.findUnique({
      where: { referralCode },
    });

    if (!referrerAccount) {
      throw new NotFoundException('Invalid referral code');
    }

    // Award 100 points to referrer, 50 points to referee
    const referrerNewBal = referrerAccount.pointsBalance + 100;
    const myNewBal = myAccount.pointsBalance + 50;

    await this.prisma.$transaction([
      // Update referee
      this.prisma.rewardAccount.update({
        where: { id: myAccount.id },
        data: {
          referredByCode: referralCode,
          pointsBalance: myNewBal,
          lifetimeEarned: myAccount.lifetimeEarned + 50,
        },
      }),
      this.prisma.rewardTransaction.create({
        data: {
          accountId: myAccount.id,
          type: 'REFERRAL_BONUS_REFEREE',
          points: 50,
          balanceAfter: myNewBal,
          referenceType: 'REFERRAL',
          referenceId: referrerAccount.userId,
          description: `Referral signup bonus for joining via ${referralCode}`,
        },
      }),
      // Update referrer
      this.prisma.rewardAccount.update({
        where: { id: referrerAccount.id },
        data: {
          pointsBalance: referrerNewBal,
          lifetimeEarned: referrerAccount.lifetimeEarned + 100,
        },
      }),
      this.prisma.rewardTransaction.create({
        data: {
          accountId: referrerAccount.id,
          type: 'REFERRAL_BONUS_REFERRER',
          points: 100,
          balanceAfter: referrerNewBal,
          referenceType: 'REFERRAL',
          referenceId: userId,
          description: `Referral reward for inviting friend`,
        },
      }),
    ]);

    return {
      success: true,
      message: 'Referral code successfully applied! 50 bonus points added.',
      awardedPoints: 50,
      newBalance: myNewBal,
    };
  }
}
