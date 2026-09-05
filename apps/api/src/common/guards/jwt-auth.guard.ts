import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../services/prisma.service';
import { SuspensionType, IpRuleType } from '@siam-aqua/shared-types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const clientIp =
      request.headers['x-forwarded-for'] ||
      request.socket?.remoteAddress ||
      '127.0.0.1';

    // 1. IP Block check on every request
    const ipRule = await this.prisma.ipRule.findUnique({
      where: { ipAddress: String(clientIp).split(',')[0].trim() },
    });

    if (ipRule && ipRule.type === IpRuleType.BLOCK) {
      if (!ipRule.expiresAt || new Date(ipRule.expiresAt) > new Date()) {
        throw new ForbiddenException(
          `Access from your IP address is blocked. Reason: ${ipRule.reason}`,
        );
      }
    }

    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    const token = authHeader.split(' ')[1];
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }

    // 2. Fetch fresh user record from database (server-side verification on every request)
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub || payload.id },
      include: {
        staffProfile: true,
        customerProfile: {
          include: { tier: true },
        },
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    // 3. Account suspension check (indefinite or temporary)
    if (user.suspensionType === SuspensionType.INDEFINITE) {
      throw new ForbiddenException(
        `Account is suspended indefinitely. Reason: ${user.suspensionReason || 'Contact support'}`,
      );
    }

    if (user.suspensionType === SuspensionType.TEMPORARY) {
      if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
        throw new ForbiddenException(
          `Account is suspended until ${user.suspendedUntil.toISOString()}. Reason: ${user.suspensionReason || 'Violation of terms'}`,
        );
      } else if (user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
        // Auto-expiration: update DB to NONE
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            suspensionType: SuspensionType.NONE,
            suspendedUntil: null,
            suspensionReason: null,
          },
        });
      }
    }

    // 4. Flatten permissions
    const permissions = new Set<string>();
    const roles = new Set<string>();

    for (const ur of user.userRoles) {
      roles.add(ur.role.slug);
      for (const rp of ur.role.rolePermissions) {
        permissions.add(rp.permission.slug);
      }
    }

    request.user = {
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
    };

    return true;
  }
}
