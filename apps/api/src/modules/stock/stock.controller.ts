import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountTypeGuard } from '../../common/guards/account-type.guard';
import { RequireAccountTypes } from '../../common/decorators/account-types.decorator';
import {
  AccountType,
  StockBatchDto,
  StockSaleCreateDto,
} from '@siam-aqua/shared-types';

@Controller('stock')
@UseGuards(JwtAuthGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  private checkStockModulePermission(user: any) {
    if (
      user.accountType === AccountType.SUPER_ADMIN ||
      user.accountType === AccountType.STAFF ||
      user.hasStockModuleAccess
    ) {
      return;
    }
    throw new ForbiddenException('You do not have access to the Stock Management Module');
  }

  @Post('batches')
  async createBatch(@Req() req: any, @Body() dto: StockBatchDto) {
    this.checkStockModulePermission(req.user);
    return this.stockService.createBatch(req.user.id, dto);
  }

  @Get('batches')
  async getBatches(
    @Req() req: any,
    @Query('ownerId') filterOwnerId?: string,
    @Query('productId') productId?: string,
  ) {
    this.checkStockModulePermission(req.user);
    return this.stockService.getBatches(req.user.id, req.user.accountType, {
      filterOwnerId,
      productId,
    });
  }

  @Get('summary')
  async getSummary(@Req() req: any, @Query('ownerId') filterOwnerId?: string) {
    this.checkStockModulePermission(req.user);
    return this.stockService.getInventorySummary(
      req.user.id,
      req.user.accountType,
      filterOwnerId,
    );
  }

  @Get('alerts')
  async getAlerts(
    @Req() req: any,
    @Query('daysAhead') daysAhead?: string,
    @Query('ownerId') filterOwnerId?: string,
  ) {
    this.checkStockModulePermission(req.user);
    return this.stockService.getAlerts(
      req.user.id,
      req.user.accountType,
      daysAhead ? parseInt(daysAhead, 10) : 90,
      filterOwnerId,
    );
  }

  @Post('sales')
  async recordSale(@Req() req: any, @Body() dto: StockSaleCreateDto) {
    this.checkStockModulePermission(req.user);
    return this.stockService.recordSale(req.user.id, dto);
  }

  @Post('counter-sale')
  async recordCounterSale(@Req() req: any, @Body() dto: StockSaleCreateDto) {
    this.checkStockModulePermission(req.user);
    return this.stockService.recordSale(req.user.id, dto);
  }

  @Post('grant-access/:userId')
  @UseGuards(AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN)
  async grantAccess(
    @Param('userId') targetUserId: string,
    @Req() req: any,
    @Body() body: { grant: boolean },
  ) {
    return this.stockService.grantStockModuleAccess(
      req.user.id,
      targetUserId,
      body.grant,
    );
  }
}
