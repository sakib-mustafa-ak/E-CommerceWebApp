import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import {
  BulkQuotationRequestDto,
  BulkQuotationResponse,
  BulkQuotationItemResponse,
  AccountType,
} from '@siam-aqua/shared-types';

@Injectable()
export class BulkOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async generateQuotation(
    buyerId?: string,
    dto?: BulkQuotationRequestDto,
  ): Promise<BulkQuotationResponse> {
    const rawItems = this.extractItems(dto?.rawText, dto?.items);

    if (rawItems.length === 0) {
      throw new BadRequestException('No valid items provided in bulk request');
    }

    let buyerName = dto?.buyerName || 'Bulk Buyer';
    let buyerPhone = dto?.buyerPhone || '01700000000';
    let buyerAccountType = AccountType.WHOLESALER_SELLER;
    let tierCode = 'TIER_A';
    let discountRate = 0.15; // 15% wholesale discount default

    if (buyerId) {
      const user = await this.prisma.user.findUnique({
        where: { id: buyerId },
        include: { customerProfile: { include: { tier: true } } },
      });

      if (user) {
        buyerName = user.name;
        buyerPhone = user.phone || buyerPhone;
        buyerAccountType = user.accountType as any;
        if (user.customerProfile?.tier) {
          tierCode = user.customerProfile.tier.code;
          discountRate = (user.customerProfile.tier.defaultValue || 15) / 100;
        }
      }
    }

    const allProducts = await this.prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        genericName: true,
        mrp: true,
        dosageForm: true,
        strength: true,
      },
    });

    const quoteItems: Array<{
      rawQuery: string;
      matchedProductId?: string | null;
      matchedProductName?: string | null;
      genericName?: string | null;
      requestedQuantity: number;
      unitMrp: number;
      quotedUnitPrice: number;
      totalQuotedPrice: number;
      isAvailable: boolean;
      matchConfidence: 'EXACT_SKU' | 'GENERIC_MATCH' | 'FUZZY_MATCH' | 'NOT_FOUND';
      notes?: string | null;
    }> = [];

    let totalMatched = 0;
    let totalUnmatched = 0;
    let estimatedTotal = 0;

    for (const item of rawItems) {
      const queryClean = item.rawQuery.trim().toLowerCase();
      let matchedProd: any = null;
      let confidence: 'EXACT_SKU' | 'GENERIC_MATCH' | 'FUZZY_MATCH' | 'NOT_FOUND' = 'NOT_FOUND';

      // 1. Exact match on name
      matchedProd = allProducts.find((p) => p.name.toLowerCase() === queryClean);
      if (matchedProd) {
        confidence = 'EXACT_SKU';
      } else {
        // 2. Fuzzy contains match on name
        matchedProd = allProducts.find(
          (p) =>
            p.name.toLowerCase().includes(queryClean) ||
            queryClean.includes(p.name.toLowerCase()),
        );
        if (matchedProd) {
          confidence = 'FUZZY_MATCH';
        } else {
          // 3. Generic name match
          matchedProd = allProducts.find((p) =>
            p.genericName.toLowerCase().includes(queryClean),
          );
          if (matchedProd) {
            confidence = 'GENERIC_MATCH';
          }
        }
      }

      if (matchedProd) {
        totalMatched++;
        const unitMrp = matchedProd.mrp;
        const quotedUnitPrice = Number((unitMrp * (1 - discountRate)).toFixed(2));
        const totalQuotedPrice = Number((quotedUnitPrice * item.requestedQuantity).toFixed(2));
        estimatedTotal += totalQuotedPrice;

        quoteItems.push({
          rawQuery: item.rawQuery,
          matchedProductId: matchedProd.id,
          matchedProductName: matchedProd.name,
          genericName: matchedProd.genericName,
          requestedQuantity: item.requestedQuantity,
          unitMrp,
          quotedUnitPrice,
          totalQuotedPrice,
          isAvailable: true,
          matchConfidence: confidence,
          notes: `Matched to ${matchedProd.name} (${matchedProd.strength})`,
        });
      } else {
        totalUnmatched++;
        quoteItems.push({
          rawQuery: item.rawQuery,
          matchedProductId: null,
          matchedProductName: null,
          genericName: null,
          requestedQuantity: item.requestedQuantity,
          unitMrp: 0,
          quotedUnitPrice: 0,
          totalQuotedPrice: 0,
          isAvailable: false,
          matchConfidence: 'NOT_FOUND',
          notes: 'Item not found in catalog. Will route for manual sourcing.',
        });
      }
    }

    const count = await this.prisma.bulkQuotationRequest.count();
    const entropy = Math.floor(1000 + Math.random() * 9000);
    const quoteNumber = `QUOTE-2026-${String(count + 1).padStart(4, '0')}-${entropy}`;

    const quotation = await this.prisma.bulkQuotationRequest.create({
      data: {
        quoteNumber,
        buyerId: buyerId || null,
        buyerName,
        buyerPhone,
        buyerAccountType,
        tierCode,
        rawInputText: dto?.rawText || null,
        totalMatchedItems: totalMatched,
        totalUnmatchedItems: totalUnmatched,
        estimatedTotalBdt: Number(estimatedTotal.toFixed(2)),
        status: 'QUOTED',
        items: {
          create: quoteItems,
        },
      },
      include: {
        items: true,
      },
    });

    return {
      id: quotation.id,
      quoteNumber: quotation.quoteNumber,
      buyerId: quotation.buyerId,
      buyerName: quotation.buyerName,
      buyerPhone: quotation.buyerPhone,
      buyerAccountType: quotation.buyerAccountType,
      tierCode: quotation.tierCode,
      totalMatchedItems: quotation.totalMatchedItems,
      totalUnmatchedItems: quotation.totalUnmatchedItems,
      estimatedTotalBdt: quotation.estimatedTotalBdt,
      status: quotation.status,
      convertedOrderId: quotation.convertedOrderId,
      createdAt: quotation.createdAt.toISOString(),
      items: quotation.items.map((i) => ({
        id: i.id,
        rawQuery: i.rawQuery,
        matchedProductId: i.matchedProductId,
        matchedProductName: i.matchedProductName,
        genericName: i.genericName,
        requestedQuantity: i.requestedQuantity,
        unitMrp: i.unitMrp,
        quotedUnitPrice: i.quotedUnitPrice,
        totalQuotedPrice: i.totalQuotedPrice,
        isAvailable: i.isAvailable,
        matchConfidence: i.matchConfidence as any,
        notes: i.notes,
      })),
    };
  }

  async getQuotationByNumber(quoteNumber: string): Promise<BulkQuotationResponse> {
    const quotation = await this.prisma.bulkQuotationRequest.findUnique({
      where: { quoteNumber },
      include: { items: true },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation not found: ${quoteNumber}`);
    }

    return {
      id: quotation.id,
      quoteNumber: quotation.quoteNumber,
      buyerId: quotation.buyerId,
      buyerName: quotation.buyerName,
      buyerPhone: quotation.buyerPhone,
      buyerAccountType: quotation.buyerAccountType,
      tierCode: quotation.tierCode,
      totalMatchedItems: quotation.totalMatchedItems,
      totalUnmatchedItems: quotation.totalUnmatchedItems,
      estimatedTotalBdt: quotation.estimatedTotalBdt,
      status: quotation.status,
      convertedOrderId: quotation.convertedOrderId,
      createdAt: quotation.createdAt.toISOString(),
      items: quotation.items.map((i) => ({
        id: i.id,
        rawQuery: i.rawQuery,
        matchedProductId: i.matchedProductId,
        matchedProductName: i.matchedProductName,
        genericName: i.genericName,
        requestedQuantity: i.requestedQuantity,
        unitMrp: i.unitMrp,
        quotedUnitPrice: i.quotedUnitPrice,
        totalQuotedPrice: i.totalQuotedPrice,
        isAvailable: i.isAvailable,
        matchConfidence: i.matchConfidence as any,
        notes: i.notes,
      })),
    };
  }

  private extractItems(
    rawText?: string,
    items?: Array<{ rawQuery: string; requestedQuantity: number }>,
  ): Array<{ rawQuery: string; requestedQuantity: number }> {
    if (items && items.length > 0) {
      return items;
    }

    if (!rawText) return [];

    const extracted: Array<{ rawQuery: string; requestedQuantity: number }> = [];
    const lines = rawText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check CSV or delimiter like "Napa Extra, 50" or "Ace 500mg - 20" or "Sergel 20mg x 10"
      const match = trimmed.match(/^(.+?)[,\-x\t]\s*(\d+)\s*$/i);
      if (match) {
        extracted.push({
          rawQuery: match[1].trim(),
          requestedQuantity: parseInt(match[2], 10) || 1,
        });
      } else {
        extracted.push({
          rawQuery: trimmed,
          requestedQuantity: 10, // default bulk minimum
        });
      }
    }

    return extracted;
  }
}
