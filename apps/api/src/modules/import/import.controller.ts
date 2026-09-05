import {
  Controller,
  Post,
  Body,
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

  @Post('customers/csv')
  @RequirePermissions('accounts.bulk_import')
  async importCustomersCsv(
    @Body('csvContent') csvContent: string,
    @CurrentUser() actor: any,
  ) {
    return this.importService.importPaikariCustomersFromCsv(csvContent, actor);
  }
}
