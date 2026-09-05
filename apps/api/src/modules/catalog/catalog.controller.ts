import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('search')
  async searchMedicines(
    @Query('q') query?: string,
    @Query('generic') generic?: string,
    @Query('company') company?: string,
    @Query('form') dosageForm?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.catalogService.search({
      query,
      generic,
      company,
      dosageForm,
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      limit: limit ? parseInt(limit, 10) : 40,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('products/:id/alternatives')
  async getGenericAlternatives(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogService.getGenericAlternatives(
      id,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('generics/:slug')
  async getGenericDetails(@Param('slug') slug: string) {
    return this.catalogService.getGenericBySlug(slug);
  }

  @Get('products/:id')
  async getProductDetails(@Param('id') id: string) {
    return this.catalogService.getProductById(id);
  }

  @Get('forms')
  async getAllDosageForms() {
    return this.catalogService.getAllDosageForms();
  }

  @Get('companies')
  async getAllCompanies() {
    return this.catalogService.getAllCompanies();
  }
}
