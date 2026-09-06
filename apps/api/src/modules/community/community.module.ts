import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [CommunityController],
  providers: [CommunityService, PrismaService, AuditService],
  exports: [CommunityService],
})
export class CommunityModule {}
