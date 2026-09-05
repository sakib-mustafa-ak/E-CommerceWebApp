import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { PrismaService } from '../../common/services/prisma.service';
import { MEDICINE_SEARCH_PROVIDER } from './search/search-provider.interface';
import { DatabaseSearchProvider } from './search/database-search.provider';

@Module({
  controllers: [CatalogController],
  providers: [
    CatalogService,
    PrismaService,
    {
      provide: MEDICINE_SEARCH_PROVIDER,
      useClass: DatabaseSearchProvider,
    },
  ],
  exports: [CatalogService, MEDICINE_SEARCH_PROVIDER],
})
export class CatalogModule {}
