import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AccountType, ApplicationStatus, AuditAction } from '@siam-aqua/shared-types';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // --- PATH (B): PUBLIC APPLICATION FORM ---
  async submitPublicApplication(dto: {
    businessName: string;
    ownerName: string;
    phone: string;
    email: string;
    address: string;
    accountType: AccountType;
    categoryInterest?: string;
    tradeLicenseNo?: string;
    drugLicenseNo?: string;
    tradeLicenseFileUrl?: string;
    drugLicenseFileUrl?: string;
  }) {
    // Strict business rule: MPO accounts cannot apply via public form
    if (dto.accountType === AccountType.MPO) {
      throw new ForbiddenException(
        'MPO accounts cannot apply through the public queue. MPO registration is strictly administrative.',
      );
    }

    if (
      dto.accountType === AccountType.SUPER_ADMIN ||
      dto.accountType === AccountType.STAFF
    ) {
      throw new ForbiddenException('Administrative accounts cannot be requested via public form.');
    }

    const application = await this.prisma.applicationQueue.create({
      data: {
        businessName: dto.businessName,
        ownerName: dto.ownerName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        accountType: dto.accountType,
        categoryInterest: dto.categoryInterest,
        tradeLicenseNo: dto.tradeLicenseNo,
        drugLicenseNo: dto.drugLicenseNo,
        tradeLicenseFileUrl: dto.tradeLicenseFileUrl || 'uploads/sample-trade-license.pdf',
        drugLicenseFileUrl: dto.drugLicenseFileUrl || 'uploads/sample-drug-license.pdf',
        status: ApplicationStatus.PENDING_REVIEW,
      },
    });

    return {
      message: 'Application submitted successfully. Our team will review your credentials.',
      applicationId: application.id,
      status: application.status,
    };
  }

  async getApplications(status?: ApplicationStatus) {
    const where: any = {};
    if (status) where.status = status;

    return this.prisma.applicationQueue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewApplication(
    id: string,
    dto: {
      action: 'APPROVE' | 'REJECT';
      reason?: string;
      tierId?: string;
      creditLimit?: number;
      codLimit?: number;
      deliveryFeeThreshold?: number;
      temporaryPassword?: string;
    },
    actor: { id: string; email: string },
  ) {
    const app = await this.prisma.applicationQueue.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== ApplicationStatus.PENDING_REVIEW) {
      throw new BadRequestException(`Application has already been ${app.status.toLowerCase()}`);
    }

    if (dto.action === 'REJECT') {
      if (!dto.reason) throw new BadRequestException('Rejection reason is required');

      const updated = await this.prisma.applicationQueue.update({
        where: { id },
        data: {
          status: ApplicationStatus.REJECTED,
          reviewNote: dto.reason,
          reviewedBy: actor.email,
        },
      });

      await this.audit.log({
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'APPLICATION_REJECTED',
        entityType: 'ApplicationQueue',
        entityId: id,
        afterData: updated,
      });

      return { message: 'Application rejected', application: updated };
    }

    // APPROVE
    if (!dto.tierId) {
      // Find default tier if none provided
      const defaultTier = await this.prisma.pricingTier.findFirst({
        where: { code: 'TIER_A' },
      });
      dto.tierId = defaultTier?.id;
      if (!dto.tierId) {
        throw new BadRequestException('A valid pricing tier is required for approval');
      }
    }

    const tempPassword = dto.temporaryPassword || 'SiamAqua@2026';
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        name: app.ownerName,
        email: app.email,
        phone: app.phone,
        passwordHash,
        accountType: app.accountType,
        customerProfile: {
          create: {
            shopName: app.businessName,
            ownerName: app.ownerName,
            address: app.address,
            tradeLicenseNo: app.tradeLicenseNo,
            drugLicenseNo: app.drugLicenseNo,
            tradeLicenseFileUrl: app.tradeLicenseFileUrl,
            drugLicenseFileUrl: app.drugLicenseFileUrl,
            tierId: dto.tierId,
            creditLimit: dto.creditLimit || 0,
            codLimit: dto.codLimit || 50000,
            deliveryFeeThreshold: dto.deliveryFeeThreshold || 1000,
          },
        },
      },
      include: { customerProfile: true },
    });

    const updatedApp = await this.prisma.applicationQueue.update({
      where: { id },
      data: {
        status: ApplicationStatus.APPROVED,
        reviewNote: dto.reason || 'Approved by admin',
        reviewedBy: actor.email,
      },
    });

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'APPLICATION_APPROVED',
      entityType: 'ApplicationQueue',
      entityId: id,
      afterData: { applicationId: id, createdUserId: user.id },
    });

    return {
      message: 'Application approved and customer account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        accountType: user.accountType,
        tempPassword,
      },
    };
  }

  // --- PATH (A): DIRECT ADMIN CREATION (Staff, MPO, Paikari, Wholesale, etc.) ---
  async createAccountDirectly(
    dto: {
      name: string;
      email: string;
      phone?: string;
      password?: string;
      accountType: AccountType;
      // Staff fields
      department?: string;
      roleIds?: string[];
      // Customer / Paikari / Wholesaler fields
      shopName?: string;
      address?: string;
      tradeLicenseNo?: string;
      drugLicenseNo?: string;
      tierId?: string;
      creditLimit?: number;
      codLimit?: number;
      deliveryFeeThreshold?: number;
    },
    actor: { id: string; email: string },
  ) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, ...(dto.phone ? [{ phone: dto.phone }] : [])],
      },
    });
    if (existing) {
      throw new BadRequestException('User with this email or phone already exists');
    }

    const tempPassword = dto.password || 'SiamAqua@2026';
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    let tierId = dto.tierId;
    if (!tierId && [AccountType.PAIKARI_SELLER, AccountType.WHOLESALER_SELLER].includes(dto.accountType)) {
      const defaultTier = await this.prisma.pricingTier.findFirst({ where: { code: 'TIER_A' } });
      tierId = defaultTier?.id;
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        accountType: dto.accountType,
        ...(dto.accountType === AccountType.STAFF
          ? {
              staffProfile: {
                create: { department: dto.department },
              },
              ...(dto.roleIds && dto.roleIds.length > 0
                ? {
                    userRoles: {
                      create: dto.roleIds.map((roleId) => ({ roleId })),
                    },
                  }
                : {}),
            }
          : {}),
        ...([
          AccountType.PAIKARI_SELLER,
          AccountType.WHOLESALER_SELLER,
          AccountType.FOOD_VENDOR,
        ].includes(dto.accountType) && tierId
          ? {
              customerProfile: {
                create: {
                  shopName: dto.shopName || dto.name,
                  ownerName: dto.name,
                  address: dto.address || 'Dhaka, Bangladesh',
                  tradeLicenseNo: dto.tradeLicenseNo,
                  drugLicenseNo: dto.drugLicenseNo,
                  tierId: tierId,
                  creditLimit: dto.creditLimit || 0,
                  codLimit: dto.codLimit || 50000,
                  deliveryFeeThreshold: dto.deliveryFeeThreshold || 1000,
                },
              },
            }
          : {}),
      },
      include: {
        staffProfile: true,
        customerProfile: { include: { tier: true } },
        userRoles: { include: { role: true } },
      },
    });

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'ADMIN_ACCOUNT_CREATED',
      entityType: 'User',
      entityId: user.id,
      afterData: {
        id: user.id,
        email: user.email,
        accountType: user.accountType,
      },
    });

    return {
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        accountType: user.accountType,
        customerProfile: user.customerProfile,
        staffProfile: user.staffProfile,
        roles: user.userRoles.map((ur) => ur.role.name),
      },
      temporaryPassword: tempPassword,
    };
  }

  async getAllUsers(params: {
    accountType?: AccountType;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const { accountType, search, limit = 50, offset = 0 } = params;
    const where: any = {};
    if (accountType) where.accountType = accountType;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          customerProfile: { include: { tier: true } },
          staffProfile: true,
          userRoles: { include: { role: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        name: u.name,
        accountType: u.accountType,
        is2FAEnabled: u.is2FAEnabled,
        suspensionType: u.suspensionType,
        suspendedUntil: u.suspendedUntil,
        suspensionReason: u.suspensionReason,
        customerProfile: u.customerProfile,
        staffProfile: u.staffProfile,
        roles: u.userRoles.map((ur) => ur.role),
        createdAt: u.createdAt,
      })),
      total,
      limit,
      offset,
    };
  }
}
