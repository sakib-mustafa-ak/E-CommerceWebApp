import { Module } from '@nestjs/common';
import { BulkOrderService } from './bulk-order.service';
import { BulkOrderController } from './bulk-order.controller';
import { PrismaModule } from '../../common/modules/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BulkOrderController],
  providers: [BulkOrderService],
  exports: [BulkOrderService],
})
export class BulkOrderModule {}
