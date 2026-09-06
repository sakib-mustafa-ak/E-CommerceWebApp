import { Module } from '@nestjs/common';
import { BulkOrderService } from './bulk-order.service';
import { BulkOrderController } from './bulk-order.controller';
import { PrismaService } from '../../common/services/prisma.service';

@Module({
  controllers: [BulkOrderController],
  providers: [BulkOrderService, PrismaService],
  exports: [BulkOrderService],
})
export class BulkOrderModule {}
