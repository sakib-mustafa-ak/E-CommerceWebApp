import { Module } from '@nestjs/common';
import { ResellerService } from './reseller.service';
import { ResellerController } from './reseller.controller';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ResellerController],
  providers: [ResellerService, PrismaService],
  exports: [ResellerService],
})
export class ResellerModule {}

