import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountType } from '@siam-aqua/shared-types';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    // SuperAdmin bypasses permission checks
    if (user.accountType === AccountType.SUPER_ADMIN) {
      return true;
    }

    // Only STAFF and SUPER_ADMIN have dynamic admin panel permissions
    if (user.accountType !== AccountType.STAFF) {
      throw new ForbiddenException('Staff credentials required');
    }

    const userPermissions: string[] = user.permissions || [];
    const hasAll = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAll) {
      throw new ForbiddenException(
        `Missing required permission(s): ${requiredPermissions.filter((p) => !userPermissions.includes(p)).join(', ')}`,
      );
    }

    return true;
  }
}
