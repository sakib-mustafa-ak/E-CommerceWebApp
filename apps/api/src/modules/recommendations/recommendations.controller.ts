import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Request,
} from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { BehaviorEventDto } from '@siam-aqua/shared-types';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Post('track')
  async trackBehaviorEvent(
    @Body() dto: BehaviorEventDto,
    @Headers('x-guest-session-id') guestSessionHeader?: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id || undefined;
    const guestSessionId = dto.guestSessionId || guestSessionHeader || undefined;
    return this.recommendationsService.trackBehaviorEvent(userId, guestSessionId, dto);
  }

  @Get('personalized')
  async getPersonalized(
    @Query('userId') queryUserId?: string,
    @Query('guestSessionId') queryGuestSessionId?: string,
    @Query('limit') limit?: number,
    @Headers('x-guest-session-id') guestSessionHeader?: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id || queryUserId || undefined;
    const guestSessionId = queryGuestSessionId || guestSessionHeader || undefined;
    const count = limit ? Number(limit) : 8;
    return this.recommendationsService.getPersonalizedRecommendations(userId, guestSessionId, count);
  }

  @Get('frequently-bought-together/:productId')
  async getFrequentlyBoughtTogether(
    @Param('productId') productId: string,
    @Query('limit') limit?: number,
  ) {
    const count = limit ? Number(limit) : 3;
    return this.recommendationsService.getFrequentlyBoughtTogether(productId, count);
  }

  @Get('substitutes/:productId')
  async getGenericSubstitutes(
    @Param('productId') productId: string,
    @Query('limit') limit?: number,
  ) {
    const count = limit ? Number(limit) : 6;
    return this.recommendationsService.getGenericSubstitutes(productId, count);
  }

  @Get('trending')
  async getTrending(@Query('limit') limit?: number) {
    const count = limit ? Number(limit) : 8;
    return this.recommendationsService.getTrendingProducts(count);
  }
}
