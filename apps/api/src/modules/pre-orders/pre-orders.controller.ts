import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PreOrdersService } from './pre-orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountTypeGuard } from '../../common/guards/account-type.guard';
import { RequireAccountTypes } from '../../common/decorators/account-types.decorator';
import {
  AccountType,
  CreatePreOrderDto,
  PreOrderStatus,
} from '@siam-aqua/shared-types';

@Controller('pre-orders')
export class PreOrdersController {
  constructor(private readonly preOrdersService: PreOrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPreOrder(@Req() req: any, @Body() dto: CreatePreOrderDto) {
    return this.preOrdersService.createPreOrder(req.user.id, req.user.accountType, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyPreOrders(@Req() req: any) {
    return this.preOrdersService.getMyPreOrders(req.user.id);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF, AccountType.MPO)
  async getAllPreOrders(
    @Query('status') status?: PreOrderStatus,
    @Query('leadTime') leadTime?: string,
    @Query('q') query?: string,
  ) {
    return this.preOrdersService.getAllPreOrders({
      status,
      leadTimeDays: leadTime ? parseInt(leadTime, 10) : undefined,
      query,
    });
  }

  @Post(':id/status')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF, AccountType.MPO)
  async updateStatus(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { status: PreOrderStatus; notes?: string; mpoAssignedId?: string },
  ) {
    return this.preOrdersService.updatePreOrderStatus(
      id,
      req.user.id,
      body.status,
      body.notes,
      body.mpoAssignedId,
    );
  }
}
