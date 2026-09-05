import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountType } from '@siam-aqua/shared-types';
import { ACCOUNT_TYPES_KEY } from '../decorators/account-types.decorator';

@Injectable()
export class AccountTypeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTypes = this.reflector.getAllAndOverride<AccountType[]>(
      ACCOUNT_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredTypes || requiredTypes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      // Unauthenticated / unknown: disguise protected routes as 404
      throw new NotFoundException('Route not found');
    }

    // SuperAdmin always has full master access
    if (user.accountType === AccountType.SUPER_ADMIN) {
      return true;
    }

    const hasAccess = requiredTypes.includes(user.accountType);

    if (!hasAccess) {
      // RULE 1 & 4: Strict Stealth Rule. If an unauthorized role (e.g. PAIKARI_SELLER)
      // queries a WHOLESALER route or any route requiring WHOLESALER_SELLER,
      // return 404 Not Found so they get ZERO indication wholesale exists.
      if (
        requiredTypes.includes(AccountType.WHOLESALER_SELLER) ||
        request.originalUrl?.includes('/wholesale') ||
        user.accountType === AccountType.PAIKARI_SELLER
      ) {
        throw new NotFoundException('Route not found');
      }

      throw new ForbiddenException('Access denied for your account type');
    }

    return true;
  }
}
