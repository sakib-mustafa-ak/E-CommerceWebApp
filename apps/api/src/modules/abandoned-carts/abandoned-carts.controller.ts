import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AbandonedCartsService } from './abandoned-carts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountTypeGuard } from '../../common/guards/account-type.guard';
import { RequireAccountTypes } from '../../common/decorators/account-types.decorator';
import {
  AccountType,
  AbandonedCartReminderTriggerDto,
} from '@siam-aqua/shared-types';

@Controller('abandoned-carts')
export class AbandonedCartsController {
  constructor(private readonly abandonedCartsService: AbandonedCartsService) {}

  @Post('track')
  async trackCart(@Body() body: any) {
    return this.abandonedCartsService.trackCartActivity(body);
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async getAbandonedCarts(@Query('olderThanHours') olderThanHours?: string) {
    const hours = olderThanHours ? parseFloat(olderThanHours) : 2;
    return this.abandonedCartsService.getAbandonedCarts(hours);
  }

  @Post('admin/remind')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async sendReminder(@Body() dto: AbandonedCartReminderTriggerDto) {
    return this.abandonedCartsService.sendReminder(dto);
  }
}
