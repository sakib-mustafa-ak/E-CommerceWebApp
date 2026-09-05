import { SetMetadata } from '@nestjs/common';
import { AccountType } from '@siam-aqua/shared-types';

export const ACCOUNT_TYPES_KEY = 'account_types';
export const RequireAccountTypes = (...types: AccountType[]) =>
  SetMetadata(ACCOUNT_TYPES_KEY, types);
