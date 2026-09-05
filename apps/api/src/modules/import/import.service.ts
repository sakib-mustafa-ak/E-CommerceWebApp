import { Injectable, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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
          where: {
            OR: [{ email }, { phone }],
          },
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
          // Update profile
          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              name: ownerName,
              accountType: AccountType.PAIKARI_SELLER,
            },
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
                    where: {
                      userId_productId: {
                        userId: user.id,
                        productId: ov.productId,
                      },
                    },
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
            // Ignore malformed JSON override string for individual row, but import customer
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
}
