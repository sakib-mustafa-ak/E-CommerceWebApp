import { Module } from '@nestjs/common';
import { PreOrdersController } from './pre-orders.controller';
import { PreOrdersService } from './pre-orders.service';
import { PrismaService } from '../../common/services/prisma.service';

@Module({
  controllers: [PreOrdersController],
  providers: [PreOrdersService, PrismaService],
  exports: [PreOrdersService],
})
export class PreOrdersModule {}
