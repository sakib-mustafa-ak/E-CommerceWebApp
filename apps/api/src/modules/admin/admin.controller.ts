import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('products')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('catalog.view_products')
  async getProducts(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getProductsList({ category, search });
  }

  @Get('orders')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('orders.view_orders')
  async getOrders(
    @Query('sector') sector?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getOrdersList({ sectorType: sector, status });
  }
}
