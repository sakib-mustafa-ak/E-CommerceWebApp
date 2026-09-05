import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import * as bcrypt from 'bcryptjs';
import {
  MpoCreateAccountDto,
  MpoListingCreateDto,
  MpoListingReviewDto,
  MpoBidCreateDto,
  PreOrderDraftMemoUpdateDto,
  MpoTerritoryGroupSummary,
} from '@siam-aqua/shared-types';

@Injectable()
export class MpoService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Admin creates MPO Account (No public application path exists)
  async createMpoAccount(dto: MpoCreateAccountDto, adminId?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new BadRequestException('User with this phone number already exists');
      }
    }

    // Count existing MPO profiles for sequential anonymous labeling
    const mpoCount = await this.prisma.mpoProfile.count();
    const anonymousLabel = `Anonymous ${mpoCount + 1} (Siam's Aqua Store)`;

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        name: dto.name,
        passwordHash,
        accountType: 'MPO',
        mpoProfile: {
          create: {
            territory: dto.territory,
            anonymousLabel,
            photoUrl: dto.photoUrl,
            adminPrivateNotes: dto.adminPrivateNotes,
          },
        },
      },
      include: {
        mpoProfile: true,
      },
    });

    const mpoProfileId = user.mpoProfile!.id;

    // Link assigned companies
    if (dto.assignedCompanyIds && dto.assignedCompanyIds.length > 0) {
      await this.prisma.mpoCompany.createMany({
        data: dto.assignedCompanyIds.map((companyId) => ({
          mpoProfileId,
          companyId,
        })),
      });
    }

    // Link hand-picked product selections (~900-1000 items)
    if (dto.selectedProductIds && dto.selectedProductIds.length > 0) {
      await this.prisma.mpoProductSelection.createMany({
        data: dto.selectedProductIds.map((productId) => ({
          mpoProfileId,
          productId,
        })),
      });
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId || null,
        action: 'MPO_ACCOUNT_CREATED',
        entityType: 'MPO_PROFILE',
        entityId: mpoProfileId,
        afterData: JSON.stringify({
          name: dto.name,
          email: dto.email,
          territory: dto.territory,
          anonymousLabel,
          assignedCompanyCount: dto.assignedCompanyIds?.length || 0,
          selectedProductCount: dto.selectedProductIds?.length || 0,
        }),
      },
    });

    return this.getMpoProfileById(mpoProfileId, true);
  }

  // 2. Admin Territory Auto-Grouping Overview
  async getTerritoriesGrouping(): Promise<MpoTerritoryGroupSummary[]> {
    const profiles = await this.prisma.mpoProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        assignedCompanies: {
          include: {
            company: true,
          },
        },
        _count: {
          select: {
            productSelections: true,
            listings: true,
          },
        },
      },
      orderBy: { territory: 'asc' },
    });

    const groupMap = new Map<string, any[]>();

    for (const p of profiles) {
      const territory = p.territory || 'Unassigned';
      if (!groupMap.has(territory)) {
        groupMap.set(territory, []);
      }
      groupMap.get(territory)!.push({
        id: p.id,
        userId: p.userId,
        name: p.user.name,
        email: p.user.email,
        phone: p.user.phone || undefined,
        territory: p.territory,
        anonymousLabel: p.anonymousLabel,
        photoUrl: p.photoUrl || undefined,
        assignedCompanies: p.assignedCompanies.map((c) => ({
          id: c.company.id,
          name: c.company.name,
          code: c.company.code,
        })),
        productCount: p._count.productSelections,
        totalSubmissions: p.totalSubmissions,
        totalSalesCount: p.totalSalesCount,
        totalSalesVolume: p.totalSalesVolume,
        adminPrivateNotes: p.adminPrivateNotes || undefined,
        createdAt: p.createdAt.toISOString(),
      });
    }

    const summaries: MpoTerritoryGroupSummary[] = [];
    for (const [territory, mpos] of groupMap.entries()) {
      summaries.push({
        territory,
        mpoCount: mpos.length,
        mpos,
      });
    }

    return summaries.sort((a, b) => a.territory.localeCompare(b.territory));
  }

  // 3. Get MPO Profile Details
  async getMpoProfileById(profileId: string, isAdminView = false) {
    const profile = await this.prisma.mpoProfile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        assignedCompanies: {
          include: { company: true },
        },
        productSelections: {
          include: {
            product: {
              include: { company: true, generic: true },
            },
          },
        },
        _count: {
          select: {
            productSelections: true,
            listings: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`MPO profile ${profileId} not found`);
    }

    return {
      id: profile.id,
      userId: profile.userId,
      name: isAdminView ? profile.user.name : profile.anonymousLabel,
      email: isAdminView ? profile.user.email : undefined,
      phone: isAdminView ? profile.user.phone || undefined : undefined,
      territory: profile.territory,
      anonymousLabel: profile.anonymousLabel,
      photoUrl: profile.photoUrl || undefined,
      assignedCompanies: profile.assignedCompanies.map((c) => ({
        id: c.company.id,
        name: c.company.name,
        code: c.company.code,
      })),
      selectedProducts: profile.productSelections.map((ps) => ({
        id: ps.product.id,
        name: ps.product.name,
        genericName: ps.product.genericName,
        companyName: ps.product.company.name,
        mrp: ps.product.mrp,
        unit: ps.product.unit,
      })),
      productCount: profile._count.productSelections,
      totalSubmissions: profile.totalSubmissions,
      totalSalesCount: profile.totalSalesCount,
      totalSalesVolume: profile.totalSalesVolume,
      adminPrivateNotes: isAdminView ? profile.adminPrivateNotes || undefined : undefined,
      createdAt: profile.createdAt.toISOString(),
    };
  }

  async getMpoProfileByUserId(userId: string, isAdminView = false) {
    const profile = await this.prisma.mpoProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('MPO profile not found for user');
    }
    return this.getMpoProfileById(profile.id, isAdminView);
  }

  // Update MPO Profile (Admin can change territory, products, notes)
  async updateMpoProfile(
    profileId: string,
    data: {
      territory?: string;
      photoUrl?: string;
      adminPrivateNotes?: string;
      assignedCompanyIds?: string[];
      selectedProductIds?: string[];
    },
  ) {
    const profile = await this.prisma.mpoProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile) {
      throw new NotFoundException(`MPO profile ${profileId} not found`);
    }

    await this.prisma.mpoProfile.update({
      where: { id: profileId },
      data: {
        territory: data.territory ?? profile.territory,
        photoUrl: data.photoUrl ?? profile.photoUrl,
        adminPrivateNotes: data.adminPrivateNotes ?? profile.adminPrivateNotes,
      },
    });

    if (data.assignedCompanyIds) {
      await this.prisma.mpoCompany.deleteMany({ where: { mpoProfileId: profileId } });
      await this.prisma.mpoCompany.createMany({
        data: data.assignedCompanyIds.map((companyId) => ({
          mpoProfileId: profileId,
          companyId,
        })),
      });
    }

    if (data.selectedProductIds) {
      await this.prisma.mpoProductSelection.deleteMany({
        where: { mpoProfileId: profileId },
      });
      await this.prisma.mpoProductSelection.createMany({
        data: data.selectedProductIds.map((productId) => ({
          mpoProfileId: profileId,
          productId,
        })),
      });
    }

    return this.getMpoProfileById(profileId, true);
  }

  // 4. MPO Catalog Subset (Hand-picked items restricted to this MPO)
  async getMpoCatalogSubset(userId: string, query?: string) {
    const profile = await this.prisma.mpoProfile.findUnique({
      where: { userId },
      include: {
        productSelections: {
          include: {
            product: {
              include: { company: true, generic: true },
            },
          },
        },
        assignedCompanies: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('MPO profile not found');
    }

    let products = profile.productSelections.map((ps) => ps.product);

    // If no explicit selections made yet, fetch products from assigned companies
    if (products.length === 0 && profile.assignedCompanies.length > 0) {
      const companyIds = profile.assignedCompanies.map((c) => c.companyId);
      products = await this.prisma.product.findMany({
        where: { companyId: { in: companyIds } },
        include: { company: true, generic: true },
        take: 50,
      });
    }

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.genericName.toLowerCase().includes(q) ||
          p.company.name.toLowerCase().includes(q),
      );
    }

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      genericName: p.genericName,
      companyName: p.company.name,
      dosageForm: p.dosageForm,
      strength: p.strength,
      mrp: p.mrp,
      unit: p.unit,
      packSize: p.packSize,
    }));
  }

  // 5. MPO Submits Stock Listing
  async createListing(userId: string, dto: MpoListingCreateDto) {
    const profile = await this.prisma.mpoProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new ForbiddenException('Only verified MPO accounts can submit listings');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }

    if (dto.offeredQuantity <= 0) {
      throw new BadRequestException('Offered quantity must be greater than 0');
    }

    // Bonus calculations
    let calculatedBonus = dto.bonusQuantity || 0;
    if (dto.bonusRatio && !dto.bonusQuantity) {
      // Parse ratio like "10+2", "20+5"
      const match = dto.bonusRatio.match(/^(\d+)\+(\d+)$/);
      if (match) {
        const base = parseInt(match[1], 10);
        const bonusPerBase = parseInt(match[2], 10);
        if (base > 0) {
          calculatedBonus = Math.floor(dto.offeredQuantity / base) * bonusPerBase;
        }
      }
    }

    const count = await this.prisma.mpoListing.count();
    const listingNumber = `MPO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const listing = await this.prisma.mpoListing.create({
      data: {
        listingNumber,
        mpoProfileId: profile.id,
        productId: dto.productId,
        offeredQuantity: dto.offeredQuantity,
        bonusQuantity: calculatedBonus,
        bonusRatio: dto.bonusRatio,
        mpoTargetPrice: dto.mpoTargetPrice,
        unitMrp: product.mrp,
        status: 'PENDING_ADMIN_REVIEW',
      },
      include: {
        product: { include: { company: true } },
        mpoProfile: true,
      },
    });

    // Increment submissions count
    await this.prisma.mpoProfile.update({
      where: { id: profile.id },
      data: { totalSubmissions: { increment: 1 } },
    });

    return this.mapListingToResponse(listing, 'MPO', userId);
  }

  // 6. Admin Listing Review Queue
  async getAdminListingQueue(status?: string) {
    const listings = await this.prisma.mpoListing.findMany({
      where: status ? { status } : undefined,
      include: {
        product: { include: { company: true } },
        mpoProfile: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
        bids: {
          include: {
            wholesaler: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return listings.map((l) => this.mapListingToResponse(l, 'ADMIN'));
  }

  // Admin approves/rejects listing and configures multi-channel visibility and prices
  async reviewListing(
    adminId: string,
    listingId: string,
    dto: MpoListingReviewDto,
  ) {
    const listing = await this.prisma.mpoListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) {
      throw new NotFoundException(`Listing ${listingId} not found`);
    }

    const updated = await this.prisma.mpoListing.update({
      where: { id: listingId },
      data: {
        status: dto.status,
        rejectionReason: dto.rejectionReason,
        adminApprovedAt: dto.status === 'APPROVED' ? new Date() : null,
        adminApprovedBy: adminId,
        isVisiblePublic: dto.isVisiblePublic ?? listing.isVisiblePublic,
        isVisiblePaikari: dto.isVisiblePaikari ?? listing.isVisiblePaikari,
        isVisibleWholesale: dto.isVisibleWholesale ?? listing.isVisibleWholesale,
        publicUnitPrice: dto.publicUnitPrice ?? listing.publicUnitPrice,
        paikariUnitPrice: dto.paikariUnitPrice ?? listing.paikariUnitPrice,
        wholesaleUnitPrice: dto.wholesaleUnitPrice ?? listing.wholesaleUnitPrice,
      },
      include: {
        product: { include: { company: true } },
        mpoProfile: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
        bids: {
          include: {
            wholesaler: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return this.mapListingToResponse(updated, 'ADMIN');
  }

  // 7. Wholesaler Feed: Anonymous listings with Counter-Bidding
  async getWholesaleFeed(wholesalerUserId: string) {
    const listings = await this.prisma.mpoListing.findMany({
      where: {
        status: 'APPROVED',
        isVisibleWholesale: true,
      },
      include: {
        product: { include: { company: true } },
        mpoProfile: true,
        bids: {
          where: { wholesalerId: wholesalerUserId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return listings.map((l) => this.mapListingToResponse(l, 'WHOLESALER', wholesalerUserId));
  }

  // 8. Wholesaler Places Counter-Bid
  async placeBid(wholesalerUserId: string, listingId: string, dto: MpoBidCreateDto) {
    const listing = await this.prisma.mpoListing.findUnique({
      where: { id: listingId },
    });

    if (!listing || listing.status !== 'APPROVED' || !listing.isVisibleWholesale) {
      throw new BadRequestException('This listing is not currently open for wholesale bids');
    }

    if (dto.bidQuantity <= 0 || dto.bidUnitPrice <= 0) {
      throw new BadRequestException('Bid quantity and unit price must be positive numbers');
    }

    const bid = await this.prisma.mpoBid.create({
      data: {
        listingId,
        wholesalerId: wholesalerUserId,
        bidUnitPrice: dto.bidUnitPrice,
        bidQuantity: dto.bidQuantity,
        status: 'PENDING',
      },
      include: {
        wholesaler: { select: { name: true } },
      },
    });

    return {
      id: bid.id,
      listingId: bid.listingId,
      bidUnitPrice: bid.bidUnitPrice,
      bidQuantity: bid.bidQuantity,
      status: bid.status,
      createdAt: bid.createdAt.toISOString(),
    };
  }

  // 9. MPO sees their listings & incoming bids
  async getMpoListings(mpoUserId: string) {
    const profile = await this.prisma.mpoProfile.findUnique({
      where: { userId: mpoUserId },
    });
    if (!profile) {
      throw new ForbiddenException('MPO profile not found');
    }

    const listings = await this.prisma.mpoListing.findMany({
      where: { mpoProfileId: profile.id },
      include: {
        product: { include: { company: true } },
        mpoProfile: true,
        bids: {
          orderBy: { bidUnitPrice: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return listings.map((l) => this.mapListingToResponse(l, 'MPO', mpoUserId));
  }

  // 10. MPO Final Bid Acceptance Authority (Confirms order under Siam's Aqua's name)
  async acceptBid(mpoUserId: string, listingId: string, bidId: string) {
    const profile = await this.prisma.mpoProfile.findUnique({
      where: { userId: mpoUserId },
    });
    if (!profile) {
      throw new ForbiddenException('Unauthorized');
    }

    const listing = await this.prisma.mpoListing.findUnique({
      where: { id: listingId },
      include: {
        product: true,
        bids: true,
      },
    });

    if (!listing || listing.mpoProfileId !== profile.id) {
      throw new NotFoundException('Listing not found or not owned by you');
    }

    const targetBid = listing.bids.find((b) => b.id === bidId);
    if (!targetBid) {
      throw new NotFoundException('Bid not found on this listing');
    }

    if (targetBid.status !== 'PENDING') {
      throw new BadRequestException('Bid is already processed');
    }

    // 1. Accept target bid, reject all other bids on this listing
    await this.prisma.$transaction(async (tx) => {
      await tx.mpoBid.update({
        where: { id: bidId },
        data: { status: 'ACCEPTED' },
      });

      await tx.mpoBid.updateMany({
        where: {
          listingId,
          id: { not: bidId },
        },
        data: { status: 'REJECTED' },
      });

      await tx.mpoListing.update({
        where: { id: listingId },
        data: { status: 'BID_ACCEPTED' },
      });

      // Update MPO stats
      const salesVolume = targetBid.bidUnitPrice * targetBid.bidQuantity;
      await tx.mpoProfile.update({
        where: { id: profile.id },
        data: {
          totalSalesCount: { increment: 1 },
          totalSalesVolume: { increment: salesVolume },
        },
      });

      // 2. Auto-generate confirmed Order for winning wholesaler under Siam's Aqua's name
      const orderCount = await tx.order.count();
      const orderNumber = `ORD-MPO-${new Date().getFullYear()}-${String(orderCount + 1).padStart(5, '0')}`;

      const totalItemPrice = targetBid.bidUnitPrice * targetBid.bidQuantity;

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: targetBid.wholesalerId,
          sectorType: 'WHOLESALE',
          fulfillmentStatus: 'CONFIRMED',
          memoState: 'FINAL_TIERED',
          isFinalMemoPublished: true,
          preliminarySubtotal: totalItemPrice,
          finalSubtotal: totalItemPrice,
          subtotal: totalItemPrice,
          totalAmount: totalItemPrice,
          deliveryAddress: "Siam's Aqua Central Hub / Wholesaler Delivery",
          orderNotes: `Filled from Siam's Aqua Verified Stock (Source: ${profile.anonymousLabel})`,
          items: {
            create: [
              {
                productId: listing.productId,
                unitType: 'BOX',
                requestedQuantity: targetBid.bidQuantity,
                confirmedQuantity: targetBid.bidQuantity,
                verificationStatus: 'FULL_STOCK',
                unitMrp: listing.unitMrp,
                tieredUnitPrice: targetBid.bidUnitPrice,
                finalUnitPrice: targetBid.bidUnitPrice,
                appliedUnitPrice: targetBid.bidUnitPrice,
                totalPrice: totalItemPrice,
                isBonusItem: false,
              },
              ...(listing.bonusQuantity > 0
                ? [
                    {
                      productId: listing.productId,
                      unitType: 'BOX',
                      requestedQuantity: listing.bonusQuantity,
                      confirmedQuantity: listing.bonusQuantity,
                      verificationStatus: 'FULL_STOCK',
                      unitMrp: 0,
                      tieredUnitPrice: 0,
                      finalUnitPrice: 0,
                      appliedUnitPrice: 0,
                      totalPrice: 0,
                      isBonusItem: true,
                      bonusRatio: listing.bonusRatio,
                    },
                  ]
                : []),
            ],
          },
        },
      });

      return order;
    });

    return {
      message: 'Bid accepted successfully. Wholesaler order confirmed under Siam\'s Aqua Store.',
      listingId,
      acceptedBidId: bidId,
    };
  }

  // 11. Stale Listing Check & Nudges (7+ days old listings)
  async checkStaleListingsAndNudge() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const staleListings = await this.prisma.mpoListing.findMany({
      where: {
        status: 'APPROVED',
        createdAt: { lte: sevenDaysAgo },
        staleNudgeSentAt: null,
      },
    });

    for (const listing of staleListings) {
      await this.prisma.mpoListing.update({
        where: { id: listing.id },
        data: { staleNudgeSentAt: new Date() },
      });
    }

    return {
      nudgedCount: staleListings.length,
      staleListingIds: staleListings.map((l) => l.id),
    };
  }

  // 12. Pre-Order Draft Memo Arrival Syncing & Unfulfilled Cancellations
  async updatePreOrderDraftMemo(
    adminId: string,
    orderId: string,
    dto: PreOrderDraftMemoUpdateDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      let newSubtotal = 0;

      for (const itemDto of dto.items) {
        const orderItem = order.items.find((i) => i.id === itemDto.orderItemId);
        if (!orderItem) continue;

        const actualQty = itemDto.actualReceivedQuantity;
        const lineTotal = actualQty * orderItem.finalUnitPrice;

        await tx.orderItem.update({
          where: { id: orderItem.id },
          data: {
            actualReceivedQuantity: actualQty,
            confirmedQuantity: actualQty,
            totalPrice: lineTotal,
            verificationStatus: actualQty > 0 ? 'FULL_STOCK' : 'NONE_AVAILABLE',
          },
        });

        newSubtotal += lineTotal;
      }

      const isPartiallyUnfulfilled = dto.isUnfulfilledCancelled || newSubtotal < order.preliminarySubtotal;
      const status = isPartiallyUnfulfilled ? 'PARTIALLY_ARRIVED' : 'FULFILLED';

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          isPreOrderDraft: false,
          preOrderSupplyStatus: status,
          finalSubtotal: newSubtotal,
          subtotal: newSubtotal,
          totalAmount: newSubtotal + order.deliveryFee - order.discountAmount,
          lastUpdatedByStaff: adminId,
          orderNotes: dto.cancellationNotice
            ? `${order.orderNotes || ''} | Pre-order adjustment: ${dto.cancellationNotice}`
            : order.orderNotes,
        },
        include: { items: { include: { product: true } } },
      });

      return updatedOrder;
    });
  }

  // Helper mapper to strictly enforce privacy boundaries
  private mapListingToResponse(
    listing: any,
    role: 'ADMIN' | 'MPO' | 'WHOLESALER',
    userId?: string,
  ) {
    const isOwner = role === 'MPO';
    const isAdmin = role === 'ADMIN';

    // Bids privacy enforcement
    let bids: any[] | undefined = undefined;
    let myBid: any | undefined = undefined;

    if (isAdmin) {
      bids = (listing.bids || []).map((b: any) => ({
        id: b.id,
        wholesalerId: b.wholesalerId,
        wholesalerName: b.wholesaler?.name || 'Wholesaler',
        bidUnitPrice: b.bidUnitPrice,
        bidQuantity: b.bidQuantity,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
      }));
    } else if (isOwner) {
      // MPO sees all bids, but bidder identity is masked
      bids = (listing.bids || []).map((b: any, index: number) => ({
        id: b.id,
        bidUnitPrice: b.bidUnitPrice,
        bidQuantity: b.bidQuantity,
        status: b.status,
        wholesalerName: `Wholesaler Bidder #${index + 1}`,
        createdAt: b.createdAt.toISOString(),
      }));
    } else if (role === 'WHOLESALER') {
      // Wholesaler only sees their own bid
      const found = (listing.bids || []).find((b: any) => b.wholesalerId === userId);
      if (found) {
        myBid = {
          id: found.id,
          bidUnitPrice: found.bidUnitPrice,
          bidQuantity: found.bidQuantity,
          status: found.status,
          createdAt: found.createdAt.toISOString(),
        };
      }
    }

    return {
      id: listing.id,
      listingNumber: listing.listingNumber,
      mpoProfileId: isAdmin || isOwner ? listing.mpoProfileId : undefined,
      anonymousLabel: listing.mpoProfile?.anonymousLabel || "Anonymous (Siam's Aqua Store)",
      productId: listing.productId,
      productName: listing.product?.name,
      genericName: listing.product?.genericName,
      companyName: listing.product?.company?.name,
      dosageForm: listing.product?.dosageForm,
      strength: listing.product?.strength,
      unitMrp: listing.unitMrp,
      offeredQuantity: listing.offeredQuantity,
      bonusQuantity: listing.bonusQuantity,
      bonusRatio: listing.bonusRatio,
      mpoTargetPrice: isAdmin || isOwner ? listing.mpoTargetPrice : undefined,
      unitPrice: role === 'WHOLESALER' ? (listing.wholesaleUnitPrice || listing.mpoTargetPrice) : undefined,
      status: listing.status,
      rejectionReason: isAdmin || isOwner ? listing.rejectionReason : undefined,
      isVisiblePublic: isAdmin ? listing.isVisiblePublic : undefined,
      isVisiblePaikari: isAdmin ? listing.isVisiblePaikari : undefined,
      isVisibleWholesale: isAdmin ? listing.isVisibleWholesale : undefined,
      publicUnitPrice: isAdmin ? listing.publicUnitPrice : undefined,
      paikariUnitPrice: isAdmin ? listing.paikariUnitPrice : undefined,
      wholesaleUnitPrice: isAdmin ? listing.wholesaleUnitPrice : undefined,
      bids,
      myBid,
      createdAt: listing.createdAt.toISOString(),
    };
  }
}
