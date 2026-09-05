import { Module } from '@nestjs/common';
import { MpoService } from './mpo.service';
import { MpoController } from './mpo.controller';
import { PrismaService } from '../../common/services/prisma.service';

@Module({
  controllers: [MpoController],
  providers: [MpoService, PrismaService],
  exports: [MpoService],
})
export class MpoModule {}
