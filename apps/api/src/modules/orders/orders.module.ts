import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaClient } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, PrismaClient, EventsGateway, AuditService],
  exports: [OrdersService],
})
export class OrdersModule {}
