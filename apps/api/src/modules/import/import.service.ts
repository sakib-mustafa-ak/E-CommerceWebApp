import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AccountType,
  AuditAction,
  RateType,
  BulkImportResult,
} from '@siam-aqua/shared-types';
import * as bcrypt from 'bcryptjs';
import { parse } from 'csv-parse/sync';

export interface RawStagingMedicineInput {
  brandName: string;
  genericName: string;
  companyName: string;
  dosageForm: string;
  strength: string;
  mrp: number;
  unit?: string;
  packSize?: string;
  category?: string;
  indications?: string;
  therapeuticClass?: string;
}

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ===========================================================================
  // 1. PAIKARI CUSTOMER BULK IMPORT (Phase 0)
  // ===========================================================================
  async importPaikariCustomersFromCsv(
    csvContent: string,
    actor: { id: string; email: string },
  ): Promise<BulkImportResult> {
    if (!csvContent || csvContent.trim().length === 0) {
      throw new BadRequestException('CSV content is empty');
    }

    let records: any[];
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err: any) {
      throw new BadRequestException(`Malformed CSV format: ${err.message}`);
    }

    const tiers = await this.prisma.pricingTier.findMany();
    const tierMapByCode = new Map(tiers.map((t) => [t.code.toUpperCase(), t]));
    const defaultTier = tiers.find((t) => t.code === 'TIER_A') || tiers[0];

    const result: BulkImportResult = {
      totalRows: records.length,
      importedCount: 0,
      failedCount: 0,
      errors: [],
      importedCustomerIds: [],
    };

    const defaultPasswordHash = await bcrypt.hash('Paikari@2026', 10);

    for (let index = 0; index < records.length; index++) {
      const rowNum = index + 1;
      const row = records[index];

      try {
        const shopName = row.shopName || row.shop_name || row.ShopName;
        const ownerName = row.ownerName || row.owner_name || row.OwnerName || shopName;
        const phone = row.phone || row.Phone || row.mobile || row.Mobile;
        const email =
          row.email ||
          row.Email ||
          `shop_${phone ? phone.replace(/[^0-9]/g, '') : Date.now()}@siamaqua.internal`;
        const address = row.address || row.Address || 'Dhaka, Bangladesh';
        const tradeLicenseNo = row.tradeLicenseNo || row.trade_license || null;
        const drugLicenseNo = row.drugLicenseNo || row.drug_license || null;
        const tierCode = (row.tierCode || row.tier || 'TIER_A').toUpperCase();
        const creditLimit = parseFloat(row.creditLimit || row.credit_limit || '0') || 0;
        const codLimit = parseFloat(row.codLimit || row.cod_limit || '50000') || 50000;
        const deliveryFeeThreshold =
          parseFloat(row.deliveryFeeThreshold || row.delivery_threshold || '1000') || 1000;
        const manualRatesJson = row.manualRatesJson || row.manual_rates || null;

        if (!shopName || !phone) {
          result.failedCount++;
          result.errors.push({
            row: rowNum,
            reason: 'Missing required field: shopName or phone is missing',
            data: row,
          });
          continue;
        }

        const targetTier = tierMapByCode.get(tierCode) || defaultTier;
        if (!targetTier) {
          result.failedCount++;
          result.errors.push({
            row: rowNum,
            reason: `Invalid tier code '${tierCode}' and no default tier exists`,
            data: row,
          });
          continue;
        }

        // Upsert User
        let user = await this.prisma.user.findFirst({
          where: { OR: [{ email }, { phone }] },
        });

        if (!user) {
          user = await this.prisma.user.create({
            data: {
              name: ownerName,
              email,
              phone,
              passwordHash: defaultPasswordHash,
              accountType: AccountType.PAIKARI_SELLER,
              customerProfile: {
                create: {
                  shopName,
                  ownerName,
                  address,
                  tradeLicenseNo,
                  drugLicenseNo,
                  tierId: targetTier.id,
                  creditLimit,
                  codLimit,
                  deliveryFeeThreshold,
                },
              },
            },
          });
        } else {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { name: ownerName, accountType: AccountType.PAIKARI_SELLER },
          });

          await this.prisma.customerProfile.upsert({
            where: { userId: user.id },
            update: {
              shopName,
              ownerName,
              address,
              tradeLicenseNo,
              drugLicenseNo,
              tierId: targetTier.id,
              creditLimit,
              codLimit,
              deliveryFeeThreshold,
            },
            create: {
              userId: user.id,
              shopName,
              ownerName,
              address,
              tradeLicenseNo,
              drugLicenseNo,
              tierId: targetTier.id,
              creditLimit,
              codLimit,
              deliveryFeeThreshold,
            },
          });
        }

        // Handle manual override rates if provided in CSV
        if (manualRatesJson) {
          try {
            const parsedOverrides = JSON.parse(manualRatesJson);
            if (Array.isArray(parsedOverrides)) {
              for (const ov of parsedOverrides) {
                if (ov.productId && ov.value !== undefined) {
                  await this.prisma.customerManualOverrideRate.upsert({
                    where: { userId_productId: { userId: user.id, productId: ov.productId } },
                    update: {
                      rateType: ov.rateType || RateType.PERCENTAGE,
                      value: parseFloat(ov.value),
                    },
                    create: {
                      userId: user.id,
                      productId: ov.productId,
                      rateType: ov.rateType || RateType.PERCENTAGE,
                      value: parseFloat(ov.value),
                    },
                  });
                }
              }
            }
          } catch {
            // ignore malformed JSON override string for individual row
          }
        }

        result.importedCount++;
        result.importedCustomerIds.push(user.id);
      } catch (rowErr: any) {
        result.failedCount++;
        result.errors.push({
          row: rowNum,
          reason: rowErr.message,
          data: row,
        });
      }
    }

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.BULK_CUSTOMER_IMPORTED,
      entityType: 'CustomerProfile',
      entityId: `batch_${Date.now()}`,
      afterData: {
        totalRows: result.totalRows,
        importedCount: result.importedCount,
        failedCount: result.failedCount,
      },
    });

    return result;
  }

  // ===========================================================================
  // 2. MEDICINE STAGING IMPORT PIPELINE (Phase 0-A)
  // ===========================================================================
  async stageMedicineCsv(
    csvContent: string,
    fileName: string,
    actor: { id: string; email: string },
  ) {
    if (!csvContent || csvContent.trim().length === 0) {
      throw new BadRequestException('CSV content is empty');
    }

    let records: any[];
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err: any) {
      throw new BadRequestException(`Malformed CSV format: ${err.message}`);
    }

    const items: RawStagingMedicineInput[] = records.map((r) => ({
      brandName: r.brandName || r.brand_name || r.name || r.Name,
      genericName: r.genericName || r.generic_name || r.generic || r.Generic,
      companyName: r.companyName || r.company_name || r.company || r.Manufacturer,
      dosageForm: r.dosageForm || r.dosage_form || r.form || 'Tablet',
      strength: r.strength || r.Strength || '500mg',
      mrp: parseFloat(r.mrp || r.price || r.Price || '0') || 0,
      unit: r.unit || 'Strip (10 tabs)',
      packSize: r.packSize || r.pack_size || null,
      category: r.category || 'Allopathic',
      indications: r.indications || r.uses || null,
      therapeuticClass: r.therapeuticClass || r.therapeutic_class || null,
    }));

    return this.processStagingBatch(items, fileName || 'medicines_import.csv', actor);
  }

  async stageMedicineJson(
    items: RawStagingMedicineInput[],
    fileName: string,
    actor: { id: string; email: string },
  ) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Input array must contain at least one medicine item');
    }
    return this.processStagingBatch(items, fileName || 'medicines_batch.json', actor);
  }

  private async processStagingBatch(
    items: RawStagingMedicineInput[],
    fileName: string,
    actor: { id: string; email: string },
  ) {
    const batchNumber = `MBATCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 1. Fetch existing products and companies for fast de-duplication
    const [existingProducts, existingCompanies] = await Promise.all([
      this.prisma.product.findMany({
        include: { company: true },
      }),
      this.prisma.company.findMany(),
    ]);

    // Fast lookup key: "BrandName|CompanyName|Strength|DosageForm" normalized lowercase
    const productLookup = new Map<string, string>();
    for (const p of existingProducts) {
      const key = `${p.name.trim().toLowerCase()}|${p.company.name.trim().toLowerCase()}|${p.strength.trim().toLowerCase()}|${p.dosageForm.trim().toLowerCase()}`;
      productLookup.set(key, p.id);
    }

    let validRows = 0;
    let duplicateRows = 0;
    let errorRows = 0;

    const stagedItemsToCreate: any[] = [];

    for (const raw of items) {
      const validationErrors: string[] = [];

      if (!raw.brandName || raw.brandName.trim().length === 0) {
        validationErrors.push('Missing brand name');
      }
      if (!raw.genericName || raw.genericName.trim().length === 0) {
        validationErrors.push('Missing generic name');
      }
      if (!raw.companyName || raw.companyName.trim().length === 0) {
        validationErrors.push('Missing manufacturer / company name');
      }
      if (raw.mrp === undefined || raw.mrp < 0) {
        validationErrors.push('Invalid MRP price');
      }

      const lookupKey = `${(raw.brandName || '').trim().toLowerCase()}|${(raw.companyName || '').trim().toLowerCase()}|${(raw.strength || '').trim().toLowerCase()}|${(raw.dosageForm || 'tablet').trim().toLowerCase()}`;
      const existingProductId = productLookup.get(lookupKey) || null;
      const isDuplicate = existingProductId !== null;

      if (validationErrors.length > 0) {
        errorRows++;
      } else if (isDuplicate) {
        duplicateRows++;
      } else {
        validRows++;
      }

      stagedItemsToCreate.push({
        brandName: (raw.brandName || 'Untitled').trim(),
        genericName: (raw.genericName || 'Unknown').trim(),
        companyName: (raw.companyName || 'Unknown Company').trim(),
        dosageForm: (raw.dosageForm || 'Tablet').trim(),
        strength: (raw.strength || '500mg').trim(),
        mrp: raw.mrp || 0,
        unit: raw.unit || 'Strip (10 tabs)',
        packSize: raw.packSize || null,
        category: raw.category || 'Allopathic',
        indications: raw.indications || null,
        therapeuticClass: raw.therapeuticClass || null,
        isDuplicate,
        existingProductId,
        validationErrors: validationErrors.length > 0 ? JSON.stringify(validationErrors) : null,
        status: validationErrors.length > 0 ? 'REJECTED' : isDuplicate ? 'DUPLICATE_FLAGGED' : 'APPROVED',
      });
    }

    // Create Staging Batch
    const batch = await this.prisma.medicineStagingBatch.create({
      data: {
        batchNumber,
        fileName,
        totalRows: items.length,
        validRows,
        duplicateRows,
        errorRows,
        status: 'STAGED',
        importedBy: actor.email,
        items: {
          create: stagedItemsToCreate,
        },
      },
      include: {
        items: { take: 10 },
      },
    });

    return {
      message: `Batch ${batchNumber} staged successfully. Ready for review.`,
      batch: {
        id: batch.id,
        batchNumber: batch.batchNumber,
        fileName: batch.fileName,
        totalRows: batch.totalRows,
        validRows: batch.validRows,
        duplicateRows: batch.duplicateRows,
        errorRows: batch.errorRows,
        status: batch.status,
      },
    };
  }

  async getStagingBatches() {
    return this.prisma.medicineStagingBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { items: true } },
      },
    });
  }

  async getStagingBatchDetails(batchId: string) {
    const batch = await this.prisma.medicineStagingBatch.findUnique({
      where: { id: batchId },
      include: {
        items: {
          orderBy: [{ isDuplicate: 'desc' }, { brandName: 'asc' }],
        },
      },
    });

    if (!batch) throw new NotFoundException('Staging batch not found');
    return batch;
  }

  async updateStagingItem(
    itemId: string,
    dto: { status?: string; brandName?: string; genericName?: string; mrp?: number },
  ) {
    const item = await this.prisma.medicineStagingItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Staging item not found');

    return this.prisma.medicineStagingItem.update({
      where: { id: itemId },
      data: {
        status: dto.status !== undefined ? dto.status : item.status,
        brandName: dto.brandName !== undefined ? dto.brandName : item.brandName,
        genericName: dto.genericName !== undefined ? dto.genericName : item.genericName,
        mrp: dto.mrp !== undefined ? dto.mrp : item.mrp,
      },
    });
  }

  // Publish staged approved items to live production catalog
  async publishBatch(batchId: string, actor: { id: string; email: string }) {
    const batch = await this.prisma.medicineStagingBatch.findUnique({
      where: { id: batchId },
      include: {
        items: {
          where: { status: 'APPROVED' },
        },
      },
    });

    if (!batch) throw new NotFoundException('Staging batch not found');
    if (batch.status === 'PUBLISHED') {
      throw new BadRequestException('Batch has already been published');
    }
    if (batch.items.length === 0) {
      throw new BadRequestException('No approved items to publish in this batch');
    }

    let publishedCount = 0;

    // Use transaction for atomic catalog insertion
    await this.prisma.$transaction(async (tx) => {
      for (const item of batch.items) {
        // 1. Ensure Generic exists
        const genericSlug = item.genericName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        let generic = await tx.generic.findUnique({ where: { name: item.genericName } });

        if (!generic) {
          generic = await tx.generic.create({
            data: {
              name: item.genericName,
              slug: `${genericSlug}-${Math.floor(Math.random() * 1000)}`,
              therapeuticClass: item.therapeuticClass,
              indications: item.indications,
            },
          });
        }

        // 2. Ensure Company exists
        const companyCode = item.companyName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
        let company = await tx.company.findFirst({
          where: {
            OR: [
              { name: { equals: item.companyName } },
              { code: { equals: companyCode } },
            ],
          },
        });

        if (!company) {
          company = await tx.company.create({
            data: {
              name: item.companyName,
              code: companyCode.length > 0 ? companyCode : `COMP_${Date.now()}`,
            },
          });
        }

        // 3. Create or update Product
        const productSlug = `${item.brandName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${item.strength.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${item.dosageForm.toLowerCase()}`;

        await tx.product.upsert({
          where: { slug: `${productSlug}-${company.code.toLowerCase()}` },
          update: {
            mrp: item.mrp,
            genericId: generic.id,
            genericName: generic.name,
            dosageForm: item.dosageForm,
            strength: item.strength,
            unit: item.unit,
            packSize: item.packSize,
            category: item.category,
            description: item.indications,
          },
          create: {
            name: item.brandName,
            slug: `${productSlug}-${company.code.toLowerCase()}`,
            genericId: generic.id,
            genericName: generic.name,
            companyId: company.id,
            dosageForm: item.dosageForm,
            strength: item.strength,
            mrp: item.mrp,
            unit: item.unit,
            packSize: item.packSize,
            category: item.category,
            description: item.indications,
            isPharmaTrackOpaque: true,
          },
        });

        publishedCount++;
      }

      // Mark batch as PUBLISHED
      await tx.medicineStagingBatch.update({
        where: { id: batchId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });

      await tx.medicineStagingItem.updateMany({
        where: { batchId, status: 'APPROVED' },
        data: { status: 'PUBLISHED' },
      });
    });

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.MEDICINE_BATCH_PUBLISHED,
      entityType: 'MedicineStagingBatch',
      entityId: batchId,
      afterData: {
        batchNumber: batch.batchNumber,
        publishedCount,
      },
    });

    return {
      message: `Successfully merged and published ${publishedCount} medicine items to production catalog.`,
      batchId,
      publishedCount,
    };
  }
}
