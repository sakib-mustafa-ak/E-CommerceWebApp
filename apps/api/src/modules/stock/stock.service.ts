import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import {
  AccountType,
  InventoryAnalyticsSummary,
  StockAlertSummary,
  StockBatchDto,
  StockBatchResponse,
  StockSaleCreateDto,
  StockSaleResponse,
} from '@siam-aqua/shared-types';
import { PricingEngine } from '@siam-aqua/pricing';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  private mapBatchToResponse(batch: any): StockBatchResponse {
    const now = new Date();
    const expiry = new Date(batch.expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      productId: batch.productId,
      productName: batch.product?.name || 'Unknown Product',
      genericName: batch.product?.genericName || '',
      companyName: batch.product?.company?.name || '',
      ownerId: batch.ownerId,
      ownerName: batch.owner?.name || batch.owner?.customerProfile?.shopName || 'Owner',
      initialQuantity: batch.initialQuantity,
      currentQuantity: batch.currentQuantity,
      purchaseCost: batch.purchaseCost,
      sellingPrice: batch.sellingPrice,
      wholesalePrice: batch.wholesalePrice,
      mfgDate: batch.mfgDate ? batch.mfgDate.toISOString() : null,
      expiryDate: batch.expiryDate.toISOString(),
      supplierName: batch.supplierName,
      lowStockThreshold: batch.lowStockThreshold,
      isLowStock: batch.currentQuantity <= batch.lowStockThreshold,
      isExpiringSoon: diffDays <= 90 && diffDays > 0,
      daysUntilExpiry: diffDays,
      notes: batch.notes,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // 1. Stock Intake & Batch Creation
  // ---------------------------------------------------------------------------
  async createBatch(ownerId: string, dto: StockBatchDto): Promise<StockBatchResponse> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { company: true },
    });

    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }

    if (!dto.initialQuantity || dto.initialQuantity <= 0) {
      throw new BadRequestException('Initial quantity must be at least 1');
    }

    if (dto.purchaseCost === undefined || dto.purchaseCost < 0) {
      throw new BadRequestException('Purchase cost must be a non-negative number');
    }

    const expiryDate = new Date(dto.expiryDate);
    if (isNaN(expiryDate.getTime())) {
      throw new BadRequestException('Invalid expiry date format');
    }

    // Generate unique batch number if not provided
    const count = await this.prisma.stockBatch.count({ where: { ownerId } });
    const entropy = Math.floor(1000 + Math.random() * 9000);
    const batchNumber =
      dto.batchNumber || `BAT-2026-${String(count + 1).padStart(4, '0')}-${entropy}`;

    const batch = await this.prisma.stockBatch.create({
      data: {
        batchNumber,
        productId: dto.productId,
        ownerId,
        initialQuantity: dto.initialQuantity,
        currentQuantity: dto.initialQuantity,
        purchaseCost: dto.purchaseCost,
        sellingPrice: dto.sellingPrice || product.mrp,
        wholesalePrice: dto.wholesalePrice || product.mrp * 0.85,
        mfgDate: dto.mfgDate ? new Date(dto.mfgDate) : null,
        expiryDate,
        supplierName: dto.supplierName || null,
        lowStockThreshold: dto.lowStockThreshold || 10,
        notes: dto.notes || null,
      },
      include: {
        product: { include: { company: true } },
        owner: { include: { customerProfile: true } },
      },
    });

    // If product is Offer Para Live Stock, update live stock count
    if (product.isOfferParaLiveStock) {
      const totalLiveQty = await this.prisma.stockBatch.aggregate({
        where: { productId: product.id, currentQuantity: { gt: 0 } },
        _sum: { currentQuantity: true },
      });
      await this.prisma.product.update({
        where: { id: product.id },
        data: { offerParaStockQty: totalLiveQty._sum.currentQuantity || 0 },
      });
    }

    return this.mapBatchToResponse(batch);
  }

  // ---------------------------------------------------------------------------
  // 2. Fetch Batches with Multi-Tenant Isolation
  // ---------------------------------------------------------------------------
  async getBatches(
    userId: string,
    accountType: string,
    params?: { filterOwnerId?: string; productId?: string },
  ): Promise<StockBatchResponse[]> {
    const isSuperAdmin = accountType === AccountType.SUPER_ADMIN;
    const targetOwnerId = isSuperAdmin && params?.filterOwnerId ? params.filterOwnerId : userId;

    const where: any = {
      ownerId: targetOwnerId,
    };

    if (params?.productId) {
      where.productId = params.productId;
    }

    const batches = await this.prisma.stockBatch.findMany({
      where,
      include: {
        product: { include: { company: true } },
        owner: { include: { customerProfile: true } },
      },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
    });

    return batches.map((b) => this.mapBatchToResponse(b));
  }

  // ---------------------------------------------------------------------------
  // 3. Total Valuation, Margin & Inventory Analytics
  // ---------------------------------------------------------------------------
  async getInventorySummary(
    userId: string,
    accountType: string,
    filterOwnerId?: string,
  ): Promise<InventoryAnalyticsSummary> {
    const isSuperAdmin = accountType === AccountType.SUPER_ADMIN;
    const targetOwnerId = isSuperAdmin && filterOwnerId ? filterOwnerId : userId;

    const batches = await this.prisma.stockBatch.findMany({
      where: { ownerId: targetOwnerId, currentQuantity: { gt: 0 } },
    });

    const uniqueProductIds = new Set(batches.map((b) => b.productId));
    const totalBatchesCount = batches.length;
    let totalStockUnits = 0;
    let totalValuationAtCost = 0;
    let totalPotentialRevenue = 0;
    let lowStockAlertsCount = 0;
    let expiringSoonAlertsCount = 0;

    const now = new Date();

    for (const b of batches) {
      totalStockUnits += b.currentQuantity;
      totalValuationAtCost += b.currentQuantity * b.purchaseCost;
      totalPotentialRevenue += b.currentQuantity * b.sellingPrice;

      if (b.currentQuantity <= b.lowStockThreshold) {
        lowStockAlertsCount++;
      }

      const diffDays = Math.ceil((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 90 && diffDays > 0) {
        expiringSoonAlertsCount++;
      }
    }

    const estimatedNetProfit = totalPotentialRevenue - totalValuationAtCost;
    const overallMarginPercent =
      totalPotentialRevenue > 0
        ? PricingEngine.roundToTwoDecimals((estimatedNetProfit / totalPotentialRevenue) * 100)
        : 0;

    return {
      totalProductsCount: uniqueProductIds.size,
      totalBatchesCount,
      totalStockUnits,
      totalValuationAtCost: PricingEngine.roundToTwoDecimals(totalValuationAtCost),
      totalPotentialRevenue: PricingEngine.roundToTwoDecimals(totalPotentialRevenue),
      estimatedNetProfit: PricingEngine.roundToTwoDecimals(estimatedNetProfit),
      overallMarginPercent,
      lowStockAlertsCount,
      expiringSoonAlertsCount,
      reorderSuggestionsCount: lowStockAlertsCount,
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Proactive Alerts: Expiry & Low-Stock Warnings Ahead of Time
  // ---------------------------------------------------------------------------
  async getAlerts(
    userId: string,
    accountType: string,
    daysAhead = 90,
    filterOwnerId?: string,
  ): Promise<StockAlertSummary> {
    const isSuperAdmin = accountType === AccountType.SUPER_ADMIN;
    const targetOwnerId = isSuperAdmin && filterOwnerId ? filterOwnerId : userId;

    const now = new Date();
    const alertThresholdDate = new Date();
    alertThresholdDate.setDate(alertThresholdDate.getDate() + daysAhead);

    // 1. Fetch expiring batches
    const expiringBatchesRaw = await this.prisma.stockBatch.findMany({
      where: {
        ownerId: targetOwnerId,
        currentQuantity: { gt: 0 },
        expiryDate: { lte: alertThresholdDate },
      },
      include: { product: true },
      orderBy: { expiryDate: 'asc' },
    });

    const expiringBatches = expiringBatchesRaw.map((b) => {
      const diffDays = Math.ceil((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      let urgencyLevel: 'CRITICAL' | 'WARNING' | 'NOTICE' = 'NOTICE';
      if (diffDays <= 30) urgencyLevel = 'CRITICAL';
      else if (diffDays <= 60) urgencyLevel = 'WARNING';

      return {
        batchId: b.id,
        batchNumber: b.batchNumber,
        productId: b.productId,
        productName: b.product.name,
        currentQuantity: b.currentQuantity,
        expiryDate: b.expiryDate.toISOString(),
        daysUntilExpiry: diffDays,
        urgencyLevel,
      };
    });

    // 2. Fetch low-stock batches grouped by product
    const allBatches = await this.prisma.stockBatch.findMany({
      where: { ownerId: targetOwnerId, currentQuantity: { gt: 0 } },
      include: { product: { include: { company: true } } },
    });

    const productQtyMap = new Map<
      string,
      { product: any; totalQty: number; lowStockThreshold: number }
    >();

    for (const b of allBatches) {
      const existing = productQtyMap.get(b.productId) || {
        product: b.product,
        totalQty: 0,
        lowStockThreshold: b.lowStockThreshold,
      };
      existing.totalQty += b.currentQuantity;
      productQtyMap.set(b.productId, existing);
    }

    const lowStockProducts: any[] = [];
    const reorderSuggestions: any[] = [];

    for (const [productId, info] of productQtyMap.entries()) {
      if (info.totalQty <= info.lowStockThreshold) {
        lowStockProducts.push({
          productId,
          productName: info.product.name,
          companyName: info.product.company.name,
          currentQuantity: info.totalQty,
          lowStockThreshold: info.lowStockThreshold,
          suggestedReorderQuantity: info.lowStockThreshold * 3,
        });

        reorderSuggestions.push({
          productId,
          productName: info.product.name,
          dailySalesVelocity: 2.5, // units/day average
          currentStockDaysLeft: Math.max(1, Math.round(info.totalQty / 2.5)),
          recommendedOrderQty: info.lowStockThreshold * 3,
        });
      }
    }

    return {
      lowStockProducts,
      expiringBatches,
      reorderSuggestions,
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Record Retail / Wholesale Sale with Discount Tiers & FIFO Batch Deduction
  // ---------------------------------------------------------------------------
  async recordSale(
    ownerId: string,
    dto: StockSaleCreateDto,
  ): Promise<StockSaleResponse> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required for a sale');
    }

    let subtotal = 0;
    let totalCost = 0;
    const saleItemsToCreate: any[] = [];

    for (const itemInput of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: itemInput.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product ${itemInput.productId} not found`);
      }

      const requestedQty = Math.max(1, itemInput.quantity);

      // Find available batches for this product and owner in FIFO order (by expiryDate asc)
      const batches = await this.prisma.stockBatch.findMany({
        where: {
          productId: product.id,
          ownerId,
          currentQuantity: { gt: 0 },
        },
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
      });

      const totalAvailable = batches.reduce((sum, b) => sum + b.currentQuantity, 0);
      if (totalAvailable < requestedQty) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${totalAvailable}, Requested: ${requestedQty}`,
        );
      }

      // Deduct from batches FIFO
      let remainingToDeduct = requestedQty;
      let itemTotalCost = 0;

      for (const batch of batches) {
        if (remainingToDeduct <= 0) break;

        const deductFromThis = Math.min(batch.currentQuantity, remainingToDeduct);
        const newBatchQty = batch.currentQuantity - deductFromThis;

        await this.prisma.stockBatch.update({
          where: { id: batch.id },
          data: { currentQuantity: newBatchQty },
        });

        itemTotalCost += deductFromThis * batch.purchaseCost;
        remainingToDeduct -= deductFromThis;
      }

      // Determine unit price based on saleType
      let unitPrice = itemInput.customUnitPrice;
      if (unitPrice === undefined) {
        unitPrice = dto.saleType === 'WHOLESALE' ? product.mrp * 0.85 : product.mrp;
      }

      const itemTotalPrice = PricingEngine.roundToTwoDecimals(unitPrice * requestedQty);
      const itemProfit = PricingEngine.roundToTwoDecimals(itemTotalPrice - itemTotalCost);

      subtotal += itemTotalPrice;
      totalCost += itemTotalCost;

      saleItemsToCreate.push({
        productId: product.id,
        productName: product.name,
        quantity: requestedQty,
        unitCost: PricingEngine.roundToTwoDecimals(itemTotalCost / requestedQty),
        unitPrice,
        totalPrice: itemTotalPrice,
        profit: itemProfit,
      });

      // Update offerParaStockQty if it's Offer Para live stock
      if (product.isOfferParaLiveStock) {
        const remainingLive = await this.prisma.stockBatch.aggregate({
          where: { productId: product.id, currentQuantity: { gt: 0 } },
          _sum: { currentQuantity: true },
        });
        await this.prisma.product.update({
          where: { id: product.id },
          data: { offerParaStockQty: remainingLive._sum.currentQuantity || 0 },
        });
      }
    }

    // Apply retail discount percentage if provided (e.g. 5%, 8%, 10%)
    const discountPercent = dto.discountPercent || 0;
    const discountAmount = PricingEngine.roundToTwoDecimals(subtotal * (discountPercent / 100));
    const totalAmount = PricingEngine.roundToTwoDecimals(subtotal - discountAmount);
    const profitMargin = PricingEngine.roundToTwoDecimals(totalAmount - totalCost);
    const profitMarginPercent =
      totalAmount > 0 ? PricingEngine.roundToTwoDecimals((profitMargin / totalAmount) * 100) : 0;

    // Generate unique receipt number
    const saleCount = await this.prisma.stockSaleRecord.count({ where: { ownerId } });
    const entropy = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `REC-2026-${String(saleCount + 1).padStart(4, '0')}-${entropy}`;

    const createdRecord = await this.prisma.stockSaleRecord.create({
      data: {
        receiptNumber,
        ownerId,
        saleType: dto.saleType || 'RETAIL',
        customerName: dto.customerName || null,
        customerPhone: dto.customerPhone || null,
        subtotal,
        discountPercent,
        discountAmount,
        totalAmount,
        totalCost: PricingEngine.roundToTwoDecimals(totalCost),
        profitMargin,
        paymentMethod: dto.paymentMethod || 'CASH',
        notes: dto.notes || null,
        items: {
          create: saleItemsToCreate,
        },
      },
      include: {
        items: true,
      },
    });

    return {
      id: createdRecord.id,
      receiptNumber: createdRecord.receiptNumber,
      ownerId: createdRecord.ownerId,
      saleType: createdRecord.saleType,
      customerName: createdRecord.customerName,
      customerPhone: createdRecord.customerPhone,
      subtotal: createdRecord.subtotal,
      discountPercent: createdRecord.discountPercent,
      discountAmount: createdRecord.discountAmount,
      totalAmount: createdRecord.totalAmount,
      totalCost: createdRecord.totalCost,
      profitMargin: createdRecord.profitMargin,
      profitMarginPercent,
      paymentMethod: createdRecord.paymentMethod,
      notes: createdRecord.notes,
      createdAt: createdRecord.createdAt.toISOString(),
      items: createdRecord.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitCost: i.unitCost,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        profit: i.profit,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // 6. Grant / Revoke Stock Module Access (Super Admin Only)
  // ---------------------------------------------------------------------------
  async grantStockModuleAccess(
    adminId: string,
    targetUserId: string,
    grant: boolean,
  ): Promise<{ success: boolean; message: string }> {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.accountType !== AccountType.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can grant Stock Module access');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { customerProfile: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User account not found');
    }

    if (!targetUser.customerProfile) {
      throw new BadRequestException('User does not have a customer profile');
    }

    await this.prisma.customerProfile.update({
      where: { userId: targetUserId },
      data: { hasStockModuleAccess: grant },
    });

    return {
      success: true,
      message: `Stock module access ${grant ? 'granted to' : 'revoked from'} ${targetUser.name} (${targetUser.customerProfile.shopName})`,
    };
  }
}
