import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import {
  MedicineSearchProvider,
} from './search-provider.interface';
import {
  MedicineSearchParams,
  MedicineProductSummary,
  GenericAlternativeResult,
  GenericInfo,
} from '@siam-aqua/shared-types';

@Injectable()
export class DatabaseSearchProvider implements MedicineSearchProvider {
  constructor(private readonly prisma: PrismaService) {}

  async search(params: MedicineSearchParams): Promise<{
    products: MedicineProductSummary[];
    total: number;
    matchedGenerics: { name: string; count: number }[];
    matchedCompanies: { name: string; count: number }[];
  }> {
    const {
      query,
      generic,
      company,
      dosageForm,
      category,
      minPrice,
      maxPrice,
      limit = 40,
      offset = 0,
    } = params;

    const where: any = {};

    if (generic) {
      where.genericName = { contains: generic };
    }

    if (dosageForm) {
      where.dosageForm = { equals: dosageForm };
    }

    if (category) {
      where.category = { equals: category };
    }

    if (company) {
      where.company = { name: { contains: company } };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.mrp = {};
      if (minPrice !== undefined) where.mrp.gte = minPrice;
      if (maxPrice !== undefined) where.mrp.lte = maxPrice;
    }

    // Fuzzy Multi-Field Search (Brand Name, Generic Name, Company Name)
    if (query && query.trim().length > 0) {
      const cleanQ = query.trim();
      where.OR = [
        { name: { contains: cleanQ } },
        { genericName: { contains: cleanQ } },
        { company: { name: { contains: cleanQ } } },
        { generic: { therapeuticClass: { contains: cleanQ } } },
      ];
    }

    const [rawProducts, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          company: true,
          generic: true,
        },
        orderBy: [{ isOfferParaLiveStock: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.product.count({ where }),
    ]);

    const products: MedicineProductSummary[] = rawProducts.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      genericId: p.genericId || undefined,
      genericName: p.genericName,
      companyId: p.companyId,
      companyName: p.company.name,
      companyCode: p.company.code,
      dosageForm: p.dosageForm,
      strength: p.strength,
      mrp: p.mrp,
      unit: p.unit,
      packSize: p.packSize || undefined,
      category: p.category,
      description: p.description || undefined,
      isPrescriptionRequired: p.isPrescriptionRequired,
      isOfferParaLiveStock: p.isOfferParaLiveStock,
      offerParaStockQty: p.offerParaStockQty,
      isPharmaTrackOpaque: p.isPharmaTrackOpaque,
      wholesaleMoq: p.wholesaleMoq,
    }));

    // Aggregate unique matched generics & companies for faceted filters
    const genericCounts = new Map<string, number>();
    const companyCounts = new Map<string, number>();

    for (const p of rawProducts) {
      genericCounts.set(p.genericName, (genericCounts.get(p.genericName) || 0) + 1);
      companyCounts.set(p.company.name, (companyCounts.get(p.company.name) || 0) + 1);
    }

    return {
      products,
      total,
      matchedGenerics: Array.from(genericCounts.entries()).map(([name, count]) => ({
        name,
        count,
      })),
      matchedCompanies: Array.from(companyCounts.entries()).map(([name, count]) => ({
        name,
        count,
      })),
    };
  }

  async findGenericAlternatives(
    productId: string,
    options?: { limit?: number },
  ): Promise<GenericAlternativeResult> {
    const limit = options?.limit || 20;

    const currentProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { company: true, generic: true },
    });

    if (!currentProduct) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Find all OTHER brands with the same genericName and dosageForm
    const rawAlternatives = await this.prisma.product.findMany({
      where: {
        genericName: currentProduct.genericName,
        dosageForm: currentProduct.dosageForm,
        id: { not: currentProduct.id },
      },
      include: { company: true },
      take: limit,
      orderBy: [{ isOfferParaLiveStock: 'desc' }, { mrp: 'asc' }],
    });

    const alternatives = rawAlternatives.map((alt) => {
      const priceDifference = Math.round((currentProduct.mrp - alt.mrp + Number.EPSILON) * 100) / 100;
      const priceDifferencePercent =
        currentProduct.mrp > 0
          ? Math.round(((priceDifference / currentProduct.mrp) * 100 + Number.EPSILON) * 100) / 100
          : 0;

      return {
        productId: alt.id,
        brandName: alt.name,
        companyName: alt.company.name,
        dosageForm: alt.dosageForm,
        strength: alt.strength,
        mrp: alt.mrp,
        priceDifference,
        priceDifferencePercent,
        isLowerPriced: priceDifference > 0,
        isOfferParaLiveDeal: alt.isOfferParaLiveStock,
        offerParaStockQty: alt.isOfferParaLiveStock ? alt.offerParaStockQty : undefined,
      };
    });

    const genericInfo: GenericInfo | undefined = currentProduct.generic
      ? {
          id: currentProduct.generic.id,
          name: currentProduct.generic.name,
          slug: currentProduct.generic.slug,
          therapeuticClass: currentProduct.generic.therapeuticClass || undefined,
          description: currentProduct.generic.description || undefined,
          indications: currentProduct.generic.indications || undefined,
          dosageGuidelines: currentProduct.generic.dosageGuidelines || undefined,
          sideEffects: currentProduct.generic.sideEffects || undefined,
          precautions: currentProduct.generic.precautions || undefined,
          pregnancyCategory: currentProduct.generic.pregnancyCategory || undefined,
        }
      : undefined;

    return {
      currentProduct: {
        id: currentProduct.id,
        name: currentProduct.name,
        genericName: currentProduct.genericName,
        dosageForm: currentProduct.dosageForm,
        strength: currentProduct.strength,
        mrp: currentProduct.mrp,
        companyName: currentProduct.company.name,
      },
      genericInfo,
      alternatives,
    };
  }

  async getGenericDetails(
    slugOrId: string,
  ): Promise<{ generic: GenericInfo; products: MedicineProductSummary[] } | null> {
    const generic = await this.prisma.generic.findFirst({
      where: {
        OR: [{ id: slugOrId }, { slug: slugOrId }, { name: slugOrId }],
      },
      include: {
        products: {
          include: { company: true },
          orderBy: [{ dosageForm: 'asc' }, { mrp: 'asc' }],
        },
      },
    });

    if (!generic) return null;

    return {
      generic: {
        id: generic.id,
        name: generic.name,
        slug: generic.slug,
        therapeuticClass: generic.therapeuticClass || undefined,
        description: generic.description || undefined,
        indications: generic.indications || undefined,
        dosageGuidelines: generic.dosageGuidelines || undefined,
        sideEffects: generic.sideEffects || undefined,
        precautions: generic.precautions || undefined,
        pregnancyCategory: generic.pregnancyCategory || undefined,
      },
      products: generic.products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        genericId: generic.id,
        genericName: p.genericName,
        companyId: p.companyId,
        companyName: p.company.name,
        companyCode: p.company.code,
        dosageForm: p.dosageForm,
        strength: p.strength,
        mrp: p.mrp,
        unit: p.unit,
        packSize: p.packSize || undefined,
        category: p.category,
        description: p.description || undefined,
        isPrescriptionRequired: p.isPrescriptionRequired,
        isOfferParaLiveStock: p.isOfferParaLiveStock,
        offerParaStockQty: p.offerParaStockQty,
        isPharmaTrackOpaque: p.isPharmaTrackOpaque,
      })),
    };
  }
}
