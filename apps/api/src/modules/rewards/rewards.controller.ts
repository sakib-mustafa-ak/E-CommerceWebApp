import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RedeemPointsDto, ClaimReferralDto } from '@siam-aqua/shared-types';

@Controller('rewards')
@UseGuards(JwtAuthGuard)
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('balance')
  async getBalance(@Req() req: any) {
    return this.rewardsService.getOrCreateAccount(req.user.id);
  }

  @Post('redeem')
  async redeemPoints(@Req() req: any, @Body() dto: RedeemPointsDto) {
    return this.rewardsService.redeemPoints(req.user.id, dto);
  }

  @Post('referral/claim')
  async claimReferral(@Req() req: any, @Body() dto: ClaimReferralDto) {
    return this.rewardsService.claimReferral(req.user.id, dto.referralCode);
  }
}
