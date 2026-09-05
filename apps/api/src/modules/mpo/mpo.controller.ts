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
import { MpoService } from './mpo.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountTypeGuard } from '../../common/guards/account-type.guard';
import { RequireAccountTypes } from '../../common/decorators/account-types.decorator';
import { AccountType } from '@siam-aqua/shared-types';
import {
  MpoCreateAccountDto,
  MpoListingCreateDto,
  MpoListingReviewDto,
  MpoBidCreateDto,
  PreOrderDraftMemoUpdateDto,
} from '@siam-aqua/shared-types';

@Controller('mpo')
@UseGuards(JwtAuthGuard, AccountTypeGuard)
export class MpoController {
  constructor(private readonly mpoService: MpoService) {}

  // ================= ADMIN ENDPOINTS =================

  @Post('admin/accounts')
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async createAccount(@Body() dto: MpoCreateAccountDto, @Request() req: any) {
    return this.mpoService.createMpoAccount(dto, req.user?.id);
  }

  @Get('admin/territories')
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async getTerritoryGroupings() {
    return this.mpoService.getTerritoriesGrouping();
  }

  @Get('admin/profile/:id')
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async getAdminMpoProfile(@Param('id') profileId: string) {
    return this.mpoService.getMpoProfileById(profileId, true);
  }

  @Patch('admin/profile/:id')
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async updateMpoProfile(
    @Param('id') profileId: string,
    @Body() body: {
      territory?: string;
      photoUrl?: string;
      adminPrivateNotes?: string;
      assignedCompanyIds?: string[];
      selectedProductIds?: string[];
    },
  ) {
    return this.mpoService.updateMpoProfile(profileId, body);
  }

  @Get('admin/queue')
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async getAdminQueue(@Query('status') status?: string) {
    return this.mpoService.getAdminListingQueue(status);
  }

  @Patch('admin/listings/:id/review')
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async reviewListing(
    @Param('id') listingId: string,
    @Body() dto: MpoListingReviewDto,
    @Request() req: any,
  ) {
    return this.mpoService.reviewListing(req.user?.id, listingId, dto);
  }

  @Post('admin/orders/:orderId/pre-order-draft')
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async updatePreOrderDraftMemo(
    @Param('orderId') orderId: string,
    @Body() dto: PreOrderDraftMemoUpdateDto,
    @Request() req: any,
  ) {
    return this.mpoService.updatePreOrderDraftMemo(req.user?.id, orderId, dto);
  }

  @Post('admin/nudge-stale')
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async nudgeStaleListings() {
    return this.mpoService.checkStaleListingsAndNudge();
  }

  // ================= MPO DEDICATED ENDPOINTS =================

  @Get('me/profile')
  @RequireAccountTypes(AccountType.MPO)
  async getMyProfile(@Request() req: any) {
    return this.mpoService.getMpoProfileByUserId(req.user.id, false);
  }

  @Get('me/catalog-subset')
  @RequireAccountTypes(AccountType.MPO)
  async getMyCatalogSubset(@Request() req: any, @Query('q') query?: string) {
    return this.mpoService.getMpoCatalogSubset(req.user.id, query);
  }

  @Post('me/listings')
  @RequireAccountTypes(AccountType.MPO)
  async createListing(@Request() req: any, @Body() dto: MpoListingCreateDto) {
    return this.mpoService.createListing(req.user.id, dto);
  }

  @Get('me/listings')
  @RequireAccountTypes(AccountType.MPO)
  async getMyListings(@Request() req: any) {
    return this.mpoService.getMpoListings(req.user.id);
  }

  @Post('me/listings/:id/bids/:bidId/accept')
  @RequireAccountTypes(AccountType.MPO)
  async acceptBid(
    @Request() req: any,
    @Param('id') listingId: string,
    @Param('bidId') bidId: string,
  ) {
    return this.mpoService.acceptBid(req.user.id, listingId, bidId);
  }

  // ================= WHOLESALER FEED & BIDDING =================

  @Get('wholesale/feed')
  @RequireAccountTypes(
    AccountType.WHOLESALER_SELLER,
    AccountType.SUPER_ADMIN,
    AccountType.STAFF,
  )
  async getWholesaleFeed(@Request() req: any) {
    return this.mpoService.getWholesaleFeed(req.user.id);
  }

  @Post('wholesale/listings/:id/bid')
  @RequireAccountTypes(AccountType.WHOLESALER_SELLER)
  async placeBid(
    @Request() req: any,
    @Param('id') listingId: string,
    @Body() dto: MpoBidCreateDto,
  ) {
    return this.mpoService.placeBid(req.user.id, listingId, dto);
  }
}
