import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IpRuleType, SuspensionType } from '@siam-aqua/shared-types';

@Controller('security')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('ip-rules')
  @RequirePermissions('security.manage_ip')
  async getIpRules() {
    return this.securityService.getIpRules();
  }

  @Post('ip-rules')
  @RequirePermissions('security.manage_ip')
  async createIpRule(
    @Body() dto: { ipAddress: string; type: IpRuleType; reason: string; expiresAt?: string },
    @CurrentUser() actor: any,
  ) {
    return this.securityService.createIpRule(dto, actor);
  }

  @Delete('ip-rules/:id')
  @RequirePermissions('security.manage_ip')
  async deleteIpRule(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.securityService.deleteIpRule(id, actor);
  }

  @Post('accounts/:userId/suspend')
  @RequirePermissions('security.manage_suspensions')
  async suspendAccount(
    @Param('userId') userId: string,
    @Body() dto: { suspensionType: SuspensionType; durationDays?: number; reason: string },
    @CurrentUser() actor: any,
  ) {
    return this.securityService.suspendAccount(userId, dto, actor);
  }

  @Post('accounts/:userId/reactivate')
  @RequirePermissions('security.manage_suspensions')
  async reactivateAccount(
    @Param('userId') userId: string,
    @CurrentUser() actor: any,
  ) {
    return this.securityService.reactivateAccount(userId, actor);
  }

  @Post('2fa/generate')
  async generate2FA(@CurrentUser('id') userId: string) {
    return this.securityService.generate2FASecret(userId);
  }

  @Post('2fa/enable')
  async enable2FA(
    @CurrentUser('id') userId: string,
    @Body('token') token: string,
  ) {
    return this.securityService.enable2FA(userId, token);
  }

  @Post('2fa/disable')
  async disable2FA(@CurrentUser('id') userId: string) {
    return this.securityService.disable2FA(userId);
  }
}
