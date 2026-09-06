import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { DealsService } from './deals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountTypeGuard } from '../../common/guards/account-type.guard';
import { RequireAccountTypes } from '../../common/decorators/account-types.decorator';
import {
  AccountType,
  FlashSaleDealDto,
  ProductBundleDealDto,
} from '@siam-aqua/shared-types';

@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get('flash-sales')
  async getFlashSales() {
    return this.dealsService.getActiveFlashSales();
  }

  @Get('bundles')
  async getBundles() {
    return this.dealsService.getActiveBundles();
  }

  @Post('admin/flash-sales')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async createFlashSale(@Body() dto: FlashSaleDealDto) {
    return this.dealsService.createFlashSale(dto);
  }

  @Post('admin/bundles')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async createBundle(@Body() dto: ProductBundleDealDto) {
    return this.dealsService.createProductBundle(dto);
  }
}
