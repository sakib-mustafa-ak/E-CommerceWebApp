import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateType } from '@siam-aqua/shared-types';

@Controller('pricing')
@UseGuards(JwtAuthGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('tiers')
  async getTiers() {
    return this.pricingService.getTiers();
  }

  @Post('tiers')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('pricing.manage_tiers')
  async createTier(
    @Body() dto: { code: string; name: string; description?: string; defaultRateType: RateType; defaultValue: number },
    @CurrentUser() actor: any,
  ) {
    return this.pricingService.createTier(dto, actor);
  }

  @Put('customers/:customerId/tier')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('pricing.manage_tiers')
  async updateCustomerTier(
    @Param('customerId') customerId: string,
    @Body('tierId') tierId: string,
    @CurrentUser() actor: any,
  ) {
    return this.pricingService.updateCustomerTier(customerId, tierId, actor);
  }

  @Post('customers/:customerId/manual-overrides')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('pricing.manage_overrides')
  async setManualOverride(
    @Param('customerId') customerId: string,
    @Body() dto: { productId: string; rateType: RateType; value: number },
    @CurrentUser() actor: any,
  ) {
    return this.pricingService.setCustomerManualOverride(
      customerId,
      dto.productId,
      { rateType: dto.rateType, value: dto.value },
      actor,
    );
  }

  @Get('customers/:customerId/manual-overrides')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('pricing.view_pricing')
  async getCustomerOverrides(@Param('customerId') customerId: string) {
    return this.pricingService.getCustomerOverrides(customerId);
  }

  @Get('catalog')
  async getProductsForCustomer(@CurrentUser('id') customerId: string) {
    return this.pricingService.getProductsForCustomer(customerId);
  }
}
