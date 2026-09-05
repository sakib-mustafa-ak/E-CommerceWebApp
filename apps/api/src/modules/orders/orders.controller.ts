import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountTypeGuard } from '../../common/guards/account-type.guard';
import { RequireAccountTypes } from '../../common/decorators/account-types.decorator';
import {
  AccountType,
  CreatePaikariOrderDto,
  VerifyLineItemDto,
  PriceOverrideDto,
  AddOrderItemsDto,
  FulfillmentStatus,
  MemoState,
  ShortListStatus,
  PlatformSettingsDto,
} from '@siam-aqua/shared-types';
import { Response } from 'express';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('paikari')
  @UseGuards(JwtAuthGuard)
  async createPaikariOrder(@Req() req: any, @Body() dto: CreatePaikariOrderDto) {
    return this.ordersService.createPaikariOrder(req.user.id, req.user.accountType, dto);
  }

  @Post('wholesale')
  @UseGuards(JwtAuthGuard)
  async createWholesaleOrder(@Req() req: any, @Body() dto: CreatePaikariOrderDto) {
    return this.ordersService.createPaikariOrder(req.user.id, req.user.accountType, dto);
  }

  @Get('wholesale/dashboard')
  @UseGuards(JwtAuthGuard)
  async getWholesaleDashboard(@Req() req: any) {
    return this.ordersService.getWholesaleDashboard(req.user.id);
  }

  @Get('short-list/export')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async exportShortListCsv(@Res() res: Response) {
    const csvData = await this.ordersService.exportPharmaTrackShortListCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pharmatrack_short_list.csv"');
    return res.send(csvData);
  }

  @Get('short-list/all')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async getShortList(
    @Query('status') status?: ShortListStatus,
    @Query('q') query?: string,
  ) {
    return this.ordersService.getPharmaTrackShortList(status, query);
  }

  @Get('rankings/all')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async getCustomerRankings() {
    return this.ordersService.getCustomerRankings();
  }

  @Post('rankings/:customerId/upgrade-wholesale')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN)
  async upgradeToWholesaler(
    @Param('customerId') customerId: string,
    @Req() req: any,
  ) {
    return this.ordersService.upgradeCustomerToWholesaler(customerId, req.user.id);
  }

  @Get('settings/platform')
  @UseGuards(JwtAuthGuard)
  async getPlatformSettings() {
    return this.ordersService.getPlatformSettings();
  }

  @Put('settings/platform')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN)
  async updatePlatformSettings(
    @Body() dto: Partial<PlatformSettingsDto>,
    @Req() req: any,
  ) {
    return this.ordersService.updatePlatformSettings(dto, req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOrderById(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.getOrderById(id, req.user.id, req.user.accountType);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listOrders(
    @Req() req: any,
    @Query('fulfillmentStatus') fulfillmentStatus?: FulfillmentStatus,
    @Query('memoState') memoState?: MemoState,
  ) {
    const isStaffOrAdmin =
      req.user.accountType === AccountType.SUPER_ADMIN ||
      req.user.accountType === AccountType.STAFF;
    const userId = isStaffOrAdmin ? undefined : req.user.id;

    return this.ordersService.listOrders({
      userId,
      fulfillmentStatus,
      memoState,
    });
  }

  @Post(':id/verify-item')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async verifyLineItem(
    @Param('id') orderId: string,
    @Req() req: any,
    @Body() dto: VerifyLineItemDto,
  ) {
    return this.ordersService.verifyLineItem(orderId, req.user.id, dto);
  }

  @Post(':id/override-price')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async overrideLinePrice(
    @Param('id') orderId: string,
    @Req() req: any,
    @Body() dto: PriceOverrideDto,
  ) {
    return this.ordersService.overrideLineItemPrice(orderId, req.user.id, dto);
  }

  @Post(':id/publish-memo')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async publishFinalMemo(@Param('id') orderId: string, @Req() req: any) {
    return this.ordersService.publishFinalMemo(orderId, req.user.id);
  }

  @Post(':id/add-items')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async addItemsToOrder(
    @Param('id') orderId: string,
    @Req() req: any,
    @Body() dto: AddOrderItemsDto,
  ) {
    return this.ordersService.addItemsToOrder(orderId, req.user.id, dto);
  }

  @Post(':id/status')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Req() req: any,
    @Body() body: { status: FulfillmentStatus; isTodayDelivery?: boolean },
  ) {
    return this.ordersService.updateOrderStatus(
      orderId,
      req.user.id,
      body.status,
      body.isTodayDelivery,
    );
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(
    @Param('id') orderId: string,
    @Req() req: any,
    @Body() body: { reason: string },
  ) {
    return this.ordersService.requestOrExecuteCancellation(
      orderId,
      req.user.id,
      req.user.accountType,
      body.reason,
    );
  }

  @Post(':id/cancel-response')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async respondCancellation(
    @Param('id') orderId: string,
    @Req() req: any,
    @Body() body: { approve: boolean; note?: string },
  ) {
    return this.ordersService.respondToCancellationRequest(
      orderId,
      req.user.id,
      body.approve,
      body.note,
    );
  }

  @Post(':id/refused-delivery')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async handleRefusedDelivery(
    @Param('id') orderId: string,
    @Req() req: any,
    @Body() body: { reason: string },
  ) {
    return this.ordersService.handleRefusedDelivery(orderId, req.user.id, body.reason);
  }
}
