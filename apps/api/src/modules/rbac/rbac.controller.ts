import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RbacService } from './rbac.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('rbac')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('permissions')
  @RequirePermissions('system.manage_roles')
  async getAllPermissions() {
    return this.rbacService.getAllPermissions();
  }

  @Get('roles')
  @RequirePermissions('system.manage_roles')
  async getAllRoles() {
    return this.rbacService.getAllRoles();
  }

  @Get('roles/:id')
  @RequirePermissions('system.manage_roles')
  async getRoleById(@Param('id') id: string) {
    return this.rbacService.getRoleById(id);
  }

  @Post('roles')
  @RequirePermissions('system.manage_roles')
  async createRole(
    @Body() dto: { name: string; slug: string; description?: string; permissionIds: string[] },
    @CurrentUser() actor: any,
  ) {
    return this.rbacService.createRole(dto, actor);
  }

  @Put('roles/:id')
  @RequirePermissions('system.manage_roles')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; permissionIds?: string[] },
    @CurrentUser() actor: any,
  ) {
    return this.rbacService.updateRole(id, dto, actor);
  }

  @Post('users/:userId/roles')
  @RequirePermissions('system.manage_roles')
  async assignRolesToUser(
    @Param('userId') userId: string,
    @Body('roleIds') roleIds: string[],
    @CurrentUser() actor: any,
  ) {
    return this.rbacService.assignRolesToUser(userId, roleIds, actor);
  }
}
