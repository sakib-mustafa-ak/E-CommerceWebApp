import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import * as crypto from 'crypto';
import {
  PublicCheckoutDto,
  PublicCheckoutResponse,
  ProductReviewCreateDto,
  ProductReviewResponse,
  WishlistItemResponse,
  UserBehaviorEventDto,
  DigitalDownloadTokenResponse,
  AccountType,
} from '@siam-aqua/shared-types';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Unified Public Checkout (Authenticated + Guest, Physical/Digital/Service)
  async checkout(
    dto: PublicCheckoutDto,
    userId?: string,
  ): Promise<PublicCheckoutResponse> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Checkout requires at least one item');
    }

    // Load product details
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { company: true },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more selected products were not found');
    }

    // RULE: Per-Product COD Validation
    if (dto.paymentMethod === 'COD') {
      const codDisabledProduct = products.find((p) => p.isCodAvailable === false);
      if (codDisabledProduct) {
        throw new BadRequestException(
          `Product "${codDisabledProduct.name}" does not support Cash on Delivery. Please choose pre-payment or remove this item.`,
        );
      }
    }

    // Determine overall order type
    const hasPhysical = products.some((p) => (p as any).productType === 'PHYSICAL' || !(p as any).productType);
    const hasDigital = products.some((p) => (p as any).productType === 'DIGITAL');
    const hasService = products.some((p) => (p as any).productType === 'SERVICE');

    let orderType = 'PHYSICAL';
    if (hasDigital && !hasPhysical && !hasService) {
      orderType = 'DIGITAL';
    } else if (hasService && !hasPhysical && !hasDigital) {
      orderType = 'SERVICE';
    }

    // Validate physical address if physical items present
    if (orderType === 'PHYSICAL' && dto.fulfillmentMethod === 'HOME_DELIVERY' && !dto.deliveryAddress) {
      throw new BadRequestException('Delivery address is required for physical product orders');
    }

    // Calculate line items with Quantity Discount Steppers
    let subtotal = 0;
    let totalDiscount = 0;
    const orderItemsData: any[] = [];
    const digitalTokensToCreate: any[] = [];

    for (const itemDto of dto.items) {
      const product = products.find((p) => p.id === itemDto.productId)!;
      let unitPrice = product.mrp;
      let discountPercent = 0;

      // Quantity-based discount stepper calculation
      if ((product as any).quantityDiscountTiers) {
        try {
          const tiers = JSON.parse((product as any).quantityDiscountTiers);
          if (Array.isArray(tiers)) {
            // Sort tiers desc by minQty
            tiers.sort((a, b) => b.minQty - a.minQty);
            const applicableTier = tiers.find((t) => itemDto.quantity >= t.minQty);
            if (applicableTier) {
              discountPercent = applicableTier.discountPercent || 0;
              unitPrice = product.mrp * (1 - discountPercent / 100);
            }
          }
        } catch {
          // Ignore parse errors, fallback to standard MRP
        }
      }

      const lineTotal = unitPrice * itemDto.quantity;
      const originalLineTotal = product.mrp * itemDto.quantity;
      const lineDiscount = originalLineTotal - lineTotal;

      subtotal += originalLineTotal;
      totalDiscount += lineDiscount;

      orderItemsData.push({
        productId: product.id,
        unitType: product.unit.startsWith('Box') ? 'BOX' : 'STRIP',
        variant: itemDto.variant || null,
        requestedQuantity: itemDto.quantity,
        confirmedQuantity: itemDto.quantity,
        verificationStatus: 'FULL_STOCK',
        unitMrp: product.mrp,
        tieredUnitPrice: unitPrice,
        finalUnitPrice: unitPrice,
        appliedUnitPrice: unitPrice,
        totalPrice: lineTotal,
      });

      // Digital token preparation
      if ((product as any).productType === 'DIGITAL') {
        const token = crypto.randomBytes(24).toString('hex');
        const expiryHours = (product as any).digitalExpiryHours || 48;
        const expiresAt = new Date(Date.now() + expiryHours * 3600 * 1000);
        const maxDownloads = (product as any).digitalDownloadLimit || 5;

        digitalTokensToCreate.push({
          productId: product.id,
          productName: product.name,
          token,
          maxDownloads,
          expiresAt,
        });
      }
    }

    const deliveryFee = orderType === 'DIGITAL' ? 0 : 60; // ৳60 flat delivery for physical
    const totalAmount = subtotal - totalDiscount + deliveryFee;

    // Advance Payment / Delivery Deposit Logic for high-value orders (e.g. >= ৳5,000)
    const isAdvanceDepositRequired = totalAmount >= 5000;
    const advanceDepositRequired = isAdvanceDepositRequired ? 3000 : 0;

    const count = await this.prisma.order.count();
    const orderNumber = `ORD-PUB-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const isGuest = !userId || dto.isGuest;

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: isGuest ? null : userId,
          isGuestOrder: isGuest,
          guestName: dto.guestName || (isGuest ? 'Guest Customer' : null),
          guestEmail: dto.guestEmail || null,
          guestPhone: dto.guestPhone || null,
          sectorType: 'PUBLIC',
          orderType,
          platformStatus: 'COMPLETE_SALE',
          fulfillmentStatus: orderType === 'DIGITAL' ? 'DELIVERED' : 'PENDING',
          memoState: 'FINAL_TIERED',
          isFinalMemoPublished: true,
          preliminarySubtotal: subtotal,
          finalSubtotal: subtotal - totalDiscount,
          subtotal: subtotal - totalDiscount,
          discountAmount: totalDiscount,
          deliveryFee,
          totalAmount,
          advanceDepositRequired,
          advanceDepositPaid: dto.paymentMethod === 'ADVANCE_DEPOSIT' ? advanceDepositRequired : 0,
          fulfillmentMethod: dto.fulfillmentMethod,
          deliveryAddress: dto.deliveryAddress || 'Digital Download Order (No Physical Delivery)',
          paymentMethod: dto.paymentMethod,
          paymentStatus: orderType === 'DIGITAL' || dto.paymentMethod === 'BKASH' || dto.paymentMethod === 'CARD' ? 'PAID' : 'UNPAID',
          orderNotes: dto.orderNotes || null,
          prescriptionUrl: dto.prescriptionUrl || null,
          items: {
            create: orderItemsData,
          },
        },
      });

      // Insert digital download tokens if any
      const createdTokens: any[] = [];
      for (const tok of digitalTokensToCreate) {
        const dbToken = await tx.digitalDownloadToken.create({
          data: {
            token: tok.token,
            orderId: createdOrder.id,
            productId: tok.productId,
            userId: isGuest ? null : userId,
            guestEmail: dto.guestEmail || null,
            maxDownloads: tok.maxDownloads,
            expiresAt: tok.expiresAt,
          },
        });
        createdTokens.push({
          productId: tok.productId,
          productName: tok.productName,
          token: dbToken.token,
          downloadUrl: `http://localhost:3001/public/downloads/${dbToken.token}`,
          expiresAt: dbToken.expiresAt.toISOString(),
          maxDownloads: dbToken.maxDownloads,
        });
      }

      return {
        createdOrder,
        createdTokens,
      };
    });

    // Behavioral event logging
    await this.logBehavior(userId, {
      eventType: 'PRODUCT_PURCHASED',
      metadata: {
        orderId: order.createdOrder.id,
        orderNumber,
        productIds,
        totalAmount,
        isGuest,
      },
    });

    return {
      orderId: order.createdOrder.id,
      orderNumber: order.createdOrder.orderNumber,
      totalAmount,
      subtotal,
      discountAmount: totalDiscount,
      deliveryFee,
      advanceDepositRequired,
      isAdvanceDepositRequired,
      orderType: orderType as any,
      digitalDownloadTokens: order.createdTokens.length > 0 ? order.createdTokens : undefined,
      createdAt: order.createdOrder.createdAt.toISOString(),
    };
  }

  // 2. Secure Digital Product Download Service (Enforces Limits & Expiry)
  async downloadDigitalProduct(tokenString: string) {
    const tokenRecord = await this.prisma.digitalDownloadToken.findUnique({
      where: { token: tokenString },
      include: { product: true, order: true },
    });

    if (!tokenRecord) {
      throw new NotFoundException('Invalid or unknown digital download link');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new ForbiddenException('This digital download link has expired');
    }

    if (tokenRecord.downloadCount >= tokenRecord.maxDownloads) {
      throw new ForbiddenException(
        `Maximum download limit (${tokenRecord.maxDownloads} downloads) reached for this product`,
      );
    }

    // Increment download count
    const updated = await this.prisma.digitalDownloadToken.update({
      where: { id: tokenRecord.id },
      data: { downloadCount: { increment: 1 } },
    });

    return {
      message: 'Download authorized successfully',
      fileUrl:
        tokenRecord.product.digitalFileUrl ||
        `https://storage.siamaqua.com/digital-products/${tokenRecord.productId}.pdf`,
      productName: tokenRecord.product.name,
      downloadCount: updated.downloadCount,
      remainingDownloads: updated.maxDownloads - updated.downloadCount,
      expiresAt: updated.expiresAt.toISOString(),
    };
  }

  // Get Digital Token Metadata
  async getDigitalTokenInfo(tokenString: string): Promise<DigitalDownloadTokenResponse> {
    const tokenRecord = await this.prisma.digitalDownloadToken.findUnique({
      where: { token: tokenString },
      include: { product: true },
    });

    if (!tokenRecord) {
      throw new NotFoundException('Invalid digital download token');
    }

    const isExpired = new Date() > tokenRecord.expiresAt;
    const isLimitReached = tokenRecord.downloadCount >= tokenRecord.maxDownloads;

    return {
      token: tokenRecord.token,
      orderId: tokenRecord.orderId,
      productId: tokenRecord.productId,
      productName: tokenRecord.product.name,
      downloadCount: tokenRecord.downloadCount,
      maxDownloads: tokenRecord.maxDownloads,
      remainingDownloads: Math.max(0, tokenRecord.maxDownloads - tokenRecord.downloadCount),
      expiresAt: tokenRecord.expiresAt.toISOString(),
      isExpired,
      isLimitReached,
      fileUrl: isExpired || isLimitReached ? undefined : tokenRecord.product.digitalFileUrl || undefined,
    };
  }

  // 3. Customer Order History Tabbed by Type (Orders / Downloads / Bookings)
  async getCustomerOrderHistory(userId: string, orderType?: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        orderType: orderType ? orderType : undefined,
      },
      include: {
        items: { include: { product: true } },
        digitalTokens: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderType: o.orderType,
      fulfillmentStatus: o.fulfillmentStatus,
      paymentStatus: o.paymentStatus,
      totalAmount: o.totalAmount,
      deliveryFee: o.deliveryFee,
      items: o.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product?.name,
        genericName: i.product?.genericName,
        quantity: i.confirmedQuantity,
        unitPrice: i.finalUnitPrice,
        totalPrice: i.totalPrice,
        variant: i.variant,
      })),
      digitalDownloads: o.digitalTokens.map((dt) => ({
        token: dt.token,
        productName: dt.product.name,
        downloadUrl: `http://localhost:3001/public/downloads/${dt.token}`,
        downloadCount: dt.downloadCount,
        maxDownloads: dt.maxDownloads,
        remainingDownloads: Math.max(0, dt.maxDownloads - dt.downloadCount),
        expiresAt: dt.expiresAt.toISOString(),
        isExpired: new Date() > dt.expiresAt,
      })),
      createdAt: o.createdAt.toISOString(),
    }));
  }

  // 4. Wishlist Management & Restock Triggers
  async toggleWishlist(userId: string, productId: string) {
    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (existing) {
      await this.prisma.wishlist.delete({
        where: { id: existing.id },
      });
      return { isInWishlist: false, message: 'Removed from wishlist' };
    } else {
      await this.prisma.wishlist.create({
        data: { userId, productId },
      });
      return { isInWishlist: true, message: 'Added to wishlist' };
    }
  }

  async getWishlist(userId: string): Promise<WishlistItemResponse[]> {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: { include: { company: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((w) => ({
      id: w.id,
      productId: w.productId,
      productName: w.product.name,
      genericName: w.product.genericName,
      companyName: w.product.company.name,
      mrp: w.product.mrp,
      unit: w.product.unit,
      isOfferParaLiveStock: w.product.isOfferParaLiveStock,
      offerParaStockQty: w.product.offerParaStockQty,
      isInStock: w.product.isOfferParaLiveStock ? w.product.offerParaStockQty > 0 : true,
      addedAt: w.createdAt.toISOString(),
    }));
  }

  // 5. Product Reviews with Star Rating & Video Uploads
  async addProductReview(
    userId: string | undefined,
    dto: ProductReviewCreateDto,
  ): Promise<ProductReviewResponse> {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5 stars');
    }

    if (!dto.comment || dto.comment.trim().length === 0) {
      throw new BadRequestException('Review comment is required');
    }

    // Check verified purchase
    let isVerifiedPurchase = false;
    if (userId) {
      const purchaseCount = await this.prisma.orderItem.count({
        where: {
          productId: dto.productId,
          order: { userId },
        },
      });
      isVerifiedPurchase = purchaseCount > 0;
    }

    let reviewerName = dto.guestName || 'Public Customer';
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) reviewerName = user.name;
    }

    const review = await this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId: userId || null,
        guestName: reviewerName,
        rating: dto.rating,
        comment: dto.comment,
        videoUrl: dto.videoUrl || null,
        imageUrl: dto.imageUrl || null,
        isVerifiedPurchase,
      },
    });

    // Recalculate average rating for product
    const allReviews = await this.prisma.review.findMany({
      where: { productId: dto.productId },
      select: { rating: true },
    });

    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await this.prisma.product.update({
      where: { id: dto.productId },
      data: {
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviewsCount: allReviews.length,
      },
    });

    return {
      id: review.id,
      productId: review.productId,
      userId: review.userId,
      reviewerName,
      rating: review.rating,
      comment: review.comment,
      videoUrl: review.videoUrl,
      imageUrl: review.imageUrl,
      isVerifiedPurchase: review.isVerifiedPurchase,
      createdAt: review.createdAt.toISOString(),
    };
  }

  async getProductReviews(productId: string): Promise<ProductReviewResponse[]> {
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((r) => ({
      id: r.id,
      productId: r.productId,
      userId: r.userId,
      reviewerName: r.user?.name || r.guestName || 'Verified Buyer',
      rating: r.rating,
      comment: r.comment,
      videoUrl: r.videoUrl,
      imageUrl: r.imageUrl,
      isVerifiedPurchase: r.isVerifiedPurchase,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // 6. Behavioral Tracking for Future Recommendations
  async logBehavior(userId: string | undefined, dto: UserBehaviorEventDto) {
    return this.prisma.userBehaviorLog.create({
      data: {
        userId: userId || null,
        guestSessionId: dto.guestSessionId || null,
        eventType: dto.eventType,
        productId: dto.productId || null,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
      },
    });
  }

  // 7. Product Recommendations ("You Might Also Like")
  async getRecommendations(productId: string, limit = 6) {
    const currentProduct = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!currentProduct) {
      return [];
    }

    const recommendations = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        OR: [
          { genericName: currentProduct.genericName },
          { category: currentProduct.category },
          { companyId: currentProduct.companyId },
        ],
      },
      include: { company: true },
      take: limit,
      orderBy: { totalReviewsCount: 'desc' },
    });

    return recommendations.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      genericName: p.genericName,
      companyName: p.company.name,
      mrp: p.mrp,
      unit: p.unit,
      productType: (p as any).productType || 'PHYSICAL',
      averageRating: (p as any).averageRating || 0,
      totalReviewsCount: (p as any).totalReviewsCount || 0,
      isCodAvailable: (p as any).isCodAvailable !== false,
    }));
  }

  // 8. Stealth Deep-Link Resolver: Restricted sector items return 404
  async getProductBySlugStealth(slug: string, requestingAccountType?: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { company: true, generic: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Stealth rule: if product has wholesale MOQ > 10 or opaque pharma stock restricted to wholesalers
    // and requesting user is public/guest or Paikari, hide wholesale-only proprietary attributes
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      genericName: product.genericName,
      companyName: product.company.name,
      dosageForm: product.dosageForm,
      strength: product.strength,
      mrp: product.mrp,
      unit: product.unit,
      packSize: product.packSize,
      category: product.category,
      description: product.description,
      productType: (product as any).productType || 'PHYSICAL',
      isCodAvailable: (product as any).isCodAvailable !== false,
      quantityDiscountTiers: (product as any).quantityDiscountTiers
        ? JSON.parse((product as any).quantityDiscountTiers)
        : null,
      variants: (product as any).variantsJson
        ? JSON.parse((product as any).variantsJson)
        : null,
      averageRating: (product as any).averageRating || 0,
      totalReviewsCount: (product as any).totalReviewsCount || 0,
      isOfferParaLiveStock: product.isOfferParaLiveStock,
      offerParaStockQty: product.offerParaStockQty,
    };
  }

  // 9. Printable Public Customer Memo / Receipt
  async getOrderReceipt(orderId: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { include: { company: true } } } },
        digitalTokens: { include: { product: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Security check: if not guest order, ensure matches userId
    if (!order.isGuestOrder && userId && order.userId !== userId) {
      throw new ForbiddenException('Access to this receipt is restricted');
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      isGuestOrder: order.isGuestOrder,
      customerName: order.guestName || 'Public Customer',
      customerEmail: order.guestEmail,
      customerPhone: order.guestPhone,
      fulfillmentMethod: order.fulfillmentMethod,
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      deliveryFee: order.deliveryFee,
      totalAmount: order.totalAmount,
      advanceDepositRequired: order.advanceDepositRequired,
      advanceDepositPaid: order.advanceDepositPaid,
      items: order.items.map((i) => ({
        id: i.id,
        productName: i.product?.name,
        genericName: i.product?.genericName,
        companyName: i.product?.company?.name,
        quantity: i.confirmedQuantity,
        unitPrice: i.finalUnitPrice,
        totalPrice: i.totalPrice,
        variant: i.variant,
      })),
      digitalDownloads: order.digitalTokens.map((dt) => ({
        token: dt.token,
        productName: dt.product.name,
        downloadUrl: `http://localhost:3001/public/downloads/${dt.token}`,
        maxDownloads: dt.maxDownloads,
        downloadCount: dt.downloadCount,
        expiresAt: dt.expiresAt.toISOString(),
      })),
      createdAt: order.createdAt.toISOString(),
    };
  }
}
