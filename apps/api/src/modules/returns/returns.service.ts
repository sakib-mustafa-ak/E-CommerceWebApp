import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  AccountType,
  SectorType,
  ReturnStatus,
  CreateReturnDto,
  ReviewReturnDto,
  ReturnRequestResponse,
  ReturnItemResponse,
  HighReturnProductSummary,
  CustomerMonthlyReturnSummary,
  AuditAction,
} from '@siam-aqua/shared-types';
import { PricingEngine } from '@siam-aqua/pricing';
import { EventsGateway } from '../events/events.gateway';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventsGateway: EventsGateway,
    private readonly auditService: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Submit Return Request (Validated against Confirmed Receipt Date Window)
  // ---------------------------------------------------------------------------
  async createReturnRequest(
    actorId: string,
    actorAccountType: string,
    dto: CreateReturnDto,
  ): Promise<ReturnRequestResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: { include: { product: { include: { company: true } } } },
        user: { include: { customerProfile: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      actorAccountType !== AccountType.SUPER_ADMIN &&
      actorAccountType !== AccountType.STAFF &&
      order.userId !== actorId
    ) {
      throw new ForbiddenException('Unauthorized to request return for this order');
    }

    // 1. Check Receipt Date & Return Window
    const receiptDate = order.confirmedReceiptAt || (order.fulfillmentStatus === 'DELIVERED' ? order.updatedAt : null);
    if (!receiptDate) {
      throw new BadRequestException(
        'Returns can only be requested after goods have been confirmed delivered/received.',
      );
    }

    // Get configurable return window (default: 3 days from confirmed receipt date)
    const settings = await this.prisma.platformSetting.findMany();
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
    const returnWindowDays = parseInt(settingsMap.get('return_window_days') || '3', 10);

    const now = new Date().getTime();
    const receiptTime = new Date(receiptDate).getTime();
    const elapsedDays = (now - receiptTime) / (1000 * 60 * 60 * 24);

    if (elapsedDays > returnWindowDays) {
      throw new BadRequestException(
        `Return window expired. Returns must be requested within ${returnWindowDays} days of confirmed delivery receipt (elapsed: ${elapsedDays.toFixed(1)} days).`,
      );
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item must be specified for return.');
    }

    // 2. Validate line items, product returnability, and partial quantities
    let totalRefundCredit = 0;
    const returnItemsData = [];

    const orderItemMap = new Map(order.items.map((i) => [i.id, i]));

    for (const returnInput of dto.items) {
      const orderItem = orderItemMap.get(returnInput.orderItemId);
      if (!orderItem) {
        throw new NotFoundException(`Order item ${returnInput.orderItemId} not found in this order.`);
      }

      const product = orderItem.product;

      // Enforce product-level returnability flag
      if (product.isReturnable === false) {
        throw new BadRequestException(
          `Product "${product.name}" is non-returnable (e.g. cold-chain or non-returnable formulation).`,
        );
      }

      // Validate partial return quantity
      const purchasedQty = orderItem.confirmedQuantity > 0 ? orderItem.confirmedQuantity : orderItem.requestedQuantity;
      if (returnInput.returnedQuantity <= 0) {
        throw new BadRequestException(`Returned quantity for "${product.name}" must be greater than 0.`);
      }
      if (returnInput.returnedQuantity > purchasedQty) {
        throw new BadRequestException(
          `Cannot return ${returnInput.returnedQuantity} units of "${product.name}". Purchased quantity was ${purchasedQty}.`,
        );
      }

      const unitPrice = orderItem.finalUnitPrice > 0 ? orderItem.finalUnitPrice : orderItem.tieredUnitPrice;
      const refundLineAmount = PricingEngine.roundToTwoDecimals(returnInput.returnedQuantity * unitPrice);
      totalRefundCredit += refundLineAmount;

      returnItemsData.push({
        orderItemId: orderItem.id,
        productId: product.id,
        productName: product.name,
        genericName: product.genericName,
        unitType: orderItem.unitType,
        originalUnitPrice: unitPrice,
        originalPurchasedQuantity: purchasedQty,
        returnedQuantity: returnInput.returnedQuantity,
        refundCreditAmount: refundLineAmount,
        isOfferParaStock: orderItem.isOfferPara || product.isOfferParaLiveStock,
        stockReversed: false,
      });
    }

    totalRefundCredit = PricingEngine.roundToTwoDecimals(totalRefundCredit);

    // Generate unique return number
    const count = await this.prisma.returnRequest.count();
    const entropy = Math.floor(1000 + Math.random() * 9000);
    const returnNumber = `RET-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}-${entropy}`;

    const returnRequest = await this.prisma.returnRequest.create({
      data: {
        returnNumber,
        orderId: order.id,
        userId: order.userId,
        sectorType: order.sectorType,
        status: ReturnStatus.PENDING,
        totalRefundCredit,
        reason: dto.reason,
        voiceNoteUrl: dto.voiceNoteUrl,
        items: {
          create: returnItemsData,
        },
      },
      include: {
        items: true,
        order: true,
        user: { include: { customerProfile: true } },
      },
    });

    await this.auditService.log({
      actorId,
      actorEmail: order.user.email,
      action: 'RETURN_REQUESTED',
      entityType: 'ReturnRequest',
      entityId: returnRequest.id,
      afterData: { returnNumber, totalRefundCredit, reason: dto.reason },
    });

    this.eventsGateway.server?.emit('returnRequestCreated', {
      returnId: returnRequest.id,
      returnNumber: returnRequest.returnNumber,
      orderNumber: order.orderNumber,
      shopName: order.user.customerProfile?.shopName || order.user.name,
      totalRefundCredit,
    });

    return this.mapReturnToResponse(returnRequest);
  }

  // ---------------------------------------------------------------------------
  // 2. Staff Manual Judgment Tool: Approve / Reject Return (Case-by-Case)
  // ---------------------------------------------------------------------------
  async reviewReturnRequest(
    returnId: string,
    staffId: string,
    dto: ReviewReturnDto,
  ): Promise<ReturnRequestResponse> {
    const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Staff account not found');

    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        items: { include: { product: true } },
        order: true,
        user: { include: { customerProfile: true } },
      },
    });

    if (!returnRequest) throw new NotFoundException('Return request not found');

    if (returnRequest.status !== ReturnStatus.PENDING) {
      throw new BadRequestException(`Return request has already been ${returnRequest.status.toLowerCase()}.`);
    }

    if (dto.approve) {
      // 1. Credit customer running account balance (CustomerProfile.creditBalance)
      const customerProfile = returnRequest.user.customerProfile;
      if (customerProfile) {
        await this.prisma.customerProfile.update({
          where: { userId: returnRequest.userId },
          data: {
            creditBalance: PricingEngine.roundToTwoDecimals(
              customerProfile.creditBalance + returnRequest.totalRefundCredit,
            ),
            totalReturnsCount: customerProfile.totalReturnsCount + 1,
            totalReturnsValue: PricingEngine.roundToTwoDecimals(
              customerProfile.totalReturnsValue + returnRequest.totalRefundCredit,
            ),
          },
        });
      }

      // 2. Reverse stock into the correct inventory & check high return rate
      const settings = await this.prisma.platformSetting.findMany();
      const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
      const highReturnThreshold = parseInt(settingsMap.get('high_return_product_threshold') || '5', 10);

      for (const item of returnRequest.items) {
        // Dual Inventory Routing (Offer Para live stock vs Main Pharmacy procurement log)
        if (item.isOfferParaStock) {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: {
              offerParaStockQty: { increment: item.returnedQuantity },
            },
          });
        }

        // Increment Product returnCount & Auto-flag if high return rate
        const updatedProduct = await this.prisma.product.update({
          where: { id: item.productId },
          data: {
            returnCount: { increment: 1 },
          },
        });

        if (updatedProduct.returnCount >= highReturnThreshold) {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: {
              isHighReturnRate: true,
              highReturnFlagReason: `High return rate: ${updatedProduct.returnCount} returns recorded (threshold: ${highReturnThreshold})`,
            },
          });
        }

        // Mark line item stock reversed
        await this.prisma.returnItem.update({
          where: { id: item.id },
          data: { stockReversed: true },
        });
      }

      // 3. Mark return request APPROVED
      const updatedReturn = await this.prisma.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          status: ReturnStatus.APPROVED,
          reviewedByStaffId: staff.id,
          reviewedByStaffName: staff.name,
          reviewedAt: new Date(),
          reviewNotes: dto.reviewNotes,
        },
        include: {
          items: true,
          order: true,
          user: { include: { customerProfile: true } },
        },
      });

      await this.auditService.log({
        actorId: staff.id,
        actorEmail: staff.email,
        action: AuditAction.RETURN_APPROVED,
        entityType: 'ReturnRequest',
        entityId: returnRequest.id,
        afterData: {
          status: 'APPROVED',
          creditAdded: returnRequest.totalRefundCredit,
          customerId: returnRequest.userId,
        },
      });

      this.eventsGateway.server?.to(`user:${returnRequest.userId}`).emit('returnStatusUpdated', {
        returnId: returnRequest.id,
        status: ReturnStatus.APPROVED,
        creditAdded: returnRequest.totalRefundCredit,
      });

      return this.mapReturnToResponse(updatedReturn);
    } else {
      // Reject Return
      const updatedReturn = await this.prisma.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          status: ReturnStatus.REJECTED,
          reviewedByStaffId: staff.id,
          reviewedByStaffName: staff.name,
          reviewedAt: new Date(),
          reviewNotes: dto.reviewNotes || 'Return rejected upon staff case review.',
        },
        include: {
          items: true,
          order: true,
          user: { include: { customerProfile: true } },
        },
      });

      await this.auditService.log({
        actorId: staff.id,
        actorEmail: staff.email,
        action: AuditAction.RETURN_REJECTED,
        entityType: 'ReturnRequest',
        entityId: returnRequest.id,
        afterData: { status: 'REJECTED', reason: dto.reviewNotes },
      });

      this.eventsGateway.server?.to(`user:${returnRequest.userId}`).emit('returnStatusUpdated', {
        returnId: returnRequest.id,
        status: ReturnStatus.REJECTED,
        reason: dto.reviewNotes,
      });

      return this.mapReturnToResponse(updatedReturn);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Search & List Returns (Filter by Date Range, Status, Customer)
  // ---------------------------------------------------------------------------
  async listReturns(filters: {
    startDate?: string;
    endDate?: string;
    status?: ReturnStatus;
    userId?: string;
    sectorType?: string;
  }): Promise<ReturnRequestResponse[]> {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.userId) where.userId = filters.userId;
    if (filters.sectorType) where.sectorType = filters.sectorType;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const returns = await this.prisma.returnRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        order: true,
        user: { include: { customerProfile: true } },
      },
    });

    return returns.map((r) => this.mapReturnToResponse(r));
  }

  async getReturnById(returnId: string, actorId: string, accountType: string): Promise<ReturnRequestResponse> {
    const returnReq = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        items: true,
        order: true,
        user: { include: { customerProfile: true } },
      },
    });
    if (!returnReq) throw new NotFoundException('Return request not found');

    if (
      accountType !== AccountType.SUPER_ADMIN &&
      accountType !== AccountType.STAFF &&
      returnReq.userId !== actorId
    ) {
      throw new ForbiddenException('Access denied to this return request');
    }

    return this.mapReturnToResponse(returnReq);
  }

  // ---------------------------------------------------------------------------
  // 4. Customer Monthly Return Summary (Requirement 9)
  // ---------------------------------------------------------------------------
  async getCustomerReturnHistory(customerId: string): Promise<CustomerMonthlyReturnSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id: customerId },
      include: {
        customerProfile: true,
        returnRequests: {
          where: { status: ReturnStatus.APPROVED },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) throw new NotFoundException('Customer not found');

    // Group approved returns by Month/Year
    const monthlyMap = new Map<string, { count: number; totalCredit: number }>();

    for (const ret of user.returnRequests) {
      const monthYear = new Date(ret.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
      const current = monthlyMap.get(monthYear) || { count: 0, totalCredit: 0 };
      current.count += 1;
      current.totalCredit += ret.totalRefundCredit;
      monthlyMap.set(monthYear, current);
    }

    const monthlyBreakdown = Array.from(monthlyMap.entries()).map(([monthYear, data]) => ({
      monthYear,
      returnsCount: data.count,
      totalCreditIssued: PricingEngine.roundToTwoDecimals(data.totalCredit),
    }));

    return {
      customerId: user.id,
      shopName: user.customerProfile?.shopName || user.name,
      creditBalance: user.customerProfile?.creditBalance || 0,
      totalReturnsCount: user.customerProfile?.totalReturnsCount || 0,
      totalReturnsValue: user.customerProfile?.totalReturnsValue || 0,
      monthlyBreakdown,
    };
  }

  // ---------------------------------------------------------------------------
  // 5. High Return Rate Flagged Products (Requirement 8)
  // ---------------------------------------------------------------------------
  async getHighReturnProducts(): Promise<HighReturnProductSummary[]> {
    const products = await this.prisma.product.findMany({
      where: {
        OR: [{ isHighReturnRate: true }, { returnCount: { gt: 0 } }],
      },
      include: {
        company: true,
        returnItems: true,
      },
      orderBy: { returnCount: 'desc' },
    });

    return products.map((p) => {
      const totalUnitsReturned = p.returnItems.reduce((sum, item) => sum + item.returnedQuantity, 0);
      return {
        productId: p.id,
        name: p.name,
        genericName: p.genericName,
        companyName: p.company.name,
        returnCount: p.returnCount,
        isHighReturnRate: p.isHighReturnRate,
        highReturnFlagReason: p.highReturnFlagReason,
        totalUnitsReturned,
        isReturnable: p.isReturnable,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Helper Mapping
  // ---------------------------------------------------------------------------
  private mapReturnToResponse(r: any): ReturnRequestResponse {
    return {
      id: r.id,
      returnNumber: r.returnNumber,
      orderId: r.orderId,
      orderNumber: r.order?.orderNumber || '',
      userId: r.userId,
      customerName: r.user?.name || '',
      shopName: r.user?.customerProfile?.shopName || r.user?.name || '',
      customerPhone: r.user?.phone || '',
      sectorType: r.sectorType as SectorType,
      status: r.status as ReturnStatus,
      totalRefundCredit: r.totalRefundCredit,
      reason: r.reason,
      voiceNoteUrl: r.voiceNoteUrl,
      reviewedByStaffId: r.reviewedByStaffId,
      reviewedByStaffName: r.reviewedByStaffName,
      reviewedAt: r.reviewedAt?.toISOString(),
      reviewNotes: r.reviewNotes,
      items: r.items.map((i: any) => ({
        id: i.id,
        returnRequestId: i.returnRequestId,
        orderItemId: i.orderItemId,
        productId: i.productId,
        productName: i.productName,
        genericName: i.genericName,
        unitType: i.unitType,
        originalUnitPrice: i.originalUnitPrice,
        originalPurchasedQuantity: i.originalPurchasedQuantity,
        returnedQuantity: i.returnedQuantity,
        refundCreditAmount: i.refundCreditAmount,
        isOfferParaStock: i.isOfferParaStock,
        stockReversed: i.stockReversed,
      })),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
