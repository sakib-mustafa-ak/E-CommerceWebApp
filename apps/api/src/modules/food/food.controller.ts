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
import { FoodService } from './food.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountTypeGuard } from '../../common/guards/account-type.guard';
import { RequireAccountTypes } from '../../common/decorators/account-types.decorator';
import { AccountType } from '@siam-aqua/shared-types';
import {
  RestaurantCreateDto,
  RestaurantUpdateDto,
  MenuCategoryDto,
  MenuItemCreateDto,
  MenuItemUpdateDto,
  FoodOrderCreateDto,
  FoodOrderStatusUpdateDto,
  FoodOrderStatus,
} from '@siam-aqua/shared-types';

@Controller('food')
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  // ================= PUBLIC FOOD MARKETPLACE ENDPOINTS =================

  @Get('restaurants')
  async getPublicRestaurants(
    @Query('area') area?: string,
    @Query('cuisine') cuisine?: string,
    @Query('search') search?: string,
  ) {
    return this.foodService.getPublicRestaurants({ area, cuisine, search });
  }

  @Get('restaurants/by-slug/:slug')
  async getRestaurantBySlug(@Param('slug') slug: string) {
    return this.foodService.getRestaurantBySlug(slug);
  }

  @Post('orders')
  async placeOrder(@Body() dto: FoodOrderCreateDto, @Request() req: any) {
    const userId = req.user?.id || undefined;
    return this.foodService.placeOrder(userId, dto);
  }

  @Get('orders/tracking/:orderNumber')
  async getOrderByOrderNumber(@Param('orderNumber') orderNumber: string) {
    return this.foodService.getOrderByOrderNumber(orderNumber);
  }

  // ================= VENDOR SELF-SERVICE ENDPOINTS =================

  @Post('vendor/apply')
  @UseGuards(JwtAuthGuard)
  async applyForRestaurant(@Body() dto: RestaurantCreateDto, @Request() req: any) {
    return this.foodService.applyForRestaurant(req.user.id, dto);
  }

  @Get('vendor/my-restaurant')
  @UseGuards(JwtAuthGuard)
  async getMyRestaurant(@Request() req: any) {
    return this.foodService.getRestaurantByVendorUser(req.user.id);
  }

  @Patch('vendor/my-restaurant')
  @UseGuards(JwtAuthGuard)
  async updateMyRestaurant(@Body() dto: RestaurantUpdateDto, @Request() req: any) {
    const restaurant = await this.foodService.getRestaurantByVendorUser(req.user.id);
    return this.foodService.updateRestaurant(req.user.id, false, restaurant.id, dto);
  }

  @Post('vendor/categories')
  @UseGuards(JwtAuthGuard)
  async createCategory(@Body() dto: MenuCategoryDto, @Request() req: any) {
    return this.foodService.createCategory(req.user.id, dto);
  }

  @Post('vendor/items')
  @UseGuards(JwtAuthGuard)
  async createMenuItem(@Body() dto: MenuItemCreateDto, @Request() req: any) {
    return this.foodService.createMenuItem(req.user.id, dto);
  }

  @Patch('vendor/items/:itemId')
  @UseGuards(JwtAuthGuard)
  async updateMenuItem(
    @Param('itemId') itemId: string,
    @Body() dto: MenuItemUpdateDto,
    @Request() req: any,
  ) {
    return this.foodService.updateMenuItem(req.user.id, itemId, dto);
  }

  @Post('vendor/items/:itemId/toggle-86')
  @UseGuards(JwtAuthGuard)
  async toggleMenuItem86(
    @Param('itemId') itemId: string,
    @Body('isAvailable') isAvailable: boolean,
    @Request() req: any,
  ) {
    return this.foodService.toggleMenuItemAvailability(req.user.id, itemId, isAvailable);
  }

  @Get('vendor/orders')
  @UseGuards(JwtAuthGuard)
  async getVendorOrders(
    @Query('status') status: FoodOrderStatus | undefined,
    @Request() req: any,
  ) {
    return this.foodService.getVendorOrders(req.user.id, status);
  }

  @Patch('vendor/orders/:orderId/status')
  @UseGuards(JwtAuthGuard)
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() dto: FoodOrderStatusUpdateDto,
    @Request() req: any,
  ) {
    const isStaff =
      req.user.accountType === AccountType.SUPER_ADMIN ||
      req.user.accountType === AccountType.STAFF;
    return this.foodService.updateOrderStatus(req.user.id, isStaff, orderId, dto);
  }

  @Get('vendor/ledger')
  @UseGuards(JwtAuthGuard)
  async getVendorLedger(@Request() req: any) {
    return this.foodService.getRestaurantLedger(req.user.id);
  }

  // ================= ADMIN / STAFF MANAGEMENT ENDPOINTS =================

  @Get('admin/restaurants')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async getAllRestaurantsAdmin() {
    return this.foodService.getAllRestaurantsAdmin();
  }

  @Patch('admin/restaurants/:restaurantId/approve')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async approveRestaurant(
    @Param('restaurantId') restaurantId: string,
    @Body('commissionRate') commissionRate?: number,
    @Request() req?: any,
  ) {
    return this.foodService.approveRestaurant(req.user.id, restaurantId, commissionRate);
  }
}
