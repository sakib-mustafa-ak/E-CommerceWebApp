import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PriceAlertsService } from './price-alerts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountTypeGuard } from '../../common/guards/account-type.guard';
import { RequireAccountTypes } from '../../common/decorators/account-types.decorator';
import {
  AccountType,
  CreatePriceDropSubscriptionDto,
} from '@siam-aqua/shared-types';

@Controller('price-alerts')
export class PriceAlertsController {
  constructor(private readonly priceAlertsService: PriceAlertsService) {}

  @Post('subscribe')
  async subscribe(@Req() req: any, @Body() dto: CreatePriceDropSubscriptionDto) {
    const userId = req.user?.id || undefined;
    return this.priceAlertsService.subscribePriceDrop(userId, dto);
  }

  @Get('my-alerts')
  @UseGuards(JwtAuthGuard)
  async getMyAlerts(@Req() req: any) {
    return this.priceAlertsService.getMyAlerts(req.user.id);
  }

  @Post('admin/scan-triggers')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async scanTriggers() {
    return this.priceAlertsService.checkAndTriggerPriceDrops();
  }
}
