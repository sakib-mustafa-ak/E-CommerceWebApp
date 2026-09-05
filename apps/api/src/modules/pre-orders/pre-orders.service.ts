import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import {
  AccountType,
  CreatePreOrderDto,
  PreOrderResponse,
  PreOrderStatus,
  UnitType,
} from '@siam-aqua/shared-types';

@Injectable()
export class PreOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private mapPreOrderToResponse(po: any): PreOrderResponse {
    return {
      id: po.id,
      preOrderNumber: po.preOrderNumber,
      userId: po.userId,
      customerName: po.user?.name || po.user?.customerProfile?.ownerName || 'Customer',
      shopName: po.user?.customerProfile?.shopName || 'Wholesale Buyer',
      customerPhone: po.user?.phone || '',
      productId: po.productId,
      productName: po.product?.name || '',
      genericName: po.product?.genericName || '',
      companyName: po.product?.company?.name || '',
      dosageForm: po.product?.dosageForm || 'Tablet',
      strength: po.product?.strength || '',
      unitType: (po.unitType as UnitType) || UnitType.BOX,
      requestedQuantity: po.requestedQuantity,
      leadTimeDays: po.leadTimeDays,
      targetPrice: po.targetPrice,
      status: po.status as PreOrderStatus,
      notes: po.notes,
      mpoAssignedId: po.mpoAssignedId,
      reviewedByStaffId: po.reviewedByStaffId,
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
    };
  }

  async createPreOrder(
    userId: string,
    accountType: string,
    dto: CreatePreOrderDto,
  ): Promise<PreOrderResponse> {
    if (accountType !== AccountType.WHOLESALER_SELLER && accountType !== AccountType.SUPER_ADMIN && accountType !== AccountType.STAFF) {
      throw new ForbiddenException('Only wholesale accounts or staff can place pre-orders');
    }

    const validLeadTimes = [2, 3, 4, 5];
    if (!validLeadTimes.includes(dto.leadTimeDays)) {
      throw new BadRequestException('Lead time must be 2, 3, 4, or 5 days');
    }

    if (!dto.requestedQuantity || dto.requestedQuantity <= 0) {
      throw new BadRequestException('Requested quantity must be at least 1');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { company: true },
    });

    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }

    // Generate entropy preOrderNumber: PRE-2026-XXXXX
    const randomEntropy = Math.floor(1000 + Math.random() * 9000);
    const count = await this.prisma.preOrder.count();
    const preOrderNumber = `PRE-2026-${(count + 1).toString().padStart(4, '0')}-${randomEntropy}`;

    const created = await this.prisma.preOrder.create({
      data: {
        preOrderNumber,
        userId,
        productId: dto.productId,
        requestedQuantity: dto.requestedQuantity,
        unitType: dto.unitType || UnitType.BOX,
        leadTimeDays: dto.leadTimeDays,
        targetPrice: dto.targetPrice || null,
        notes: dto.notes || null,
        status: PreOrderStatus.PENDING,
      },
      include: {
        user: { include: { customerProfile: true } },
        product: { include: { company: true } },
      },
    });

    return this.mapPreOrderToResponse(created);
  }

  async getMyPreOrders(userId: string): Promise<PreOrderResponse[]> {
    const preOrders = await this.prisma.preOrder.findMany({
      where: { userId },
      include: {
        user: { include: { customerProfile: true } },
        product: { include: { company: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return preOrders.map((po) => this.mapPreOrderToResponse(po));
  }

  async getAllPreOrders(params?: {
    status?: PreOrderStatus;
    leadTimeDays?: number;
    query?: string;
  }): Promise<PreOrderResponse[]> {
    const where: any = {};

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.leadTimeDays) {
      where.leadTimeDays = params.leadTimeDays;
    }

    if (params?.query) {
      const q = params.query;
      where.OR = [
        { preOrderNumber: { contains: q } },
        { product: { name: { contains: q } } },
        { product: { genericName: { contains: q } } },
        { user: { name: { contains: q } } },
        { user: { customerProfile: { shopName: { contains: q } } } },
      ];
    }

    const preOrders = await this.prisma.preOrder.findMany({
      where,
      include: {
        user: { include: { customerProfile: true } },
        product: { include: { company: true } },
      },
      orderBy: [{ leadTimeDays: 'asc' }, { createdAt: 'desc' }],
    });

    return preOrders.map((po) => this.mapPreOrderToResponse(po));
  }

  async updatePreOrderStatus(
    preOrderId: string,
    staffId: string,
    status: PreOrderStatus,
    notes?: string,
    mpoAssignedId?: string,
  ): Promise<PreOrderResponse> {
    const existing = await this.prisma.preOrder.findUnique({
      where: { id: preOrderId },
    });

    if (!existing) {
      throw new NotFoundException(`Pre-order ${preOrderId} not found`);
    }

    const updated = await this.prisma.preOrder.update({
      where: { id: preOrderId },
      data: {
        status,
        reviewedByStaffId: staffId,
        notes: notes !== undefined ? notes : existing.notes,
        mpoAssignedId: mpoAssignedId !== undefined ? mpoAssignedId : existing.mpoAssignedId,
      },
      include: {
        user: { include: { customerProfile: true } },
        product: { include: { company: true } },
      },
    });

    return this.mapPreOrderToResponse(updated);
  }
}
