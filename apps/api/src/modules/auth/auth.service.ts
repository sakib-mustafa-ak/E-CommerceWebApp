import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AccountType, SuspensionType, AuditAction } from '@siam-aqua/shared-types';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import * as crypto from 'crypto';

export function getRedirectPathForAccountType(accountType: AccountType | string): string {
  switch (accountType) {
    case AccountType.SUPER_ADMIN:
    case AccountType.STAFF:
      return '/admin';
    case AccountType.PAIKARI_SELLER:
      return '/paikari';
    case AccountType.WHOLESALER_SELLER:
      return '/wholesale';
    case AccountType.MPO:
      return '/mpo';
    case AccountType.FOOD_VENDOR:
      return '/food';
    case AccountType.PUBLIC_USER:
    default:
      return '/';
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
  ) {}

  async login(
    dto: { emailOrPhone: string; password: string; totpCode?: string },
    ipAddress: string,
    userAgent: string,
  ) {
    const identifier = dto.emailOrPhone.trim();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
      include: {
        staffProfile: true,
        customerProfile: { include: { tier: true } },
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 1. Lockout Check
    if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      const minutesRemaining = Math.ceil(
        (new Date(user.lockoutUntil).getTime() - Date.now()) / (60 * 1000),
      );
      throw new ForbiddenException(
        `Account is temporarily locked due to repeated failed logins. Please try again in ${minutesRemaining} minutes.`,
      );
    }

    // 2. Suspension Check
    if (user.suspensionType === SuspensionType.INDEFINITE) {
      throw new ForbiddenException(
        `Your account has been suspended indefinitely. Reason: ${user.suspensionReason || 'Contact management'}`,
      );
    }

    if (user.suspensionType === SuspensionType.TEMPORARY) {
      if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
        throw new ForbiddenException(
          `Your account is suspended until ${user.suspendedUntil.toISOString()}. Reason: ${user.suspensionReason || 'Violation of policy'}`,
        );
      }
    }

    // 3. Password Verification
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      const failedAttempts = user.failedLoginAttempts + 1;
      let lockoutUntil: Date | null = null;

      if (failedAttempts >= 5) {
        lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
        await this.audit.log({
          actorId: user.id,
          actorEmail: user.email,
          action: AuditAction.LOGIN_FAILED_LOCKOUT,
          entityType: 'User',
          entityId: user.id,
          afterData: { failedAttempts, lockoutUntil, ipAddress },
          ipAddress,
          userAgent,
        });
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: failedAttempts, lockoutUntil },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login count on successful password
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockoutUntil: null },
      });
    }

    // 4. 2FA Check
    if (user.is2FAEnabled && user.twoFactorSecret) {
      if (!dto.totpCode) {
        return {
          requires2FA: true,
          userId: user.id,
          email: user.email,
          message: 'Two-factor authentication code required',
        };
      }

      // Check TOTP code
      const isTotpValid = authenticator.verify({
        token: dto.totpCode,
        secret: user.twoFactorSecret,
      });

      // Check backup codes if TOTP fails
      let usedBackupCode = false;
      if (!isTotpValid && user.twoFactorBackupCodes) {
        const backupCodes: string[] = JSON.parse(user.twoFactorBackupCodes);
        const codeIndex = backupCodes.indexOf(dto.totpCode.toUpperCase());
        if (codeIndex !== -1) {
          usedBackupCode = true;
          backupCodes.splice(codeIndex, 1);
          await this.prisma.user.update({
            where: { id: user.id },
            data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
          });
        }
      }

      if (!isTotpValid && !usedBackupCode) {
        throw new UnauthorizedException('Invalid 2FA code or backup code');
      }
    }

    // 5. Generate Session & JWT
    const permissions = new Set<string>();
    const roles = new Set<string>();
    for (const ur of user.userRoles) {
      roles.add(ur.role.slug);
      for (const rp of ur.role.rolePermissions) {
        permissions.add(rp.permission.slug);
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      accountType: user.accountType,
    };

    const token = this.jwtService.sign(payload);
    const redirectUrl = getRedirectPathForAccountType(user.accountType);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        accountType: user.accountType,
        tierId: user.customerProfile?.tierId,
        tierCode: user.customerProfile?.tier?.code,
        tierName: user.customerProfile?.tier?.name,
        roles: Array.from(roles),
        permissions: Array.from(permissions),
        is2FAEnabled: user.is2FAEnabled,
      },
      redirectUrl,
    };
  }

  async registerPublicUser(dto: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, ...(dto.phone ? [{ phone: dto.phone }] : [])],
      },
    });

    if (existing) {
      throw new BadRequestException('User with this email or phone already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        accountType: AccountType.PUBLIC_USER,
      },
    });

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      accountType: user.accountType,
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        accountType: user.accountType,
      },
      redirectUrl: '/',
    };
  }

  async socialAuthStub(dto: {
    provider: 'google' | 'facebook';
    email: string;
    name: string;
    socialId: string;
  }) {
    let user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          accountType: AccountType.PUBLIC_USER,
        },
      });
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      accountType: user.accountType,
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        accountType: user.accountType,
      },
      redirectUrl: '/',
    };
  }
}
