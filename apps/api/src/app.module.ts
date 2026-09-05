import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './common/services/prisma.service';
import { AuditModule } from './modules/audit/audit.module';
import { SecurityModule } from './modules/security/security.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { BackupModule } from './modules/backup/backup.module';
import { ImportModule } from './modules/import/import.module';
import { AdminModule } from './modules/admin/admin.module';
import { EventsModule } from './modules/events/events.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { PreOrdersModule } from './modules/pre-orders/pre-orders.module';
import { StockModule } from './modules/stock/stock.module';
import { MpoModule } from './modules/mpo/mpo.module';
import { PublicModule } from './modules/public/public.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuditModule,
    SecurityModule,
    RbacModule,
    AuthModule,
    AccountsModule,
    PricingModule,
    BackupModule,
    ImportModule,
    AdminModule,
    EventsModule,
    CatalogModule,
    OrdersModule,
    ReturnsModule,
    PreOrdersModule,
    StockModule,
    MpoModule,
    PublicModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
