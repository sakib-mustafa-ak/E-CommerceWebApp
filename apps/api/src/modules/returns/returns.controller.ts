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
import { ReturnsService } from './returns.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountTypeGuard } from '../../common/guards/account-type.guard';
import { RequireAccountTypes } from '../../common/decorators/account-types.decorator';
import {
  AccountType,
  CreateReturnDto,
  ReviewReturnDto,
  ReturnStatus,
} from '@siam-aqua/shared-types';

@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReturn(@Req() req: any, @Body() dto: CreateReturnDto) {
    return this.returnsService.createReturnRequest(req.user.id, req.user.accountType, dto);
  }

  @Get('products/flagged')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async getHighReturnProducts() {
    return this.returnsService.getHighReturnProducts();
  }

  @Get('customer/:customerId/history')
  @UseGuards(JwtAuthGuard)
  async getCustomerReturnHistory(
    @Param('customerId') customerId: string,
    @Req() req: any,
  ) {
    const isStaffOrAdmin =
      req.user.accountType === AccountType.SUPER_ADMIN ||
      req.user.accountType === AccountType.STAFF;
    const targetId = isStaffOrAdmin ? customerId : req.user.id;

    return this.returnsService.getCustomerReturnHistory(targetId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getReturnById(@Param('id') id: string, @Req() req: any) {
    return this.returnsService.getReturnById(id, req.user.id, req.user.accountType);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listReturns(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: ReturnStatus,
    @Query('sector') sector?: string,
  ) {
    const isStaffOrAdmin =
      req.user.accountType === AccountType.SUPER_ADMIN ||
      req.user.accountType === AccountType.STAFF;
    const userId = isStaffOrAdmin ? undefined : req.user.id;

    return this.returnsService.listReturns({
      startDate,
      endDate,
      status,
      sectorType: sector,
      userId,
    });
  }

  @Post(':id/review')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async reviewReturn(
    @Param('id') returnId: string,
    @Req() req: any,
    @Body() dto: ReviewReturnDto,
  ) {
    return this.returnsService.reviewReturnRequest(returnId, req.user.id, dto);
  }
}
