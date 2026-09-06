import { Module } from '@nestjs/common';
import { AbandonedCartsService } from './abandoned-carts.service';
import { AbandonedCartsController } from './abandoned-carts.controller';
import { PrismaService } from '../../common/services/prisma.service';

@Module({
  controllers: [AbandonedCartsController],
  providers: [AbandonedCartsService, PrismaService],
  exports: [AbandonedCartsService],
})
export class AbandonedCartsModule {}
