import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PricingEngine } from '@siam-aqua/pricing';
import {
  WholesalerPublicListingCreateDto,
  WholesalerListingReviewDto,
  WholesalerPublicListingResponse,
  ResellerLedgerEntryResponse,
  ResellerMonthlyStatementResponse,
  ResellerStatementReconcileDto,
  ResellerBrandingMode,
  AuditAction,
} from '@siam-aqua/shared-types';

@Injectable()
export class ResellerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // 1. Wholesaler Submits Product for Public Resale Listing
  async createPublicListing(
    wholesalerId: string,
    dto: WholesalerPublicListingCreateDto,
  ): Promise<WholesalerPublicListingResponse> {
    if (!dto.productId || dto.wholesalerBasePrice <= 0 || dto.stockQuantity <= 0) {
      throw new BadRequestException('Valid productId, base price (>0), and stock quantity (>0) are required.');
    }

    const wholesaler = await this.prisma.user.findUnique({
      where: { id: wholesalerId },
      include: { customerProfile: true },
    });

    if (!wholesaler) {
      throw new NotFoundException('Wholesaler account not found.');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { company: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    // Commission Added ON TOP Rule:
    // Wholesaler specifies their net base price (e.g. 500 BDT).
    // Platform commission % (e.g. 2%) is added on top.
    // Public price = basePrice * (1 + commissionRate / 100) -> 510 BDT.
    const commissionRate = wholesaler.customerProfile?.resellerCommissionRate ?? 2.0;
    const basePrice = PricingEngine.roundToTwoDecimals(dto.wholesalerBasePrice);
    const commissionAmount = PricingEngine.roundToTwoDecimals(basePrice * (commissionRate / 100));
    const calculatedPublicPrice = PricingEngine.roundToTwoDecimals(basePrice + commissionAmount);

    const brandingMode = dto.brandingMode || wholesaler.customerProfile?.resellerDefaultBranding || 'WHITE_LABEL';

    const listing = await this.prisma.wholesalerPublicListing.create({
      data: {
        wholesalerId,
        productId: dto.productId,
        wholesalerBasePrice: basePrice,
        commissionRate,
        commissionAmount,
        calculatedPublicPrice,
        stockQuantity: dto.stockQuantity,
        brandingMode,
        status: 'PENDING_REVIEW', // Mandatory admin approval gate
      },
      include: {
        product: { include: { company: true } },
        wholesaler: { include: { customerProfile: true } },
      },
    });

    // Ensure wholesaler customerProfile has reseller enabled
    if (!wholesaler.customerProfile?.isPublicResellerEnabled) {
      await this.prisma.customerProfile.update({
        where: { userId: wholesalerId },
        data: { isPublicResellerEnabled: true },
      });
    }

    await this.auditService.log({
      actorId: wholesalerId,
      actorEmail: wholesaler.email,
      action: AuditAction.WHOLESALER_PUBLIC_LISTING_SUBMITTED,
      entityType: 'WholesalerPublicListing',
      entityId: listing.id,
      afterData: {
        productId: dto.productId,
        productName: product.name,
        basePrice,
        commissionRate,
        calculatedPublicPrice,
        stockQuantity: dto.stockQuantity,
        brandingMode,
      },
    });

    return this.mapListingToResponse(listing);
  }

  // 2. Wholesaler views their own listings
  async getMyListings(wholesalerId: string): Promise<WholesalerPublicListingResponse[]> {
    const listings = await this.prisma.wholesalerPublicListing.findMany({
      where: { wholesalerId },
      include: {
        product: { include: { company: true } },
        wholesaler: { include: { customerProfile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return listings.map((l) => this.mapListingToResponse(l));
  }

  // 3. Admin Review Queue for Wholesaler Public Listings
  async getAdminReviewQueue(filters?: {
    status?: string;
    wholesalerId?: string;
  }): Promise<WholesalerPublicListingResponse[]> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.wholesalerId) where.wholesalerId = filters.wholesalerId;

    const listings = await this.prisma.wholesalerPublicListing.findMany({
      where,
      include: {
        product: { include: { company: true } },
        wholesaler: { include: { customerProfile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return listings.map((l) => this.mapListingToResponse(l));
  }

  // 4. Admin Review Action (Approve, Reject, Adjust Commission, Set Branding)
  async reviewListing(
    listingId: string,
    dto: WholesalerListingReviewDto,
    staff: any,
  ): Promise<WholesalerPublicListingResponse> {
    const listing = await this.prisma.wholesalerPublicListing.findUnique({
      where: { id: listingId },
      include: {
        product: { include: { company: true } },
        wholesaler: { include: { customerProfile: true } },
      },
    });

    if (!listing) {
      throw new NotFoundException('Public listing not found.');
    }

    let commissionRate = listing.commissionRate;
    if (dto.adjustedCommissionRate !== undefined && dto.adjustedCommissionRate >= 0) {
      commissionRate = dto.adjustedCommissionRate;
    }

    const basePrice = listing.wholesalerBasePrice;
    const commissionAmount = PricingEngine.roundToTwoDecimals(basePrice * (commissionRate / 100));
    const calculatedPublicPrice = PricingEngine.roundToTwoDecimals(basePrice + commissionAmount);

    const brandingMode = dto.adjustedBrandingMode || listing.brandingMode;

    const updated = await this.prisma.wholesalerPublicListing.update({
      where: { id: listingId },
      data: {
        status: dto.status,
        commissionRate,
        commissionAmount,
        calculatedPublicPrice,
        brandingMode,
        reviewNotes: dto.reviewNotes || listing.reviewNotes,
        reviewedByStaffId: staff.id,
        reviewedAt: new Date(),
      },
      include: {
        product: { include: { company: true } },
        wholesaler: { include: { customerProfile: true } },
      },
    });

    await this.auditService.log({
      actorId: staff.id,
      actorEmail: staff.email,
      action:
        dto.status === 'APPROVED'
          ? AuditAction.WHOLESALER_PUBLIC_LISTING_APPROVED
          : AuditAction.WHOLESALER_PUBLIC_LISTING_REJECTED,
      entityType: 'WholesalerPublicListing',
      entityId: listingId,
      afterData: {
        status: dto.status,
        commissionRate,
        calculatedPublicPrice,
        brandingMode,
        reviewNotes: dto.reviewNotes,
      },
    });

    return this.mapListingToResponse(updated);
  }

  // 5. Public Market Active Listings (Approved only, stock > 0, not suspended)
  async getPublicActiveListings(productId?: string): Promise<WholesalerPublicListingResponse[]> {
    const where: any = {
      status: 'APPROVED',
      isSuspended: false,
      stockQuantity: { gt: 0 },
    };
    if (productId) where.productId = productId;

    const listings = await this.prisma.wholesalerPublicListing.findMany({
      where,
      include: {
        product: { include: { company: true } },
        wholesaler: { include: { customerProfile: true } },
      },
      orderBy: { calculatedPublicPrice: 'asc' },
    });

    return listings.map((l) => this.mapListingToResponse(l));
  }

  // 6. Running Commission Ledger
  async getCommissionLedger(wholesalerId?: string): Promise<{
    entries: ResellerLedgerEntryResponse[];
    summary: {
      totalGrossVolume: number;
      totalPlatformCommission: number;
      totalNetWholesalerOwed: number;
      totalEntries: number;
    };
  }> {
    const where: any = {};
    if (wholesalerId) where.wholesalerId = wholesalerId;

    const entries = await this.prisma.resellerCommissionLedgerEntry.findMany({
      where,
      include: {
        wholesaler: { include: { customerProfile: true } },
        listing: { include: { product: true } },
        statement: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalGrossVolume = 0;
    let totalPlatformCommission = 0;
    let totalNetWholesalerOwed = 0;

    const mappedEntries: ResellerLedgerEntryResponse[] = entries.map((e) => {
      totalGrossVolume += e.grossAmount;
      totalPlatformCommission += e.platformCommission;
      totalNetWholesalerOwed += e.wholesalerBaseAmount;

      return {
        id: e.id,
        entryNumber: e.entryNumber,
        wholesalerId: e.wholesalerId,
        wholesalerShopName: e.wholesaler.customerProfile?.shopName || e.wholesaler.name,
        listingId: e.listingId || undefined,
        productName: e.listing?.product?.name || undefined,
        orderId: e.orderId || undefined,
        entryType: e.entryType,
        quantity: e.quantity,
        wholesalerBaseAmount: PricingEngine.roundToTwoDecimals(e.wholesalerBaseAmount),
        platformCommissionRate: e.platformCommissionRate,
        platformCommission: PricingEngine.roundToTwoDecimals(e.platformCommission),
        grossAmount: PricingEngine.roundToTwoDecimals(e.grossAmount),
        statementNumber: e.statement?.statementNumber || undefined,
        note: e.note || undefined,
        createdAt: e.createdAt.toISOString(),
      };
    });

    return {
      entries: mappedEntries,
      summary: {
        totalGrossVolume: PricingEngine.roundToTwoDecimals(totalGrossVolume),
        totalPlatformCommission: PricingEngine.roundToTwoDecimals(totalPlatformCommission),
        totalNetWholesalerOwed: PricingEngine.roundToTwoDecimals(totalNetWholesalerOwed),
        totalEntries: entries.length,
      },
    };
  }

  // 7. Monthly Settlement Statement Generation
  async generateMonthlyStatement(
    wholesalerId: string,
    year: number,
    month: number,
    staff?: any,
  ): Promise<ResellerMonthlyStatementResponse> {
    const wholesaler = await this.prisma.user.findUnique({
      where: { id: wholesalerId },
      include: { customerProfile: true },
    });

    if (!wholesaler) {
      throw new NotFoundException('Wholesaler account not found.');
    }

    // Determine calendar date range
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const ledgerEntries = await this.prisma.resellerCommissionLedgerEntry.findMany({
      where: {
        wholesalerId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    let totalSalesCount = 0;
    let totalSoldUnits = 0;
    let grossSalesVolume = 0;
    let totalCommissionOwed = 0;
    let netWholesalerPayout = 0;
    let totalReturnsDeduction = 0;
    let commissionRefundAmount = 0;

    for (const entry of ledgerEntries) {
      if (entry.entryType === 'SALE_COMMISSION') {
        totalSalesCount += 1;
        totalSoldUnits += entry.quantity;
        grossSalesVolume += entry.grossAmount;
        totalCommissionOwed += entry.platformCommission;
        netWholesalerPayout += entry.wholesalerBaseAmount;
      } else if (entry.entryType === 'RETURN_COMMISSION_REVERSAL') {
        totalReturnsDeduction += Math.abs(entry.wholesalerBaseAmount);
        commissionRefundAmount += Math.abs(entry.platformCommission);
      }
    }

    const closingBalance = PricingEngine.roundToTwoDecimals(
      netWholesalerPayout - totalReturnsDeduction,
    );

    const count = await this.prisma.resellerMonthlyStatement.count();
    const statementNumber = `STMT-${year}-${String(month).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;

    const statement = await this.prisma.resellerMonthlyStatement.upsert({
      where: {
        wholesalerId_billingPeriodYear_billingPeriodMonth: {
          wholesalerId,
          billingPeriodYear: year,
          billingPeriodMonth: month,
        },
      },
      update: {
        totalSalesCount,
        totalSoldUnits,
        grossSalesVolume: PricingEngine.roundToTwoDecimals(grossSalesVolume),
        totalCommissionOwed: PricingEngine.roundToTwoDecimals(totalCommissionOwed),
        netWholesalerPayout: PricingEngine.roundToTwoDecimals(netWholesalerPayout),
        totalReturnsDeduction: PricingEngine.roundToTwoDecimals(totalReturnsDeduction),
        commissionRefundAmount: PricingEngine.roundToTwoDecimals(commissionRefundAmount),
        closingBalance,
      },
      create: {
        statementNumber,
        wholesalerId,
        billingPeriodYear: year,
        billingPeriodMonth: month,
        totalSalesCount,
        totalSoldUnits,
        grossSalesVolume: PricingEngine.roundToTwoDecimals(grossSalesVolume),
        totalCommissionOwed: PricingEngine.roundToTwoDecimals(totalCommissionOwed),
        netWholesalerPayout: PricingEngine.roundToTwoDecimals(netWholesalerPayout),
        totalReturnsDeduction: PricingEngine.roundToTwoDecimals(totalReturnsDeduction),
        commissionRefundAmount: PricingEngine.roundToTwoDecimals(commissionRefundAmount),
        closingBalance,
        status: 'PENDING_RECONCILIATION',
      },
      include: {
        wholesaler: { include: { customerProfile: true } },
      },
    });

    // Link ledger entries to this statement
    if (ledgerEntries.length > 0) {
      await this.prisma.resellerCommissionLedgerEntry.updateMany({
        where: {
          id: { in: ledgerEntries.map((e) => e.id) },
        },
        data: {
          statementId: statement.id,
        },
      });
    }

    if (staff) {
      await this.auditService.log({
        actorId: staff.id,
        actorEmail: staff.email,
        action: AuditAction.RESELLER_STATEMENT_GENERATED,
        entityType: 'ResellerMonthlyStatement',
        entityId: statement.id,
        afterData: {
          statementNumber: statement.statementNumber,
          wholesalerId,
          year,
          month,
          closingBalance,
        },
      });
    }

    return this.mapStatementToResponse(statement);
  }

  // 8. Wholesaler views statements
  async getWholesalerStatements(wholesalerId: string): Promise<ResellerMonthlyStatementResponse[]> {
    const statements = await this.prisma.resellerMonthlyStatement.findMany({
      where: { wholesalerId },
      include: {
        wholesaler: { include: { customerProfile: true } },
      },
      orderBy: [{ billingPeriodYear: 'desc' }, { billingPeriodMonth: 'desc' }],
    });

    return statements.map((s) => this.mapStatementToResponse(s));
  }

  // 9. Wholesaler responds to statement (ACKNOWLEDGED_PAID or DISPUTED)
  async reconcileStatement(
    statementId: string,
    wholesalerId: string,
    dto: ResellerStatementReconcileDto,
  ): Promise<ResellerMonthlyStatementResponse> {
    const statement = await this.prisma.resellerMonthlyStatement.findUnique({
      where: { id: statementId },
      include: { wholesaler: { include: { customerProfile: true } } },
    });

    if (!statement) {
      throw new NotFoundException('Statement not found.');
    }

    if (statement.wholesalerId !== wholesalerId) {
      throw new ForbiddenException('You are not authorized to reconcile this statement.');
    }

    const updated = await this.prisma.resellerMonthlyStatement.update({
      where: { id: statementId },
      data: {
        status: dto.status,
        wholesalerResponseAt: new Date(),
        wholesalerNote: dto.note || statement.wholesalerNote,
      },
      include: {
        wholesaler: { include: { customerProfile: true } },
      },
    });

    await this.auditService.log({
      actorId: wholesalerId,
      actorEmail: statement.wholesaler.email,
      action: AuditAction.RESELLER_STATEMENT_RECONCILED,
      entityType: 'ResellerMonthlyStatement',
      entityId: statementId,
      afterData: {
        status: dto.status,
        note: dto.note,
      },
    });

    return this.mapStatementToResponse(updated);
  }

  // 10. Admin settles statement after offline funds verification
  async adminSettleStatement(
    statementId: string,
    staff: any,
    note?: string,
  ): Promise<ResellerMonthlyStatementResponse> {
    const statement = await this.prisma.resellerMonthlyStatement.findUnique({
      where: { id: statementId },
      include: { wholesaler: { include: { customerProfile: true } } },
    });

    if (!statement) {
      throw new NotFoundException('Statement not found.');
    }

    const updated = await this.prisma.resellerMonthlyStatement.update({
      where: { id: statementId },
      data: {
        status: 'SETTLED',
        settledAt: new Date(),
        adminSettlementNote: note || statement.adminSettlementNote,
      },
      include: {
        wholesaler: { include: { customerProfile: true } },
      },
    });

    await this.auditService.log({
      actorId: staff.id,
      actorEmail: staff.email,
      action: AuditAction.RESELLER_STATEMENT_SETTLED,
      entityType: 'ResellerMonthlyStatement',
      entityId: statementId,
      afterData: {
        status: 'SETTLED',
        note,
      },
    });

    return this.mapStatementToResponse(updated);
  }

  // 11. Admin updates wholesaler reseller commission/branding settings
  async updateWholesalerResellerSettings(
    wholesalerId: string,
    dto: {
      isEnabled?: boolean;
      commissionRate?: number;
      defaultBranding?: string;
    },
    staff?: any,
  ) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: wholesalerId },
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found.');
    }

    const updated = await this.prisma.customerProfile.update({
      where: { userId: wholesalerId },
      data: {
        isPublicResellerEnabled: dto.isEnabled !== undefined ? dto.isEnabled : profile.isPublicResellerEnabled,
        resellerCommissionRate: dto.commissionRate !== undefined ? dto.commissionRate : profile.resellerCommissionRate,
        resellerDefaultBranding: dto.defaultBranding || profile.resellerDefaultBranding,
      },
    });

    return updated;
  }

  // Mapping Helpers
  private mapListingToResponse(listing: any): WholesalerPublicListingResponse {
    const isWhiteLabel = listing.brandingMode === 'WHITE_LABEL';
    const shopName = listing.wholesaler?.customerProfile?.shopName || listing.wholesaler?.name || 'Verified Wholesaler';
    const sellerDisplayName = isWhiteLabel ? "Siam's Aqua Verified Store" : `Sold by ${shopName}`;

    return {
      id: listing.id,
      wholesalerId: listing.wholesalerId,
      wholesalerShopName: shopName,
      productId: listing.productId,
      productName: listing.product?.name || 'Unknown Product',
      productGenericName: listing.product?.genericName || '',
      companyName: listing.product?.company?.name || '',
      wholesalerBasePrice: PricingEngine.roundToTwoDecimals(listing.wholesalerBasePrice),
      commissionRate: listing.commissionRate,
      commissionAmount: PricingEngine.roundToTwoDecimals(listing.commissionAmount),
      calculatedPublicPrice: PricingEngine.roundToTwoDecimals(listing.calculatedPublicPrice),
      stockQuantity: listing.stockQuantity,
      brandingMode: listing.brandingMode as ResellerBrandingMode,
      sellerDisplayName,
      status: listing.status,
      reviewNotes: listing.reviewNotes || undefined,
      totalSoldUnits: listing.totalSoldUnits,
      totalGrossSales: PricingEngine.roundToTwoDecimals(listing.totalGrossSales),
      totalCommissionPaid: PricingEngine.roundToTwoDecimals(listing.totalCommissionPaid),
      isSuspended: listing.isSuspended,
      createdAt: listing.createdAt.toISOString(),
    };
  }

  private mapStatementToResponse(stmt: any): ResellerMonthlyStatementResponse {
    return {
      id: stmt.id,
      statementNumber: stmt.statementNumber,
      wholesalerId: stmt.wholesalerId,
      wholesalerShopName: stmt.wholesaler?.customerProfile?.shopName || stmt.wholesaler?.name || 'Wholesaler',
      billingPeriodMonth: stmt.billingPeriodMonth,
      billingPeriodYear: stmt.billingPeriodYear,
      totalSalesCount: stmt.totalSalesCount,
      totalSoldUnits: stmt.totalSoldUnits,
      grossSalesVolume: PricingEngine.roundToTwoDecimals(stmt.grossSalesVolume),
      totalCommissionOwed: PricingEngine.roundToTwoDecimals(stmt.totalCommissionOwed),
      netWholesalerPayout: PricingEngine.roundToTwoDecimals(stmt.netWholesalerPayout),
      totalReturnsDeduction: PricingEngine.roundToTwoDecimals(stmt.totalReturnsDeduction),
      commissionRefundAmount: PricingEngine.roundToTwoDecimals(stmt.commissionRefundAmount),
      closingBalance: PricingEngine.roundToTwoDecimals(stmt.closingBalance),
      status: stmt.status,
      wholesalerResponseAt: stmt.wholesalerResponseAt?.toISOString() || undefined,
      wholesalerNote: stmt.wholesalerNote || undefined,
      adminSettlementNote: stmt.adminSettlementNote || undefined,
      settledAt: stmt.settledAt?.toISOString() || undefined,
      createdAt: stmt.createdAt.toISOString(),
    };
  }
}
