import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import {
  BehaviorEventDto,
  RecommendationItemResponse,
  FrequentlyBoughtTogetherResponse,
} from '@siam-aqua/shared-types';

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------
  // 1. BEHAVIOR EVENT TRACKING
  // ----------------------------------------------------

  async trackBehaviorEvent(
    userId: string | undefined,
    guestSessionId: string | undefined,
    dto: BehaviorEventDto,
  ) {
    if (!dto.eventType) {
      throw new BadRequestException('Event type is required.');
    }

    return this.prisma.userBehaviorLog.create({
      data: {
        userId: userId || null,
        guestSessionId: dto.guestSessionId || guestSessionId || null,
        eventType: dto.eventType,
        productId: dto.productId || null,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
      },
    });
  }

  // ----------------------------------------------------
  // 2. PERSONALIZED RECOMMENDATIONS (Affinities)
  // ----------------------------------------------------

  async getPersonalizedRecommendations(
    userId?: string,
    guestSessionId?: string,
    limit: number = 8,
  ): Promise<RecommendationItemResponse[]> {
    const whereLog: any = {};
    if (userId) {
      whereLog.userId = userId;
    } else if (guestSessionId) {
      whereLog.guestSessionId = guestSessionId;
    }

    // Fetch user's recent behavior logs (last 30 days)
    const logs = whereLog.userId || whereLog.guestSessionId
      ? await this.prisma.userBehaviorLog.findMany({
          where: {
            ...whereLog,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      : [];

    const viewedProductIds = logs
      .map((l) => l.productId)
      .filter((id): id is string => Boolean(id));

    let affinityGenerics: string[] = [];
    let affinityCategories: string[] = [];

    if (viewedProductIds.length > 0) {
      const interactedProducts = await this.prisma.product.findMany({
        where: { id: { in: viewedProductIds } },
        include: { generic: true },
      });

      affinityGenerics = interactedProducts
        .map((p) => p.generic?.name || p.genericName)
        .filter((g): g is string => Boolean(g));

      affinityCategories = interactedProducts
        .map((p) => p.category)
        .filter((c): c is string => Boolean(c));
    }

    // Find candidate products
    const candidateWhere: any = {};

    if (affinityGenerics.length > 0 || affinityCategories.length > 0) {
      candidateWhere.OR = [
        { genericName: { in: affinityGenerics } },
        { category: { in: affinityCategories } },
      ];
    }

    let candidates = await this.prisma.product.findMany({
      where: candidateWhere,
      include: { generic: true, company: true },
      take: limit * 3,
    });

    // Fallback if sparse
    if (candidates.length < limit) {
      const moreProducts = await this.prisma.product.findMany({
        include: { generic: true, company: true },
        take: limit,
      });
      candidates = Array.from(
        new Map([...candidates, ...moreProducts].map((p) => [p.id, p])).values(),
      );
    }

    // Sort candidates by affinity relevance: exact generic matches first, then category matches
    candidates.sort((a, b) => {
      const aGeneric = a.generic?.name || a.genericName;
      const bGeneric = b.generic?.name || b.genericName;
      const aGenericMatch = affinityGenerics.includes(aGeneric) ? 2 : 0;
      const bGenericMatch = affinityGenerics.includes(bGeneric) ? 2 : 0;
      const aCatMatch = affinityCategories.includes(a.category) ? 1 : 0;
      const bCatMatch = affinityCategories.includes(b.category) ? 1 : 0;
      return (bGenericMatch + bCatMatch) - (aGenericMatch + aCatMatch);
    });

    return candidates.slice(0, limit).map((p) => {
      const isGenericAffinity = affinityGenerics.includes(p.generic?.name || p.genericName || '');
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        genericName: p.generic?.name || p.genericName || null,
        dosageForm: p.dosageForm || null,
        companyName: p.company?.name || null,
        priceBdt: p.mrp,
        mrpBdt: p.mrp,
        categoryName: p.category,
        stockCount: p.offerParaStockQty || 100,
        recommendationScore: isGenericAffinity ? 0.98 : 0.85,
        recommendationReason: isGenericAffinity
          ? 'Based on your interest in active generic formulas'
          : 'Popular among verified pharma buyers',
      };
    });
  }

  // ----------------------------------------------------
  // 3. FREQUENTLY BOUGHT TOGETHER (Order Co-occurrence)
  // ----------------------------------------------------

  async getFrequentlyBoughtTogether(
    productId: string,
    limit: number = 3,
  ): Promise<FrequentlyBoughtTogetherResponse> {
    const mainProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { generic: true, company: true },
    });

    if (!mainProduct) {
      throw new NotFoundException(`Product with ID "${productId}" not found.`);
    }

    // Find orders that contain this product
    const orderItemsWithMain = await this.prisma.orderItem.findMany({
      where: { productId },
      select: { orderId: true },
      take: 100,
    });

    const orderIds = orderItemsWithMain.map((oi) => oi.orderId);
    let coOccurringProductIds: string[] = [];

    if (orderIds.length > 0) {
      const coOrderItems = await this.prisma.orderItem.findMany({
        where: {
          orderId: { in: orderIds },
          productId: { not: productId },
        },
        select: { productId: true },
      });

      // Count frequency
      const freqMap = new Map<string, number>();
      for (const item of coOrderItems) {
        freqMap.set(item.productId, (freqMap.get(item.productId) || 0) + 1);
      }

      coOccurringProductIds = Array.from(freqMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => id);
    }

    let bundledProducts = await this.prisma.product.findMany({
      where: {
        id: { in: coOccurringProductIds },
      },
      include: { generic: true, company: true },
    });

    // Fallback if not enough co-occurring orders exist yet
    if (bundledProducts.length < limit) {
      const fallback = await this.prisma.product.findMany({
        where: {
          id: { not: productId },
        },
        include: { generic: true, company: true },
        take: limit - bundledProducts.length,
      });
      bundledProducts = [...bundledProducts, ...fallback];
    }

    const mainMapped = this.mapProductToRecommendation(
      mainProduct,
      1.0,
      'Main Selected Medicine',
    );
    const bundledMapped = bundledProducts.map((p) =>
      this.mapProductToRecommendation(p, 0.9, 'Frequently bought together with this product'),
    );

    const mainPrice = mainMapped.priceBdt;
    const bundleItemsSum = bundledMapped.reduce((sum, p) => sum + p.priceBdt, 0);
    const bundleOriginalPriceBdt = Math.round((mainPrice + bundleItemsSum) * 100) / 100;
    // 5% Bundle Discount incentive
    const bundleDiscountSavingsBdt = Math.round(bundleOriginalPriceBdt * 0.05 * 100) / 100;
    const bundleTotalPriceBdt =
      Math.round((bundleOriginalPriceBdt - bundleDiscountSavingsBdt) * 100) / 100;

    return {
      mainProduct: mainMapped,
      bundledProducts: bundledMapped,
      bundleTotalPriceBdt,
      bundleOriginalPriceBdt,
      bundleDiscountSavingsBdt,
    };
  }

  // ----------------------------------------------------
  // 4. GENERIC DRUG SUBSTITUTES & EQUIVALENT BRANDS
  // ----------------------------------------------------

  async getGenericSubstitutes(
    productId: string,
    limit: number = 6,
  ): Promise<RecommendationItemResponse[]> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { generic: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const genericName = product.generic?.name || product.genericName;
    if (!genericName) {
      return [];
    }

    const substitutes = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        OR: [
          { genericName: { equals: genericName } },
          ...(product.genericId ? [{ genericId: product.genericId }] : []),
        ],
      },
      include: { generic: true, company: true },
      orderBy: { mrp: 'asc' },
      take: limit,
    });

    return substitutes.map((sub) => {
      const originalPrice = product.mrp || 10;
      const subPrice = sub.mrp || 10;
      const savingsPct =
        subPrice < originalPrice
          ? Math.round(((originalPrice - subPrice) / originalPrice) * 100)
          : 0;

      return {
        ...this.mapProductToRecommendation(
          sub,
          0.98,
          savingsPct > 0
            ? `Equivalent formula — Save ${savingsPct}% vs current selection`
            : 'Exact active generic ingredient & dosage equivalent',
        ),
        discountPercentage: savingsPct > 0 ? savingsPct : undefined,
      };
    });
  }

  // ----------------------------------------------------
  // 5. TRENDING PRODUCTS (7-Day Conversion Velocity)
  // ----------------------------------------------------

  async getTrendingProducts(limit: number = 8): Promise<RecommendationItemResponse[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    const logs = await this.prisma.userBehaviorLog.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        productId: { not: null },
      },
      select: {
        productId: true,
        eventType: true,
      },
    });

    const scoreMap = new Map<string, number>();
    for (const log of logs) {
      if (!log.productId) continue;
      let weight = 1;
      if (log.eventType === 'PRODUCT_PURCHASED') weight = 5;
      else if (log.eventType === 'PRODUCT_ADDED_TO_CART') weight = 3;
      else if (log.eventType === 'PRODUCT_VIEWED') weight = 1;

      scoreMap.set(log.productId, (scoreMap.get(log.productId) || 0) + weight);
    }

    const topProductIds = Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    let trendingProducts = await this.prisma.product.findMany({
      where: {
        id: { in: topProductIds },
      },
      include: { generic: true, company: true },
    });

    // Fallback if sparse logs
    if (trendingProducts.length < limit) {
      const fallback = await this.prisma.product.findMany({
        include: { generic: true, company: true },
        take: limit,
      });
      trendingProducts = Array.from(
        new Map([...trendingProducts, ...fallback].map((p) => [p.id, p])).values(),
      );
    }

    return trendingProducts.slice(0, limit).map((p) =>
      this.mapProductToRecommendation(p, 0.95, 'High order velocity in last 7 days'),
    );
  }

  // ----------------------------------------------------
  // HELPER MAPPERS
  // ----------------------------------------------------

  private mapProductToRecommendation(
    p: any,
    score: number,
    reason: string,
  ): RecommendationItemResponse {
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      genericName: p.generic?.name || p.genericName || null,
      dosageForm: p.dosageForm || null,
      companyName: p.company?.name || null,
      priceBdt: p.mrp || 10,
      mrpBdt: p.mrp || 10,
      categoryName: p.category || 'Allopathic',
      stockCount: p.offerParaStockQty || 100,
      recommendationScore: score,
      recommendationReason: reason,
    };
  }
}
