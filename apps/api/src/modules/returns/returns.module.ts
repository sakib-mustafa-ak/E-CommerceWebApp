import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { PrismaClient } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [ReturnsController],
  providers: [ReturnsService, PrismaClient, EventsGateway, AuditService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
