import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PublicService } from './public.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  PublicCheckoutDto,
  ProductReviewCreateDto,
  UserBehaviorEventDto,
} from '@siam-aqua/shared-types';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // 1. Unified Public Checkout (Works for both authenticated users and guests)
  @Post('checkout')
  async checkout(@Body() dto: PublicCheckoutDto, @Request() req: any) {
    const userId = req.user?.id || undefined;
    return this.publicService.checkout(dto, userId);
  }

  // 2. Digital Download Token Execution
  @Get('downloads/:token')
  async downloadFile(@Param('token') token: string) {
    return this.publicService.downloadDigitalProduct(token);
  }

  @Get('downloads/:token/info')
  async getDownloadInfo(@Param('token') token: string) {
    return this.publicService.getDigitalTokenInfo(token);
  }

  // 3. Customer Order History
  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(@Request() req: any, @Query('type') orderType?: string) {
    return this.publicService.getCustomerOrderHistory(req.user.id, orderType);
  }

  // 4. Order Printable Receipt
  @Get('orders/:id/receipt')
  async getOrderReceipt(@Param('id') orderId: string, @Request() req: any) {
    return this.publicService.getOrderReceipt(orderId, req.user?.id);
  }

  // 5. Wishlist Management
  @Post('wishlist/:productId')
  @UseGuards(JwtAuthGuard)
  async toggleWishlist(
    @Request() req: any,
    @Param('productId') productId: string,
  ) {
    return this.publicService.toggleWishlist(req.user.id, productId);
  }

  @Get('wishlist')
  @UseGuards(JwtAuthGuard)
  async getWishlist(@Request() req: any) {
    return this.publicService.getWishlist(req.user.id);
  }

  // 6. Product Reviews
  @Post('reviews')
  async addReview(@Body() dto: ProductReviewCreateDto, @Request() req: any) {
    return this.publicService.addProductReview(req.user?.id, dto);
  }

  @Get('products/:productId/reviews')
  async getReviews(@Param('productId') productId: string) {
    return this.publicService.getProductReviews(productId);
  }

  // 7. Behavioral Tracking
  @Post('behavior-log')
  async logBehavior(@Body() dto: UserBehaviorEventDto, @Request() req: any) {
    return this.publicService.logBehavior(req.user?.id, dto);
  }

  // 8. Recommendations ("You Might Also Like")
  @Get('products/:productId/recommendations')
  async getRecommendations(
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    return this.publicService.getRecommendations(
      productId,
      limit ? parseInt(limit, 10) : 6,
    );
  }

  // 9. Product Details by Slug with Stealth Resolution
  @Get('products/by-slug/:slug')
  async getProductBySlug(
    @Param('slug') slug: string,
    @Request() req: any,
  ) {
    return this.publicService.getProductBySlugStealth(
      slug,
      req.user?.accountType,
    );
  }
}
