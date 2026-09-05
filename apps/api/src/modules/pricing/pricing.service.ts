import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  RateType,
  AuditAction,
  AccountType,
} from '@siam-aqua/shared-types';
import {
  PricingEngine,
  PricingCatalogState,
  RateRule,
  ProductPricingContext,
  CustomerPricingContext,
} from '@siam-aqua/pricing';

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // --- TIERS ---
  async getTiers() {
    return this.prisma.pricingTier.findMany({
      include: {
        _count: { select: { customerProfiles: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createTier(
    dto: {
      code: string;
      name: string;
      description?: string;
      defaultRateType: RateType;
      defaultValue: number;
    },
    actor: { id: string; email: string },
  ) {
    const existing = await this.prisma.pricingTier.findUnique({
      where: { code: dto.code },
    });
    if (existing) throw new BadRequestException(`Tier ${dto.code} already exists`);

    const tier = await this.prisma.pricingTier.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        defaultRateType: dto.defaultRateType,
        defaultValue: dto.defaultValue,
      },
    });

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'TIER_CREATED',
      entityType: 'PricingTier',
      entityId: tier.id,
      afterData: tier,
    });

    return tier;
  }

  // --- FULL CATALOG BUILDER FOR PRICING ENGINE ---
  async buildCatalogState(): Promise<PricingCatalogState> {
    const [tiers, companyRates, productOverrides] = await Promise.all([
      this.prisma.pricingTier.findMany(),
      this.prisma.companyRate.findMany(),
      this.prisma.productOverrideRate.findMany(),
    ]);

    const tierDefaults: Record<string, RateRule> = {};
    for (const t of tiers) {
      tierDefaults[t.id] = {
        rateType: t.defaultRateType as RateType,
        value: t.defaultValue,
      };
    }

    const companyRatesMap: Record<string, Record<string, RateRule>> = {};
    for (const cr of companyRates) {
      if (!companyRatesMap[cr.companyId]) companyRatesMap[cr.companyId] = {};
      companyRatesMap[cr.companyId][cr.tierId] = {
        rateType: cr.rateType as RateType,
        value: cr.value,
      };
    }

    const productOverridesMap: Record<string, Record<string, RateRule>> = {};
    for (const po of productOverrides) {
      if (!productOverridesMap[po.productId]) productOverridesMap[po.productId] = {};
      productOverridesMap[po.productId][po.tierId] = {
        rateType: po.rateType as RateType,
        value: po.value,
      };
    }

    return {
      tierDefaults,
      companyRates: companyRatesMap,
      productOverrides: productOverridesMap,
    };
  }

  // --- CUSTOMER TIER CHANGE WITH RECALCULATION & OVERRIDE PERSISTENCE ---
  async updateCustomerTier(
    customerId: string,
    newTierId: string,
    actor: { id: string; email: string },
  ) {
    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      include: {
        customerProfile: { include: { tier: true } },
        manualOverrides: true,
      },
    });

    if (!customer || !customer.customerProfile) {
      throw new NotFoundException('Customer profile not found');
    }

    const oldTier = customer.customerProfile.tier;
    const newTier = await this.prisma.pricingTier.findUnique({
      where: { id: newTierId },
    });
    if (!newTier) throw new NotFoundException('Target tier not found');

    // Update customer tier in DB
    const updatedProfile = await this.prisma.customerProfile.update({
      where: { userId: customerId },
      data: { tierId: newTierId },
      include: { tier: true },
    });

    // Audit log tier change
    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.TIER_CHANGED,
      entityType: 'CustomerProfile',
      entityId: customer.customerProfile.id,
      beforeData: { tierId: oldTier.id, tierCode: oldTier.code, tierName: oldTier.name },
      afterData: { tierId: newTier.id, tierCode: newTier.code, tierName: newTier.name },
    });

    // Recompute sample catalog prices to demonstrate instant recalculation while preserving overrides
    const products = await this.prisma.product.findMany({ take: 20 });
    const catalog = await this.buildCatalogState();

    const manualOverridesMap: Record<string, RateRule> = {};
    for (const mo of customer.manualOverrides) {
      manualOverridesMap[mo.productId] = {
        rateType: mo.rateType as RateType,
        value: mo.value,
      };
    }

    const customerPricingContext: CustomerPricingContext = {
      customerId: customer.id,
      tierId: newTierId,
      manualOverrides: manualOverridesMap,
    };

    const productContexts: ProductPricingContext[] = products.map((p) => ({
      productId: p.id,
      mrp: p.mrp,
      companyId: p.companyId,
    }));

    const recalculatedPrices = PricingEngine.recalculateForNewTier(
      productContexts,
      customerPricingContext,
      newTierId,
      catalog,
    );

    return {
      message: `Customer tier updated to ${newTier.name}. All prices recalculated with manual overrides preserved.`,
      updatedProfile,
      recalculatedSample: recalculatedPrices,
    };
  }

  // --- MANUAL OVERRIDES (LAYER 1) ---
  async setCustomerManualOverride(
    customerId: string,
    productId: string,
    dto: { rateType: RateType; value: number },
    actor: { id: string; email: string },
  ) {
    const [user, product] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: customerId } }),
      this.prisma.product.findUnique({ where: { id: productId } }),
    ]);

    if (!user) throw new NotFoundException('Customer not found');
    if (!product) throw new NotFoundException('Product not found');

    const existingOverride = await this.prisma.customerManualOverrideRate.findUnique({
      where: { userId_productId: { userId: customerId, productId } },
    });

    let overrideRecord;
    if (existingOverride) {
      overrideRecord = await this.prisma.customerManualOverrideRate.update({
        where: { userId_productId: { userId: customerId, productId } },
        data: { rateType: dto.rateType, value: dto.value },
      });
    } else {
      overrideRecord = await this.prisma.customerManualOverrideRate.create({
        data: {
          userId: customerId,
          productId,
          rateType: dto.rateType,
          value: dto.value,
        },
      });
    }

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.MANUAL_RATE_CHANGED,
      entityType: 'CustomerManualOverrideRate',
      entityId: overrideRecord.id,
      beforeData: existingOverride
        ? { rateType: existingOverride.rateType, value: existingOverride.value }
        : null,
      afterData: {
        customerId,
        productId,
        productName: product.name,
        rateType: dto.rateType,
        value: dto.value,
      },
    });

    return overrideRecord;
  }

  async getCustomerOverrides(customerId: string) {
    return this.prisma.customerManualOverrideRate.findMany({
      where: { userId: customerId },
      include: {
        product: { include: { company: true } },
      },
    });
  }

  // --- CALCULATE PRICES FOR CUSTOMER VIEW ---
  async getProductsForCustomer(customerId: string) {
    const [customer, products, catalog] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: customerId },
        include: {
          customerProfile: true,
          manualOverrides: true,
        },
      }),
      this.prisma.product.findMany({
        include: { company: true },
        orderBy: { name: 'asc' },
      }),
      this.buildCatalogState(),
    ]);

    const tierId = customer?.customerProfile?.tierId || Object.keys(catalog.tierDefaults)[0];
    const manualOverridesMap: Record<string, RateRule> = {};
    if (customer?.manualOverrides) {
      for (const mo of customer.manualOverrides) {
        manualOverridesMap[mo.productId] = {
          rateType: mo.rateType as RateType,
          value: mo.value,
        };
      }
    }

    const customerContext: CustomerPricingContext = {
      customerId,
      tierId,
      manualOverrides: manualOverridesMap,
    };

    return products.map((product) => {
      const priceResult = PricingEngine.calculatePrice(
        { productId: product.id, mrp: product.mrp, companyId: product.companyId },
        customerContext,
        catalog,
      );

      return {
        ...product,
        pricing: priceResult,
      };
    });
  }
}
