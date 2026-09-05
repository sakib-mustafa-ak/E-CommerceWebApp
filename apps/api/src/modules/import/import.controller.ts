import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('import')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  // 1. Paikari Customer CSV Import
  @Post('customers/csv')
  @RequirePermissions('accounts.bulk_import')
  async importCustomersCsv(
    @Body('csvContent') csvContent: string,
    @CurrentUser() actor: any,
  ) {
    return this.importService.importPaikariCustomersFromCsv(csvContent, actor);
  }

  // 2. MedEx Medicine Staging Pipeline
  @Post('medicines/stage-csv')
  @RequirePermissions('catalog.manage_products')
  async stageMedicinesCsv(
    @Body('csvContent') csvContent: string,
    @Body('fileName') fileName: string,
    @CurrentUser() actor: any,
  ) {
    return this.importService.stageMedicineCsv(csvContent, fileName, actor);
  }

  @Post('medicines/stage-json')
  @RequirePermissions('catalog.manage_products')
  async stageMedicinesJson(
    @Body('items') items: any[],
    @Body('fileName') fileName: string,
    @CurrentUser() actor: any,
  ) {
    return this.importService.stageMedicineJson(items, fileName, actor);
  }

  @Get('medicines/batches')
  @RequirePermissions('catalog.manage_products')
  async getStagingBatches() {
    return this.importService.getStagingBatches();
  }

  @Get('medicines/batches/:batchId')
  @RequirePermissions('catalog.manage_products')
  async getStagingBatchDetails(@Param('batchId') batchId: string) {
    return this.importService.getStagingBatchDetails(batchId);
  }

  @Put('medicines/items/:itemId')
  @RequirePermissions('catalog.manage_products')
  async updateStagingItem(
    @Param('itemId') itemId: string,
    @Body() dto: any,
  ) {
    return this.importService.updateStagingItem(itemId, dto);
  }

  @Post('medicines/batches/:batchId/publish')
  @RequirePermissions('catalog.manage_products')
  async publishStagingBatch(
    @Param('batchId') batchId: string,
    @CurrentUser() actor: any,
  ) {
    return this.importService.publishBatch(batchId, actor);
  }
}
