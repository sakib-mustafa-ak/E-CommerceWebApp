import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { SectorType } from '@siam-aqua/shared-types';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalUsers,
      totalOrders,
      totalProducts,
      pendingApplications,
      recentOrders,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.product.count(),
      this.prisma.applicationQueue.count({ where: { status: 'PENDING_REVIEW' } }),
      this.prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      }),
      this.prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Sector Registry for Siam's Aqua E-Commerce 8 sectors
    const sectors = [
      { id: SectorType.PHARMACY, name: 'Main Pharmacy', icon: 'Pill', status: 'Active (Phase 1 Ready)', opaqueStock: true },
      { id: 'PAIKARI_B2B', name: 'Paikari B2B (Retail-Distributor)', icon: 'Store', status: 'Active (Phase 0 Ready)', tierPricing: true },
      { id: SectorType.WHOLESALE, name: 'Wholesale B2B ("Hawlsel")', icon: 'Building2', status: 'Stealth Isolated', hiddenFromPaikari: true },
      { id: SectorType.OFFER_PARA, name: 'Offer Para (Internal Live Stock)', icon: 'Tag', status: 'Live Stock Enabled', separateInventory: true },
      { id: SectorType.MPO, name: 'MPO Field Portal', icon: 'Briefcase', status: 'Admin-Controlled Registration', liveBiddingReady: true },
      { id: SectorType.FOOD, name: 'Food & Restaurant Marketplace', icon: 'Utensils', status: 'Multi-Vendor Skeleton Ready' },
      { id: SectorType.SERVICES, name: 'Services & Doctor Booking', icon: 'Calendar', status: 'Schema Ready (Phase 2 Future)' },
      { id: SectorType.COUNTER, name: 'Counter / Offline POS Sales', icon: 'Receipt', status: 'Schema Ready (Phase 2 Future)' },
    ];

    return {
      stats: {
        totalUsers,
        totalOrders,
        totalProducts,
        pendingApplications,
      },
      sectors,
      recentOrders,
      recentAuditLogs,
    };
  }

  async getProductsList(params: { category?: string; search?: string }) {
    const where: any = {};
    if (params.category) where.category = params.category;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { genericName: { contains: params.search } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: {
        company: true,
        productOverrides: { include: { tier: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getOrdersList(params: { sectorType?: string; status?: string }) {
    const where: any = {};
    if (params.sectorType) where.sectorType = params.sectorType;
    if (params.status) where.platformStatus = params.status;

    return this.prisma.order.findMany({
      where,
      include: {
        user: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
