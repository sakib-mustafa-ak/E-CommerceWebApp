import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import {
  MEDICINE_SEARCH_PROVIDER,
  MedicineSearchProvider,
} from './search/search-provider.interface';
import {
  MedicineSearchParams,
  MedicineProductSummary,
  GenericAlternativeResult,
  GenericInfo,
} from '@siam-aqua/shared-types';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDICINE_SEARCH_PROVIDER)
    private readonly searchProvider: MedicineSearchProvider,
  ) {}

  async search(params: MedicineSearchParams) {
    return this.searchProvider.search(params);
  }

  async getGenericAlternatives(productId: string, limit?: number): Promise<GenericAlternativeResult> {
    return this.searchProvider.findGenericAlternatives(productId, { limit });
  }

  async getGenericBySlug(slug: string) {
    const result = await this.searchProvider.getGenericDetails(slug);
    if (!result) {
      throw new NotFoundException(`Generic with slug/name '${slug}' not found`);
    }
    return result;
  }

  async getProductById(id: string): Promise<MedicineProductSummary> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { company: true, generic: true },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      genericId: product.genericId || undefined,
      genericName: product.genericName,
      companyId: product.companyId,
      companyName: product.company.name,
      companyCode: product.company.code,
      dosageForm: product.dosageForm,
      strength: product.strength,
      mrp: product.mrp,
      unit: product.unit,
      packSize: product.packSize || undefined,
      category: product.category,
      description: product.description || undefined,
      isPrescriptionRequired: product.isPrescriptionRequired,
      isOfferParaLiveStock: product.isOfferParaLiveStock,
      offerParaStockQty: product.offerParaStockQty,
      isPharmaTrackOpaque: product.isPharmaTrackOpaque,
    };
  }

  async getAllDosageForms(): Promise<string[]> {
    const forms = await this.prisma.product.findMany({
      select: { dosageForm: true },
      distinct: ['dosageForm'],
    });
    return forms.map((f) => f.dosageForm).sort();
  }

  async getAllCompanies() {
    const companies = await this.prisma.company.findMany({
      include: {
        _count: { select: { products: true } },
        products: {
          select: {
            isOfferParaLiveStock: true,
            offerParaStockQty: true,
            mpoListings: {
              where: { status: 'APPROVED' },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return companies
      .map((c) => {
        const activeOfferParaProducts = c.products.filter(
          (p) => p.isOfferParaLiveStock && p.offerParaStockQty > 0,
        );
        const activeMpoListingsCount = c.products.reduce(
          (sum, p) => sum + p.mpoListings.length,
          0,
        );
        const hasActiveOffers =
          activeOfferParaProducts.length > 0 || activeMpoListingsCount > 0;

        return {
          id: c.id,
          name: c.name,
          code: c.code,
          productCount: c._count.products,
          hasActiveOffers,
          offerParaProductCount: activeOfferParaProducts.length,
          mpoListingsCount: activeMpoListingsCount,
        };
      })
      .sort((a, b) => {
        if (a.hasActiveOffers && !b.hasActiveOffers) return -1;
        if (!a.hasActiveOffers && b.hasActiveOffers) return 1;
        return a.name.localeCompare(b.name);
      });
  }
}
