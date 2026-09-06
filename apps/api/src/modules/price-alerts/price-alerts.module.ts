import { Module } from '@nestjs/common';
import { PriceAlertsService } from './price-alerts.service';
import { PriceAlertsController } from './price-alerts.controller';
import { PrismaService } from '../../common/services/prisma.service';

@Module({
  controllers: [PriceAlertsController],
  providers: [PriceAlertsService, PrismaService],
  exports: [PriceAlertsService],
})
export class PriceAlertsModule {}
