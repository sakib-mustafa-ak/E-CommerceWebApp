import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ResellerService } from './reseller.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountTypeGuard } from '../../common/guards/account-type.guard';
import { RequireAccountTypes } from '../../common/decorators/account-types.decorator';
import { AccountType } from '@siam-aqua/shared-types';
import {
  WholesalerPublicListingCreateDto,
  WholesalerListingReviewDto,
  ResellerStatementReconcileDto,
} from '@siam-aqua/shared-types';

@Controller('reseller')
export class ResellerController {
  constructor(private readonly resellerService: ResellerService) {}

  // ================= PUBLIC ENDPOINTS =================

  @Get('listings/public')
  async getPublicListings(@Query('productId') productId?: string) {
    return this.resellerService.getPublicActiveListings(productId);
  }

  // ================= WHOLESALER ENDPOINTS =================

  @Post('listings')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.WHOLESALER_SELLER, AccountType.SUPER_ADMIN)
  async createListing(
    @Body() dto: WholesalerPublicListingCreateDto,
    @Request() req: any,
  ) {
    return this.resellerService.createPublicListing(req.user.id, dto);
  }

  @Get('listings/my')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.WHOLESALER_SELLER, AccountType.SUPER_ADMIN)
  async getMyListings(@Request() req: any) {
    return this.resellerService.getMyListings(req.user.id);
  }

  @Get('ledger/my')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.WHOLESALER_SELLER, AccountType.SUPER_ADMIN)
  async getMyLedger(@Request() req: any) {
    return this.resellerService.getCommissionLedger(req.user.id);
  }

  @Get('statements/my')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.WHOLESALER_SELLER, AccountType.SUPER_ADMIN)
  async getMyStatements(@Request() req: any) {
    return this.resellerService.getWholesalerStatements(req.user.id);
  }

  @Post('statements/:id/reconcile')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.WHOLESALER_SELLER, AccountType.SUPER_ADMIN)
  async reconcileStatement(
    @Param('id') statementId: string,
    @Body() dto: ResellerStatementReconcileDto,
    @Request() req: any,
  ) {
    return this.resellerService.reconcileStatement(statementId, req.user.id, dto);
  }

  // ================= ADMIN ENDPOINTS =================

  @Get('admin/listings')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async getAdminReviewQueue(
    @Query('status') status?: string,
    @Query('wholesalerId') wholesalerId?: string,
  ) {
    return this.resellerService.getAdminReviewQueue({ status, wholesalerId });
  }

  @Patch('admin/listings/:id/review')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async reviewListing(
    @Param('id') listingId: string,
    @Body() dto: WholesalerListingReviewDto,
    @Request() req: any,
  ) {
    return this.resellerService.reviewListing(listingId, dto, req.user);
  }

  @Get('admin/ledger')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async getPlatformLedger(@Query('wholesalerId') wholesalerId?: string) {
    return this.resellerService.getCommissionLedger(wholesalerId);
  }

  @Post('admin/statements/generate')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async generateStatement(
    @Body()
    body: {
      wholesalerId: string;
      year: number;
      month: number;
    },
    @Request() req: any,
  ) {
    return this.resellerService.generateMonthlyStatement(
      body.wholesalerId,
      body.year,
      body.month,
      req.user,
    );
  }

  @Patch('admin/statements/:id/settle')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async settleStatement(
    @Param('id') statementId: string,
    @Body() body: { note?: string },
    @Request() req: any,
  ) {
    return this.resellerService.adminSettleStatement(
      statementId,
      req.user,
      body.note,
    );
  }

  @Patch('admin/wholesalers/:id/settings')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async updateWholesalerSettings(
    @Param('id') wholesalerId: string,
    @Body()
    body: {
      isEnabled?: boolean;
      commissionRate?: number;
      defaultBranding?: string;
    },
    @Request() req: any,
  ) {
    return this.resellerService.updateWholesalerResellerSettings(
      wholesalerId,
      body,
      req.user,
    );
  }
}
