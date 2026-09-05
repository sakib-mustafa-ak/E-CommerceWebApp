import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Response } from 'express';

@Controller('backups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  @RequirePermissions('system.manage_backups')
  async getBackups() {
    return this.backupService.getBackups();
  }

  @Post('trigger')
  @RequirePermissions('system.manage_backups')
  async triggerBackup(@Body('notes') notes?: string) {
    return this.backupService.triggerBackup(notes);
  }

  @Post(':id/drill')
  @RequirePermissions('system.manage_backups')
  async performDrill(
    @Param('id') id: string,
    @Body('notes') notes: string,
  ) {
    return this.backupService.performRestoreDrill(id, notes);
  }

  @Get('export/orders.csv')
  @RequirePermissions('orders.export')
  async exportOrders(@Res() res: Response) {
    const csv = await this.backupService.exportOrdersCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders_export.csv"');
    return res.send(csv);
  }

  @Get('export/stock.csv')
  @RequirePermissions('catalog.export')
  async exportStock(@Res() res: Response) {
    const csv = await this.backupService.exportStockCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="stock_export.csv"');
    return res.send(csv);
  }
}
