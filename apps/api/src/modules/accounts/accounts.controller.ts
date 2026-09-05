import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccountType, ApplicationStatus } from '@siam-aqua/shared-types';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  // Path B: Public application (no auth required)
  @Post('apply')
  async submitApplication(@Body() dto: any) {
    return this.accountsService.submitPublicApplication(dto);
  }

  // Admin Review Queue
  @Get('applications')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('accounts.review_applications')
  async getApplications(@Query('status') status?: ApplicationStatus) {
    return this.accountsService.getApplications(status);
  }

  @Post('applications/:id/review')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('accounts.review_applications')
  async reviewApplication(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() actor: any,
  ) {
    return this.accountsService.reviewApplication(id, dto, actor);
  }

  // Path A: Direct Admin Creation
  @Post('create-direct')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('accounts.create_accounts')
  async createDirectly(@Body() dto: any, @CurrentUser() actor: any) {
    return this.accountsService.createAccountDirectly(dto, actor);
  }

  // List users for admin panel
  @Get('users')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('accounts.view_users')
  async getAllUsers(
    @Query('accountType') accountType?: AccountType,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.accountsService.getAllUsers({
      accountType,
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }
}
