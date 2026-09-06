import { Module } from '@nestjs/common';
import { AbandonedCartsService } from './abandoned-carts.service';
import { AbandonedCartsController } from './abandoned-carts.controller';
import { PrismaModule } from '../../common/modules/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AbandonedCartsController],
  providers: [AbandonedCartsService],
  exports: [AbandonedCartsService],
})
export class AbandonedCartsModule {}
