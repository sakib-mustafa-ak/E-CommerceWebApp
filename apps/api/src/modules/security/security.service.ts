import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SuspensionType, IpRuleType, AuditAction } from '@siam-aqua/shared-types';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

@Injectable()
export class SecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // --- IP ALLOW/BLOCK LIST ---
  async getIpRules() {
    return this.prisma.ipRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createIpRule(
    dto: { ipAddress: string; type: IpRuleType; reason: string; expiresAt?: string },
    actor: { id: string; email: string },
  ) {
    const existing = await this.prisma.ipRule.findUnique({
      where: { ipAddress: dto.ipAddress },
    });

    if (existing) {
      const updated = await this.prisma.ipRule.update({
        where: { ipAddress: dto.ipAddress },
        data: {
          type: dto.type,
          reason: dto.reason,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          createdBy: actor.email,
        },
      });

      await this.audit.log({
        actorId: actor.id,
        actorEmail: actor.email,
        action: AuditAction.IP_RULE_CREATED,
        entityType: 'IpRule',
        entityId: updated.id,
        beforeData: existing,
        afterData: updated,
      });

      return updated;
    }

    const created = await this.prisma.ipRule.create({
      data: {
        ipAddress: dto.ipAddress,
        type: dto.type,
        reason: dto.reason,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy: actor.email,
      },
    });

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.IP_RULE_CREATED,
      entityType: 'IpRule',
      entityId: created.id,
      afterData: created,
    });

    return created;
  }

  async deleteIpRule(id: string, actor: { id: string; email: string }) {
    const rule = await this.prisma.ipRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('IP rule not found');

    await this.prisma.ipRule.delete({ where: { id } });

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.IP_RULE_DELETED,
      entityType: 'IpRule',
      entityId: id,
      beforeData: rule,
    });

    return { message: 'IP rule deleted successfully' };
  }

  // --- ACCOUNT SUSPENSION (INDEFINITE vs TEMPORARY AUTO-EXPIRING) ---
  async suspendAccount(
    userId: string,
    dto: {
      suspensionType: SuspensionType; // INDEFINITE or TEMPORARY
      durationDays?: number;
      reason: string;
    },
    actor: { id: string; email: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let suspendedUntil: Date | null = null;
    if (dto.suspensionType === SuspensionType.TEMPORARY) {
      if (!dto.durationDays || dto.durationDays <= 0) {
        throw new BadRequestException('durationDays is required for temporary suspension');
      }
      suspendedUntil = new Date(Date.now() + dto.durationDays * 24 * 60 * 60 * 1000);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        suspensionType: dto.suspensionType,
        suspendedUntil,
        suspensionReason: dto.reason,
      },
    });

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.ACCOUNT_SUSPENDED,
      entityType: 'User',
      entityId: userId,
      beforeData: {
        suspensionType: user.suspensionType,
        suspendedUntil: user.suspendedUntil,
        suspensionReason: user.suspensionReason,
      },
      afterData: {
        suspensionType: updated.suspensionType,
        suspendedUntil: updated.suspendedUntil,
        suspensionReason: updated.suspensionReason,
      },
    });

    return updated;
  }

  async reactivateAccount(userId: string, actor: { id: string; email: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        suspensionType: SuspensionType.NONE,
        suspendedUntil: null,
        suspensionReason: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.ACCOUNT_REACTIVATED,
      entityType: 'User',
      entityId: userId,
      beforeData: {
        suspensionType: user.suspensionType,
        suspendedUntil: user.suspendedUntil,
        suspensionReason: user.suspensionReason,
      },
      afterData: { suspensionType: SuspensionType.NONE },
    });

    return updated;
  }

  // --- TWO-FACTOR AUTHENTICATION (2FA TOTP) ---
  async generate2FASecret(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(
      user.email,
      "Siam's Aqua E-Commerce",
      secret,
    );

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Generate 6 backup codes
    const backupCodes = Array.from({ length: 6 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );

    // Temporarily save secret
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        twoFactorBackupCodes: JSON.stringify(backupCodes),
      },
    });

    return {
      secret,
      qrCodeDataUrl,
      backupCodes,
    };
  }

  async enable2FA(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA secret is not generated yet');
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid TOTP verification code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { is2FAEnabled: true },
    });

    return { message: '2FA successfully enabled' };
  }

  async disable2FA(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        is2FAEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    });
    return { message: '2FA successfully disabled' };
  }
}
