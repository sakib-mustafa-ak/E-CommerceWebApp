import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/modules/prisma.module';
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
import { ResellerModule } from './modules/reseller/reseller.module';
import { GamingModule } from './modules/gaming/gaming.module';
import { FoodModule } from './modules/food/food.module';
import { CommunityModule } from './modules/community/community.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { DealsModule } from './modules/deals/deals.module';
import { AbandonedCartsModule } from './modules/abandoned-carts/abandoned-carts.module';
import { PriceAlertsModule } from './modules/price-alerts/price-alerts.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { BulkOrderModule } from './modules/bulk-order/bulk-order.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
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
    ResellerModule,
    GamingModule,
    FoodModule,
    CommunityModule,
    RecommendationsModule,
    RewardsModule,
    DealsModule,
    AbandonedCartsModule,
    PriceAlertsModule,
    TicketsModule,
    BulkOrderModule,
  ],
})
export class AppModule {}
