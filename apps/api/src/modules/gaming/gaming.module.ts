import { Module } from '@nestjs/common';
import { GamingService } from './gaming.service';
import { GamingController } from './gaming.controller';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [GamingController],
  providers: [GamingService, PrismaService],
  exports: [GamingService],
})
export class GamingModule {}
