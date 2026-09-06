import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import {
  FlashSaleDealDto,
  FlashSaleDealResponse,
  ProductBundleDealDto,
  ProductBundleDealResponse,
} from '@siam-aqua/shared-types';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  async createFlashSale(dto: FlashSaleDealDto): Promise<FlashSaleDealResponse> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product not found: ${dto.productId}`);
    }

    if (dto.flashPriceBdt >= product.mrp) {
      throw new BadRequestException(
        `Flash price (৳${dto.flashPriceBdt}) must be lower than original MRP (৳${product.mrp})`,
      );
    }

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (end <= start) {
      throw new BadRequestException('End time must be after start time');
    }

    const discountPercent = Number(
      (((product.mrp - dto.flashPriceBdt) / product.mrp) * 100).toFixed(1),
    );

    const slug = `flash-${product.slug}-${Date.now()}`;

    const deal = await this.prisma.flashSaleDeal.create({
      data: {
        title: dto.title,
        slug,
        productId: product.id,
        flashPriceBdt: dto.flashPriceBdt,
        originalMrp: product.mrp,
        discountPercent,
        quotaLimit: dto.quotaLimit || 50,
        quotaClaimed: 0,
        startTime: start,
        endTime: end,
        isActive: true,
      },
      include: {
        product: true,
      },
    });

    return {
      id: deal.id,
      title: deal.title,
      slug: deal.slug,
      productId: deal.productId,
      productName: deal.product.name,
      productSlug: deal.product.slug,
      flashPriceBdt: deal.flashPriceBdt,
      originalMrp: deal.originalMrp,
      discountPercent: deal.discountPercent,
      quotaLimit: deal.quotaLimit,
      quotaClaimed: deal.quotaClaimed,
      remainingQuota: deal.quotaLimit - deal.quotaClaimed,
      startTime: deal.startTime.toISOString(),
      endTime: deal.endTime.toISOString(),
      isActive: deal.isActive,
      isExpired: new Date() > deal.endTime,
    };
  }

  async getActiveFlashSales(): Promise<FlashSaleDealResponse[]> {
    const now = new Date();
    const deals = await this.prisma.flashSaleDeal.findMany({
      where: {
        isActive: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
      include: { product: true },
      orderBy: { discountPercent: 'desc' },
    });

    return deals
      .filter((d) => d.quotaClaimed < d.quotaLimit)
      .map((deal) => ({
        id: deal.id,
        title: deal.title,
        slug: deal.slug,
        productId: deal.productId,
        productName: deal.product.name,
        productSlug: deal.product.slug,
        flashPriceBdt: deal.flashPriceBdt,
        originalMrp: deal.originalMrp,
        discountPercent: deal.discountPercent,
        quotaLimit: deal.quotaLimit,
        quotaClaimed: deal.quotaClaimed,
        remainingQuota: deal.quotaLimit - deal.quotaClaimed,
        startTime: deal.startTime.toISOString(),
        endTime: deal.endTime.toISOString(),
        isActive: deal.isActive,
        isExpired: false,
      }));
  }

  async createProductBundle(dto: ProductBundleDealDto): Promise<ProductBundleDealResponse> {
    if (!dto.items || dto.items.length < 2) {
      throw new BadRequestException('A bundle deal must contain at least 2 items');
    }

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more bundle products not found');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalMrp = 0;
    const enrichedItems: Array<{
      productId: string;
      productName: string;
      productSlug: string;
      quantity: number;
      unitMrp: number;
    }> = [];

    for (const item of dto.items) {
      const prod = productMap.get(item.productId)!;
      totalMrp += prod.mrp * item.quantity;
      enrichedItems.push({
        productId: prod.id,
        productName: prod.name,
        productSlug: prod.slug,
        quantity: item.quantity,
        unitMrp: prod.mrp,
      });
    }

    if (dto.bundlePriceBdt >= totalMrp) {
      throw new BadRequestException(
        `Bundle price (৳${dto.bundlePriceBdt}) must provide a discount over total MRP (৳${totalMrp})`,
      );
    }

    const savingsPercent = Number((((totalMrp - dto.bundlePriceBdt) / totalMrp) * 100).toFixed(1));
    const slug = `bundle-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const bundle = await this.prisma.productBundleDeal.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description || null,
        bundlePriceBdt: dto.bundlePriceBdt,
        totalMrpBdt: totalMrp,
        savingsPercent,
        itemsJson: JSON.stringify(enrichedItems),
        isActive: true,
      },
    });

    return {
      id: bundle.id,
      title: bundle.title,
      slug: bundle.slug,
      description: bundle.description,
      bundlePriceBdt: bundle.bundlePriceBdt,
      totalMrpBdt: bundle.totalMrpBdt,
      savingsPercent: bundle.savingsPercent,
      items: enrichedItems,
      isActive: bundle.isActive,
    };
  }

  async getActiveBundles(): Promise<ProductBundleDealResponse[]> {
    const bundles = await this.prisma.productBundleDeal.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return bundles.map((b) => ({
      id: b.id,
      title: b.title,
      slug: b.slug,
      description: b.description,
      bundlePriceBdt: b.bundlePriceBdt,
      totalMrpBdt: b.totalMrpBdt,
      savingsPercent: b.savingsPercent,
      items: JSON.parse(b.itemsJson),
      isActive: b.isActive,
    }));
  }
}
