import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import {
  CreatePriceDropSubscriptionDto,
  PriceDropAlertResponse,
} from '@siam-aqua/shared-types';

@Injectable()
export class PriceAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribePriceDrop(
    userId?: string,
    dto?: CreatePriceDropSubscriptionDto,
  ): Promise<PriceDropAlertResponse> {
    if (!dto?.productId) {
      throw new BadRequestException('Product ID is required');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product not found: ${dto.productId}`);
    }

    const targetPrice = dto.targetPriceBdt || product.mrp * 0.9; // Default 10% drop target

    const subscription = await this.prisma.priceDropSubscription.create({
      data: {
        userId: userId || null,
        customerEmail: dto.customerEmail || null,
        customerPhone: dto.customerPhone || null,
        productId: product.id,
        baselineMrp: product.mrp,
        targetPriceBdt: targetPrice,
        isNotified: false,
      },
      include: {
        product: true,
      },
    });

    return {
      id: subscription.id,
      productId: subscription.productId,
      productName: subscription.product.name,
      productSlug: subscription.product.slug,
      baselineMrp: subscription.baselineMrp,
      currentMrp: subscription.product.mrp,
      targetPriceBdt: subscription.targetPriceBdt,
      savingsBdt: 0,
      savingsPercent: 0,
      isTriggered: false,
      isNotified: subscription.isNotified,
    };
  }

  async checkAndTriggerPriceDrops(): Promise<PriceDropAlertResponse[]> {
    const subscriptions = await this.prisma.priceDropSubscription.findMany({
      where: { isNotified: false },
      include: { product: true },
    });

    const triggered: PriceDropAlertResponse[] = [];

    for (const sub of subscriptions) {
      const currentPrice = sub.product.mrp;
      if (currentPrice <= sub.targetPriceBdt || currentPrice < sub.baselineMrp) {
        const savingsBdt = Number((sub.baselineMrp - currentPrice).toFixed(2));
        const savingsPercent = Number(
          (((sub.baselineMrp - currentPrice) / sub.baselineMrp) * 100).toFixed(1),
        );

        await this.prisma.priceDropSubscription.update({
          where: { id: sub.id },
          data: {
            isNotified: true,
            lastNotifiedPrice: currentPrice,
          },
        });

        triggered.push({
          id: sub.id,
          productId: sub.productId,
          productName: sub.product.name,
          productSlug: sub.product.slug,
          baselineMrp: sub.baselineMrp,
          currentMrp: currentPrice,
          targetPriceBdt: sub.targetPriceBdt,
          savingsBdt,
          savingsPercent,
          isTriggered: true,
          isNotified: true,
        });
      }
    }

    return triggered;
  }

  async getMyAlerts(userId: string): Promise<PriceDropAlertResponse[]> {
    const subscriptions = await this.prisma.priceDropSubscription.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map((sub) => {
      const currentPrice = sub.product.mrp;
      const savingsBdt =
        currentPrice < sub.baselineMrp
          ? Number((sub.baselineMrp - currentPrice).toFixed(2))
          : 0;
      const savingsPercent =
        currentPrice < sub.baselineMrp
          ? Number((((sub.baselineMrp - currentPrice) / sub.baselineMrp) * 100).toFixed(1))
          : 0;

      return {
        id: sub.id,
        productId: sub.productId,
        productName: sub.product.name,
        productSlug: sub.product.slug,
        baselineMrp: sub.baselineMrp,
        currentMrp: currentPrice,
        targetPriceBdt: sub.targetPriceBdt,
        savingsBdt,
        savingsPercent,
        isTriggered: currentPrice <= sub.targetPriceBdt || currentPrice < sub.baselineMrp,
        isNotified: sub.isNotified,
      };
    });
  }
}
