import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { GamingService } from './gaming.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountTypeGuard } from '../../common/guards/account-type.guard';
import { RequireAccountTypes } from '../../common/decorators/account-types.decorator';
import { AccountType } from '@siam-aqua/shared-types';
import {
  GameCreateDto,
  GamePackageCreateDto,
  PlayerIdValidationDto,
  GameTopUpCheckoutDto,
  GameFulfillmentActionDto,
} from '@siam-aqua/shared-types';

@Controller('gaming')
export class GamingController {
  constructor(private readonly gamingService: GamingService) {}

  // ================= PUBLIC GAMING STOREFRONT ENDPOINTS =================

  @Get('games')
  async getPublicGames() {
    return this.gamingService.getPublicGames();
  }

  @Get('games/:slug')
  async getGameBySlug(@Param('slug') slug: string) {
    return this.gamingService.getGameBySlug(slug);
  }

  @Post('validate-player')
  async validatePlayerId(@Body() dto: PlayerIdValidationDto) {
    return this.gamingService.validatePlayerId(dto);
  }

  @Post('checkout')
  async checkoutTopUp(@Body() dto: GameTopUpCheckoutDto, @Request() req: any) {
    const userId = req.user?.id || undefined;
    return this.gamingService.checkoutTopUp(dto, userId);
  }

  @Get('orders/:orderNumber')
  async getOrderByNumber(@Param('orderNumber') orderNumber: string) {
    return this.gamingService.getOrderByNumber(orderNumber);
  }

  // ================= ADMIN GAMING DESK ENDPOINTS =================

  @Post('admin/games')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async createGame(@Body() dto: GameCreateDto, @Request() req: any) {
    return this.gamingService.createGame(dto, req.user);
  }

  @Patch('admin/games/:id')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async updateGame(
    @Param('id') id: string,
    @Body() dto: Partial<GameCreateDto>,
    @Request() req: any,
  ) {
    return this.gamingService.updateGame(id, dto, req.user);
  }

  @Post('admin/packages')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async createPackage(@Body() dto: GamePackageCreateDto, @Request() req: any) {
    return this.gamingService.createPackage(dto, req.user);
  }

  @Patch('admin/packages/:id')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async updatePackage(
    @Param('id') id: string,
    @Body() dto: Partial<GamePackageCreateDto>,
    @Request() req: any,
  ) {
    return this.gamingService.updatePackage(id, dto, req.user);
  }

  @Get('admin/queue')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async getPendingQueue() {
    return this.gamingService.getPendingTopUpQueue();
  }

  @Post('admin/orders/:id/fulfill')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async fulfillManualTopUp(
    @Param('id') orderId: string,
    @Body() dto: GameFulfillmentActionDto,
    @Request() req: any,
  ) {
    return this.gamingService.fulfillManualTopUp(orderId, dto, req.user);
  }
}
