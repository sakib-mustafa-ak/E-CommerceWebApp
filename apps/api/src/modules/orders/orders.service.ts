import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  AccountType,
  SectorType,
  FulfillmentStatus,
  FulfillmentMethod,
  PaymentMethod,
  PaymentStatus,
  MemoState,
  LineVerificationStatus,
  CancellationState,
  ShortListStatus,
  AuditAction,
  CreatePaikariOrderDto,
  VerifyLineItemDto,
  PriceOverrideDto,
  AddOrderItemsDto,
  OrderResponse,
  PharmaTrackShortListItem,
  CustomerRankingItem,
  PlatformSettingsDto,
} from '@siam-aqua/shared-types';
import { PricingEngine } from '@siam-aqua/pricing';
import { EventsGateway } from '../events/events.gateway';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventsGateway: EventsGateway,
    private readonly auditService: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Create Paikari Order (Preliminary MRP Memo + Free Delivery Threshold)
  // ---------------------------------------------------------------------------
  async createPaikariOrder(
    actorId: string,
    actorAccountType: string,
    dto: CreatePaikariOrderDto,
  ): Promise<OrderResponse> {
    const targetUserId =
      (actorAccountType === AccountType.SUPER_ADMIN || actorAccountType === AccountType.STAFF) &&
      dto.targetCustomerId
        ? dto.targetCustomerId
        : actorId;

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        customerProfile: {
          include: { tier: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Customer account not found');
    }

    const customerProfile = user.customerProfile;
    const tier = customerProfile?.tier;

    // Fetch product details for all requested items
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        company: true,
        generic: true,
        productOverrides: tier ? { where: { tierId: tier.id } } : undefined,
        manualOverrides: { where: { userId: targetUserId } },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Fetch company rates for customer tier
    const companyRates = tier
      ? await this.prisma.companyRate.findMany({
          where: { tierId: tier.id },
        })
      : [];
    const companyRateMap = new Map(companyRates.map((r) => [r.companyId, r]));

    // Platform settings for delivery fees
    const settings = await this.getPlatformSettings();

    // Build line items & calculate preliminary totals
    let preliminarySubtotal = 0;
    const orderItemsData = [];

    for (const itemInput of dto.items) {
      const product = productMap.get(itemInput.productId);
      if (!product) continue;

      const unitMrp = product.mrp;
      const requestedQty = Math.max(1, itemInput.requestedQuantity);
      const linePreliminaryTotal = PricingEngine.roundToTwoDecimals(unitMrp * requestedQty);
      preliminarySubtotal += linePreliminaryTotal;

      // Calculate Tiered Price using 4-layer pricing engine
      const pricingResult = PricingEngine.calculatePrice(
        {
          productId: product.id,
          mrp: product.mrp,
          companyId: product.companyId,
        },
        {
          customerId: targetUserId,
          tierId: tier ? tier.id : '',
          manualOverrides: product.manualOverrides?.[0]
            ? {
                [product.id]: {
                  rateType: product.manualOverrides[0].rateType as any,
                  value: product.manualOverrides[0].value,
                },
              }
            : {},
        },
        {
          tierDefaults: tier
            ? { [tier.id]: { rateType: tier.defaultRateType as any, value: tier.defaultValue } }
            : {},
          companyRates: companyRateMap.has(product.companyId) && tier
            ? {
                [product.companyId]: {
                  [tier.id]: {
                    rateType: companyRateMap.get(product.companyId)!.rateType as any,
                    value: companyRateMap.get(product.companyId)!.value,
                  },
                },
              }
            : {},
          productOverrides: product.productOverrides?.[0] && tier
            ? {
                [product.id]: {
                  [tier.id]: {
                    rateType: product.productOverrides[0].rateType as any,
                    value: product.productOverrides[0].value,
                  },
                },
              }
            : {},
        },
      );

      // Offer Para items skip 3-step staff verification & auto-confirm
      const isOfferPara = product.isOfferParaLiveStock;
      const initialVerificationStatus = isOfferPara
        ? LineVerificationStatus.FULL_STOCK
        : LineVerificationStatus.PENDING;
      const confirmedQuantity = isOfferPara ? requestedQty : 0;
      const finalUnitPrice = pricingResult.finalUnitPrice;
      const lineTotalPrice = isOfferPara
        ? PricingEngine.roundToTwoDecimals(finalUnitPrice * confirmedQuantity)
        : 0;

      orderItemsData.push({
        productId: product.id,
        unitType: itemInput.unitType,
        requestedQuantity: requestedQty,
        confirmedQuantity,
        verificationStatus: initialVerificationStatus,
        isOfferPara,
        unitMrp,
        tieredUnitPrice: pricingResult.finalUnitPrice,
        finalUnitPrice,
        appliedUnitPrice: pricingResult.finalUnitPrice,
        appliedLayer: pricingResult.appliedLayer,
        rateType: pricingResult.appliedRule.rateType,
        rateValue: pricingResult.appliedRule.value,
        totalPrice: lineTotalPrice,
      });
    }

    preliminarySubtotal = PricingEngine.roundToTwoDecimals(preliminarySubtotal);

    // Free delivery threshold check per customer
    const shopThreshold = customerProfile?.deliveryFeeThreshold || settings.defaultFreeDeliveryThreshold;
    let deliveryFee = 0;
    if (dto.fulfillmentMethod === FulfillmentMethod.HOME_DELIVERY) {
      if (preliminarySubtotal < shopThreshold) {
        deliveryFee = settings.defaultDeliveryFee;
      }
    }

    const preliminaryTotal = PricingEngine.roundToTwoDecimals(preliminarySubtotal + deliveryFee);

    // Generate unique order number
    const count = await this.prisma.order.count();
    const orderNumber = `PKR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const placedByStaff =
      actorAccountType === AccountType.SUPER_ADMIN || actorAccountType === AccountType.STAFF
        ? await this.prisma.user.findUnique({ where: { id: actorId } })
        : null;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId: targetUserId,
        sectorType: SectorType.PHARMACY,
        platformStatus: 'DRAFT_SALE',
        fulfillmentStatus: FulfillmentStatus.PENDING,
        memoState: MemoState.PRELIMINARY_MRP,
        isFinalMemoPublished: false,
        preliminarySubtotal,
        finalSubtotal: 0,
        subtotal: preliminarySubtotal,
        deliveryFee,
        discountAmount: 0,
        totalAmount: preliminaryTotal,
        fulfillmentMethod: dto.fulfillmentMethod,
        pickupPersonName: dto.pickupPersonName,
        pickupPersonPhone: dto.pickupPersonPhone,
        deliveryAddress: dto.deliveryAddress || customerProfile?.address || 'Self Pickup',
        isTodayDelivery: dto.isTodayDelivery !== undefined ? dto.isTodayDelivery : true,
        paymentMethod: dto.paymentMethod,
        paymentStatus: PaymentStatus.UNPAID,
        orderNotes: dto.orderNotes,
        voiceNoteUrl: dto.voiceNoteUrl,
        isPrescriptionReq: !!dto.prescriptionUrl,
        prescriptionUrl: dto.prescriptionUrl,
        placedByStaffId: placedByStaff ? placedByStaff.id : null,
        placedByStaffName: placedByStaff ? placedByStaff.name : null,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: { product: { include: { company: true } } },
        },
        user: { include: { customerProfile: true } },
      },
    });

    await this.auditService.log({
      actorId,
      actorEmail: placedByStaff?.email || user.email,
      action: AuditAction.ORDER_CREATED,
      entityType: 'Order',
      entityId: order.id,
      afterData: { orderNumber: order.orderNumber, preliminaryTotal },
    });

    this.eventsGateway.broadcastOrderUpdate(order.id, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.fulfillmentStatus,
      memoState: order.memoState,
    });

    return this.mapOrderToResponse(order);
  }

  // ---------------------------------------------------------------------------
  // 2. Staff Line Item Verification (Optimistic Concurrency & Short List Log)
  // ---------------------------------------------------------------------------
  async verifyLineItem(
    orderId: string,
    staffId: string,
    dto: VerifyLineItemDto,
  ): Promise<OrderResponse> {
    const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Staff account not found');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { include: { company: true } } } },
        user: { include: { customerProfile: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const item = order.items.find((i) => i.id === dto.itemId);
    if (!item) throw new NotFoundException('Order item not found');

    let confirmedQty = 0;
    if (dto.status === LineVerificationStatus.FULL_STOCK) {
      confirmedQty = item.requestedQuantity;
    } else if (dto.status === LineVerificationStatus.PARTIAL_STOCK) {
      confirmedQty = Math.min(item.requestedQuantity, Math.max(0, dto.confirmedQuantity || 0));
    } else if (dto.status === LineVerificationStatus.NONE_AVAILABLE) {
      confirmedQty = 0;

      // Requirement 5: Auto-append to running PharmaTrack Short List (demand log)
      await this.prisma.pharmaTrackShortList.create({
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          productId: item.productId,
          productName: item.product.name,
          genericName: item.product.genericName,
          companyName: item.product.company.name,
          requestedQuantity: item.requestedQuantity,
          unitType: item.unitType,
          shopId: order.userId,
          shopName: order.user.customerProfile?.shopName || order.user.name,
          shopPhone: order.user.phone,
          reportedByStaffId: staff.id,
          reportedByStaffName: staff.name,
          status: ShortListStatus.OPEN,
        },
      });
    }

    const finalPrice = item.manualPriceOverrideByStaff !== null && item.manualPriceOverrideByStaff !== undefined
      ? item.manualPriceOverrideByStaff
      : item.tieredUnitPrice;
    const totalPrice = PricingEngine.roundToTwoDecimals(finalPrice * confirmedQty);

    const updatedItem = await this.prisma.orderItem.update({
      where: { id: item.id },
      data: {
        verificationStatus: dto.status,
        confirmedQuantity: confirmedQty,
        finalUnitPrice: finalPrice,
        totalPrice,
        fulfilledByStaffId: staff.id,
        fulfilledByStaffName: staff.name,
        fulfilledAt: new Date(),
      },
      include: { product: { include: { company: true } } },
    });

    const newFulfillmentStatus =
      order.fulfillmentStatus === FulfillmentStatus.PENDING
        ? FulfillmentStatus.VERIFYING
        : order.fulfillmentStatus;

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        fulfillmentStatus: newFulfillmentStatus,
        lastUpdatedByStaff: staff.id,
        lastUpdatedByStaffName: staff.name,
      },
      include: {
        items: { include: { product: { include: { company: true } } } },
        user: { include: { customerProfile: true } },
      },
    });

    // Requirement 3 & 4: Instant Socket.io broadcast to all staff and customer screens
    this.eventsGateway.broadcastLineItemFulfilled(order.id, {
      orderId: order.id,
      itemId: updatedItem.id,
      verificationStatus: updatedItem.verificationStatus,
      confirmedQuantity: updatedItem.confirmedQuantity,
      fulfilledByStaffId: staff.id,
      fulfilledByStaffName: staff.name,
      fulfilledAt: updatedItem.fulfilledAt?.toISOString(),
      finalUnitPrice: updatedItem.finalUnitPrice,
      totalPrice: updatedItem.totalPrice,
    });

    return this.mapOrderToResponse(updatedOrder);
  }

  // ---------------------------------------------------------------------------
  // 3. Staff Line-by-Line Manual Price Override
  // ---------------------------------------------------------------------------
  async overrideLineItemPrice(
    orderId: string,
    staffId: string,
    dto: PriceOverrideDto,
  ): Promise<OrderResponse> {
    const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Staff account not found');

    const item = await this.prisma.orderItem.findUnique({
      where: { id: dto.itemId },
    });
    if (!item || item.orderId !== orderId) throw new NotFoundException('Item not found in order');

    const manualPrice = PricingEngine.roundToTwoDecimals(Math.max(0, dto.manualPrice));
    const totalPrice = PricingEngine.roundToTwoDecimals(manualPrice * item.confirmedQuantity);

    const updatedItem = await this.prisma.orderItem.update({
      where: { id: item.id },
      data: {
        manualPriceOverrideByStaff: manualPrice,
        finalUnitPrice: manualPrice,
        totalPrice,
        fulfilledByStaffId: staff.id,
        fulfilledByStaffName: staff.name,
      },
      include: { product: { include: { company: true } } },
    });

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { include: { company: true } } } },
        user: { include: { customerProfile: true } },
      },
    });

    this.eventsGateway.broadcastPriceOverridden(orderId, {
      orderId,
      itemId: updatedItem.id,
      manualPrice,
      totalPrice,
      staffName: staff.name,
    });

    return this.mapOrderToResponse(order!);
  }

  // ---------------------------------------------------------------------------
  // 4. Generate & Publish Final Tiered Memo
  // ---------------------------------------------------------------------------
  async publishFinalMemo(orderId: string, staffId: string): Promise<OrderResponse> {
    const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Staff account not found');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { include: { company: true } } } },
        user: { include: { customerProfile: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Calculate actual confirmed final subtotal
    let finalSubtotal = 0;
    for (const item of order.items) {
      if (item.verificationStatus !== LineVerificationStatus.NONE_AVAILABLE) {
        const itemPrice =
          item.manualPriceOverrideByStaff !== null && item.manualPriceOverrideByStaff !== undefined
            ? item.manualPriceOverrideByStaff
            : item.tieredUnitPrice;
        finalSubtotal += PricingEngine.roundToTwoDecimals(itemPrice * item.confirmedQuantity);
      }
    }
    finalSubtotal = PricingEngine.roundToTwoDecimals(finalSubtotal);

    // Re-verify delivery fee
    const settings = await this.getPlatformSettings();
    const threshold = order.user.customerProfile?.deliveryFeeThreshold || settings.defaultFreeDeliveryThreshold;
    let deliveryFee = 0;
    if (order.fulfillmentMethod === FulfillmentMethod.HOME_DELIVERY) {
      if (finalSubtotal < threshold && finalSubtotal > 0) {
        deliveryFee = settings.defaultDeliveryFee;
      }
    }

    const finalTotal = PricingEngine.roundToTwoDecimals(finalSubtotal + deliveryFee);

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        memoState: MemoState.FINAL_TIERED,
        isFinalMemoPublished: true,
        finalSubtotal,
        subtotal: finalSubtotal,
        deliveryFee,
        totalAmount: finalTotal,
        fulfillmentStatus: FulfillmentStatus.PACKED,
        lastUpdatedByStaff: staff.id,
        lastUpdatedByStaffName: staff.name,
      },
      include: {
        items: { include: { product: { include: { company: true } } } },
        user: { include: { customerProfile: true } },
      },
    });

    await this.auditService.log({
      actorId: staff.id,
      actorEmail: staff.email,
      action: AuditAction.FINAL_MEMO_PUBLISHED,
      entityType: 'Order',
      entityId: order.id,
      afterData: { finalSubtotal, deliveryFee, finalTotal },
    });

    this.eventsGateway.broadcastFinalMemoPublished(order.id, {
      orderId: order.id,
      memoState: MemoState.FINAL_TIERED,
      finalSubtotal,
      deliveryFee,
      totalAmount: finalTotal,
      fulfillmentStatus: FulfillmentStatus.PACKED,
    });

    return this.mapOrderToResponse(updatedOrder);
  }

  // ---------------------------------------------------------------------------
  // 5. Staff Add Items to Existing Order (Requirement 8)
  // ---------------------------------------------------------------------------
  async addItemsToOrder(
    orderId: string,
    staffId: string,
    dto: AddOrderItemsDto,
  ): Promise<OrderResponse> {
    const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Staff account not found');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: { include: { customerProfile: { include: { tier: true } } } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const tier = order.user.customerProfile?.tier;
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        company: true,
        productOverrides: tier ? { where: { tierId: tier.id } } : undefined,
        manualOverrides: { where: { userId: order.userId } },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const companyRates = tier
      ? await this.prisma.companyRate.findMany({ where: { tierId: tier.id } })
      : [];
    const companyRateMap = new Map(companyRates.map((r) => [r.companyId, r]));

    for (const itemInput of dto.items) {
      const product = productMap.get(itemInput.productId);
      if (!product) continue;

      const requestedQty = Math.max(1, itemInput.requestedQuantity);
      const pricingResult = PricingEngine.calculatePrice(
        {
          productId: product.id,
          mrp: product.mrp,
          companyId: product.companyId,
        },
        {
          customerId: order.userId,
          tierId: tier ? tier.id : '',
          manualOverrides: product.manualOverrides?.[0]
            ? {
                [product.id]: {
                  rateType: product.manualOverrides[0].rateType as any,
                  value: product.manualOverrides[0].value,
                },
              }
            : {},
        },
        {
          tierDefaults: tier
            ? { [tier.id]: { rateType: tier.defaultRateType as any, value: tier.defaultValue } }
            : {},
          companyRates: companyRateMap.has(product.companyId) && tier
            ? {
                [product.companyId]: {
                  [tier.id]: {
                    rateType: companyRateMap.get(product.companyId)!.rateType as any,
                    value: companyRateMap.get(product.companyId)!.value,
                  },
                },
              }
            : {},
          productOverrides: product.productOverrides?.[0] && tier
            ? {
                [product.id]: {
                  [tier.id]: {
                    rateType: product.productOverrides[0].rateType as any,
                    value: product.productOverrides[0].value,
                  },
                },
              }
            : {},
        },
      );

      const isOfferPara = product.isOfferParaLiveStock;
      const initialStatus = isOfferPara
        ? LineVerificationStatus.FULL_STOCK
        : LineVerificationStatus.PENDING;
      const confirmedQuantity = isOfferPara ? requestedQty : 0;
      const totalPrice = isOfferPara
        ? PricingEngine.roundToTwoDecimals(pricingResult.finalUnitPrice * confirmedQuantity)
        : 0;

      await this.prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          unitType: itemInput.unitType,
          requestedQuantity: requestedQty,
          confirmedQuantity,
          verificationStatus: initialStatus,
          isOfferPara,
          unitMrp: product.mrp,
          tieredUnitPrice: pricingResult.finalUnitPrice,
          finalUnitPrice: pricingResult.finalUnitPrice,
          appliedUnitPrice: pricingResult.finalUnitPrice,
          appliedLayer: pricingResult.appliedLayer,
          rateType: pricingResult.appliedRule.rateType,
          rateValue: pricingResult.appliedRule.value,
          totalPrice,
        },
      });
    }

    const updatedOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: { include: { product: { include: { company: true } } } },
        user: { include: { customerProfile: true } },
      },
    });

    this.eventsGateway.broadcastItemsAdded(order.id, {
      orderId: order.id,
      addedBy: staff.name,
    });

    return this.mapOrderToResponse(updatedOrder!);
  }

  // ---------------------------------------------------------------------------
  // 6. 3-State Cancellation Handler (Requirement 12)
  // ---------------------------------------------------------------------------
  async requestOrExecuteCancellation(
    orderId: string,
    userId: string,
    accountType: string,
    reason: string,
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { include: { customerProfile: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (
      accountType !== AccountType.SUPER_ADMIN &&
      accountType !== AccountType.STAFF &&
      order.userId !== userId
    ) {
      throw new ForbiddenException('Unauthorized to cancel this order');
    }

    // State 1: Before staff picks up (PENDING) -> Instant outright cancel
    if (order.fulfillmentStatus === FulfillmentStatus.PENDING) {
      const updatedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          fulfillmentStatus: FulfillmentStatus.CANCELLED,
          cancellationState: CancellationState.APPROVED,
          cancellationReason: reason || 'Cancelled by customer before staff processing',
          platformStatus: 'CANCELLED',
        },
        include: {
          items: { include: { product: { include: { company: true } } } },
          user: { include: { customerProfile: true } },
        },
      });

      // Record cancellation strike on customer profile
      await this.recordCustomerCancellationStrike(order.userId, 'Customer cancelled before fulfillment');

      this.eventsGateway.broadcastOrderUpdate(order.id, {
        orderId: order.id,
        status: FulfillmentStatus.CANCELLED,
        cancellationState: CancellationState.APPROVED,
      });

      return this.mapOrderToResponse(updatedOrder);
    }

    // State 2: Staff in progress (VERIFYING / PACKED) -> Request banner for staff approval
    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        cancellationState: CancellationState.REQUESTED,
        cancellationReason: reason,
        cancellationRequestedAt: new Date(),
      },
      include: {
        items: { include: { product: { include: { company: true } } } },
        user: { include: { customerProfile: true } },
      },
    });

    this.eventsGateway.broadcastCancellationRequested(order.id, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      reason,
      shopName: order.user.customerProfile?.shopName || order.user.name,
    });

    return this.mapOrderToResponse(updatedOrder);
  }

  // Staff approves or rejects in-progress cancellation request
  async respondToCancellationRequest(
    orderId: string,
    staffId: string,
    approve: boolean,
    staffNote?: string,
  ): Promise<OrderResponse> {
    const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Staff not found');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { include: { customerProfile: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        cancellationState: approve ? CancellationState.APPROVED : CancellationState.REJECTED,
        fulfillmentStatus: approve ? FulfillmentStatus.CANCELLED : order.fulfillmentStatus,
        platformStatus: approve ? 'CANCELLED' : order.platformStatus,
        lastUpdatedByStaff: staff.id,
        lastUpdatedByStaffName: staff.name,
      },
      include: {
        items: { include: { product: { include: { company: true } } } },
        user: { include: { customerProfile: true } },
      },
    });

    if (approve) {
      await this.recordCustomerCancellationStrike(order.userId, staffNote || 'Staff approved in-progress cancellation');
    }

    this.eventsGateway.broadcastCancellationHandled(order.id, {
      orderId: order.id,
      approved: approve,
      handledBy: staff.name,
      status: updatedOrder.fulfillmentStatus,
    });

    return this.mapOrderToResponse(updatedOrder);
  }

  // State 3: Refused at delivery -> Full refund/return case & records problem strike
  async handleRefusedDelivery(
    orderId: string,
    staffId: string,
    refusalReason: string,
  ): Promise<OrderResponse> {
    const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Staff not found');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { include: { customerProfile: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        fulfillmentStatus: FulfillmentStatus.REFUSED_DELIVERY,
        cancellationState: CancellationState.REFUSED_AT_DELIVERY,
        cancellationReason: refusalReason,
        platformStatus: 'RETURNED',
        lastUpdatedByStaff: staff.id,
        lastUpdatedByStaffName: staff.name,
      },
      include: {
        items: { include: { product: { include: { company: true } } } },
        user: { include: { customerProfile: true } },
      },
    });

    // Record delivery refusal strike
    await this.recordCustomerRefusalStrike(order.userId, refusalReason);

    await this.auditService.log({
      actorId: staff.id,
      actorEmail: staff.email,
      action: AuditAction.ORDER_REFUSED_AT_DELIVERY,
      entityType: 'Order',
      entityId: order.id,
      afterData: { refusalReason, customerId: order.userId },
    });

    this.eventsGateway.broadcastOrderUpdate(order.id, {
      orderId: order.id,
      status: FulfillmentStatus.REFUSED_DELIVERY,
      cancellationState: CancellationState.REFUSED_AT_DELIVERY,
    });

    return this.mapOrderToResponse(updatedOrder);
  }

  // ---------------------------------------------------------------------------
  // 7. Auto-Flag Repeat Problem Customers (Requirement 13)
  // ---------------------------------------------------------------------------
  private async recordCustomerCancellationStrike(customerId: string, reason: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: customerId },
    });
    if (!profile) return;

    const newCancelCount = profile.cancellationCount + 1;
    const settings = await this.getPlatformSettings();
    const threshold = settings.problemCustomerThreshold;

    const totalStrikes = newCancelCount + profile.refusalCount;
    const isProblem = totalStrikes >= threshold;
    const flagReason = isProblem
      ? `Auto-flagged: ${totalStrikes} cancellations/refusals (threshold: ${threshold})`
      : profile.problemFlagReason;

    await this.prisma.customerProfile.update({
      where: { userId: customerId },
      data: {
        cancellationCount: newCancelCount,
        isProblemCustomer: isProblem,
        problemFlagReason: flagReason,
      },
    });
  }

  private async recordCustomerRefusalStrike(customerId: string, reason: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: customerId },
    });
    if (!profile) return;

    const newRefusalCount = profile.refusalCount + 1;
    const settings = await this.getPlatformSettings();
    const threshold = settings.problemCustomerThreshold;

    const totalStrikes = profile.cancellationCount + newRefusalCount;
    const isProblem = totalStrikes >= threshold;
    const flagReason = isProblem
      ? `Auto-flagged: ${totalStrikes} cancellations/refusals (threshold: ${threshold})`
      : profile.problemFlagReason;

    await this.prisma.customerProfile.update({
      where: { userId: customerId },
      data: {
        refusalCount: newRefusalCount,
        isProblemCustomer: isProblem,
        problemFlagReason: flagReason,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 8. Order Status Transitions & Dispatch (Requirement 6)
  // ---------------------------------------------------------------------------
  async updateOrderStatus(
    orderId: string,
    staffId: string,
    newStatus: FulfillmentStatus,
    isTodayDelivery?: boolean,
  ): Promise<OrderResponse> {
    const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Staff account not found');

    const updateData: any = {
      fulfillmentStatus: newStatus,
      lastUpdatedByStaff: staff.id,
      lastUpdatedByStaffName: staff.name,
    };

    if (isTodayDelivery !== undefined) {
      updateData.isTodayDelivery = isTodayDelivery;
    }

    if (newStatus === FulfillmentStatus.DELIVERED) {
      updateData.platformStatus = 'COMPLETE_SALE';
      updateData.paymentStatus = PaymentStatus.PAID;
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: { include: { product: { include: { company: true } } } },
        user: { include: { customerProfile: true } },
      },
    });

    this.eventsGateway.broadcastOrderUpdate(orderId, {
      orderId,
      status: newStatus,
      isTodayDelivery: updatedOrder.isTodayDelivery,
      platformStatus: updatedOrder.platformStatus,
    });

    return this.mapOrderToResponse(updatedOrder);
  }

  // ---------------------------------------------------------------------------
  // 9. PharmaTrack Short List (Requirement 5)
  // ---------------------------------------------------------------------------
  async getPharmaTrackShortList(status?: ShortListStatus, query?: string): Promise<PharmaTrackShortListItem[]> {
    const where: any = {};
    if (status) where.status = status;
    if (query) {
      where.OR = [
        { productName: { contains: query } },
        { genericName: { contains: query } },
        { companyName: { contains: query } },
        { shopName: { contains: query } },
      ];
    }

    const items = await this.prisma.pharmaTrackShortList.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return items.map((i) => ({
      id: i.id,
      orderId: i.orderId,
      orderNumber: i.orderNumber,
      productId: i.productId,
      productName: i.productName,
      genericName: i.genericName,
      companyName: i.companyName,
      requestedQuantity: i.requestedQuantity,
      unitType: i.unitType,
      shopId: i.shopId,
      shopName: i.shopName,
      shopPhone: i.shopPhone,
      reportedByStaffId: i.reportedByStaffId,
      reportedByStaffName: i.reportedByStaffName,
      status: i.status as ShortListStatus,
      createdAt: i.createdAt.toISOString(),
    }));
  }

  async exportPharmaTrackShortListCsv(): Promise<string> {
    const items = await this.getPharmaTrackShortList();
    const headers = [
      'ID',
      'Order Number',
      'Product Name',
      'Generic Name',
      'Manufacturer',
      'Requested Qty',
      'Unit Type',
      'Shop Name',
      'Phone',
      'Reported By Staff',
      'Status',
      'Date Reported',
    ];

    const rows = items.map((i) => [
      i.id,
      i.orderNumber || 'N/A',
      `"${i.productName.replace(/"/g, '""')}"`,
      `"${i.genericName.replace(/"/g, '""')}"`,
      `"${i.companyName.replace(/"/g, '""')}"`,
      i.requestedQuantity,
      i.unitType,
      `"${i.shopName.replace(/"/g, '""')}"`,
      i.shopPhone || '',
      i.reportedByStaffName || '',
      i.status,
      i.createdAt,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  // ---------------------------------------------------------------------------
  // 10. Customer Ranking Dashboard & 1-Click Upgrade to Wholesaler (Requirement 18)
  // ---------------------------------------------------------------------------
  async getCustomerRankings(): Promise<CustomerRankingItem[]> {
    const customers = await this.prisma.customerProfile.findMany({
      include: {
        user: {
          include: {
            orders: {
              where: { platformStatus: 'COMPLETE_SALE' },
            },
          },
        },
        tier: true,
      },
    });

    const rankings: CustomerRankingItem[] = customers.map((profile) => {
      const completedOrders = profile.user.orders || [];
      const monthlySales = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      return {
        customerId: profile.userId,
        shopName: profile.shopName,
        ownerName: profile.ownerName,
        phone: profile.user.phone || '',
        accountType: profile.user.accountType as AccountType,
        tierId: profile.tierId,
        tierName: profile.tier.name,
        monthlySalesVolume: PricingEngine.roundToTwoDecimals(monthlySales),
        totalOrdersCount: completedOrders.length,
        cancellationCount: profile.cancellationCount,
        refusalCount: profile.refusalCount,
        isProblemCustomer: profile.isProblemCustomer,
        problemFlagReason: profile.problemFlagReason,
        eligibleForWholesaleUpgrade:
          profile.user.accountType === AccountType.PAIKARI_SELLER && monthlySales >= 100000,
      };
    });

    return rankings.sort((a, b) => b.monthlySalesVolume - a.monthlySalesVolume);
  }

  async upgradeCustomerToWholesaler(
    customerId: string,
    adminId: string,
  ): Promise<{ success: boolean; message: string }> {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Admin user not found');

    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      include: { customerProfile: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const wholesaleTier = await this.prisma.pricingTier.findFirst({
      where: { code: 'TIER_A' },
    });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: customerId },
        data: { accountType: AccountType.WHOLESALER_SELLER },
      }),
      this.prisma.customerProfile.update({
        where: { userId: customerId },
        data: {
          tierId: wholesaleTier ? wholesaleTier.id : customer.customerProfile?.tierId!,
          creditLimit: Math.max(100000, customer.customerProfile?.creditLimit || 0),
        },
      }),
    ]);

    await this.auditService.log({
      actorId: admin.id,
      actorEmail: admin.email,
      action: AuditAction.CUSTOMER_PROMOTED_TO_WHOLESALE,
      entityType: 'User',
      entityId: customerId,
      beforeData: { accountType: customer.accountType },
      afterData: { accountType: AccountType.WHOLESALER_SELLER, tierCode: 'TIER_A' },
    });

    this.eventsGateway.broadcastTierUpdate(customerId, {
      accountType: AccountType.WHOLESALER_SELLER,
      tierCode: 'TIER_A',
    });

    return {
      success: true,
      message: `${customer.name} (${customer.customerProfile?.shopName}) upgraded to Wholesaler with Tier A pricing!`,
    };
  }

  // ---------------------------------------------------------------------------
  // 11. Platform Settings & Configurable Thresholds
  // ---------------------------------------------------------------------------
  async getPlatformSettings(): Promise<PlatformSettingsDto> {
    const settings = await this.prisma.platformSetting.findMany();
    const map = new Map(settings.map((s) => [s.key, s.value]));

    let bankAccount = {
      bankName: 'Islami Bank Bangladesh Ltd.',
      accountName: "Siam's Aqua Pharmaceutical Distribution",
      accountNumber: '20501234567890',
      branchName: 'Mirpur Branch, Dhaka',
      routingNumber: '125263748',
    };

    if (map.has('bank_account_info')) {
      try {
        bankAccount = JSON.parse(map.get('bank_account_info')!);
      } catch (e) {}
    }

    return {
      problemCustomerThreshold: parseInt(map.get('problem_customer_threshold') || '3', 10),
      defaultDeliveryFee: parseFloat(map.get('default_delivery_fee') || '60'),
      defaultFreeDeliveryThreshold: parseFloat(map.get('default_free_delivery_threshold') || '3000'),
      bankAccountDetails: bankAccount,
      bkashMerchantNumber: map.get('bkash_merchant_number') || '01700000001',
    };
  }

  async updatePlatformSettings(dto: Partial<PlatformSettingsDto>, adminId: string) {
    if (dto.problemCustomerThreshold !== undefined) {
      await this.prisma.platformSetting.upsert({
        where: { key: 'problem_customer_threshold' },
        create: {
          key: 'problem_customer_threshold',
          value: String(dto.problemCustomerThreshold),
          description: 'Problem customer cancellation/refusal strike threshold',
          updatedBy: adminId,
        },
        update: {
          value: String(dto.problemCustomerThreshold),
          updatedBy: adminId,
        },
      });
    }

    if (dto.defaultDeliveryFee !== undefined) {
      await this.prisma.platformSetting.upsert({
        where: { key: 'default_delivery_fee' },
        create: {
          key: 'default_delivery_fee',
          value: String(dto.defaultDeliveryFee),
          updatedBy: adminId,
        },
        update: {
          value: String(dto.defaultDeliveryFee),
          updatedBy: adminId,
        },
      });
    }

    if (dto.defaultFreeDeliveryThreshold !== undefined) {
      await this.prisma.platformSetting.upsert({
        where: { key: 'default_free_delivery_threshold' },
        create: {
          key: 'default_free_delivery_threshold',
          value: String(dto.defaultFreeDeliveryThreshold),
          updatedBy: adminId,
        },
        update: {
          value: String(dto.defaultFreeDeliveryThreshold),
          updatedBy: adminId,
        },
      });
    }

    return this.getPlatformSettings();
  }

  // ---------------------------------------------------------------------------
  // 12. Helpers & Mapping
  // ---------------------------------------------------------------------------
  async getOrderById(orderId: string, actorId: string, accountType: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { include: { company: true } } } },
        user: { include: { customerProfile: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (
      accountType !== AccountType.SUPER_ADMIN &&
      accountType !== AccountType.STAFF &&
      order.userId !== actorId
    ) {
      throw new ForbiddenException('Access denied to this order');
    }

    return this.mapOrderToResponse(order);
  }

  async listOrders(filters: {
    userId?: string;
    fulfillmentStatus?: FulfillmentStatus;
    memoState?: MemoState;
  }): Promise<OrderResponse[]> {
    const where: any = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.fulfillmentStatus) where.fulfillmentStatus = filters.fulfillmentStatus;
    if (filters.memoState) where.memoState = filters.memoState;

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: { include: { company: true } } } },
        user: { include: { customerProfile: true } },
      },
    });

    return orders.map((o) => this.mapOrderToResponse(o));
  }

  private mapOrderToResponse(order: any): OrderResponse {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      customerName: order.user?.name || '',
      shopName: order.user?.customerProfile?.shopName || order.user?.name || '',
      customerPhone: order.user?.phone || '',
      sectorType: order.sectorType as SectorType,
      platformStatus: order.platformStatus,
      fulfillmentStatus: order.fulfillmentStatus as FulfillmentStatus,
      memoState: order.memoState as MemoState,
      isFinalMemoPublished: order.isFinalMemoPublished,
      preliminarySubtotal: order.preliminarySubtotal,
      finalSubtotal: order.finalSubtotal,
      deliveryFee: order.deliveryFee,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      fulfillmentMethod: order.fulfillmentMethod as FulfillmentMethod,
      pickupPersonName: order.pickupPersonName,
      pickupPersonPhone: order.pickupPersonPhone,
      deliveryAddress: order.deliveryAddress,
      isTodayDelivery: order.isTodayDelivery,
      paymentMethod: order.paymentMethod as PaymentMethod,
      paymentStatus: order.paymentStatus as PaymentStatus,
      lastUpdatedByStaff: order.lastUpdatedByStaff,
      lastUpdatedByStaffName: order.lastUpdatedByStaffName,
      cancellationState: order.cancellationState as CancellationState,
      cancellationReason: order.cancellationReason,
      cancellationRequestedAt: order.cancellationRequestedAt?.toISOString(),
      orderNotes: order.orderNotes,
      voiceNoteUrl: order.voiceNoteUrl,
      prescriptionUrl: order.prescriptionUrl,
      placedByStaffId: order.placedByStaffId,
      placedByStaffName: order.placedByStaffName,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map((i: any) => ({
        id: i.id,
        orderId: i.orderId,
        productId: i.productId,
        productName: i.product?.name || '',
        genericName: i.product?.genericName || '',
        companyName: i.product?.company?.name || '',
        dosageForm: i.product?.dosageForm || '',
        strength: i.product?.strength || '',
        unitType: i.unitType,
        requestedQuantity: i.requestedQuantity,
        confirmedQuantity: i.confirmedQuantity,
        verificationStatus: i.verificationStatus,
        isOfferPara: i.isOfferPara,
        unitMrp: i.unitMrp,
        tieredUnitPrice: i.tieredUnitPrice,
        finalUnitPrice: i.finalUnitPrice,
        manualPriceOverrideByStaff: i.manualPriceOverrideByStaff,
        appliedLayer: i.appliedLayer,
        totalPrice: i.totalPrice,
        fulfilledByStaffId: i.fulfilledByStaffId,
        fulfilledByStaffName: i.fulfilledByStaffName,
        fulfilledAt: i.fulfilledAt?.toISOString(),
      })),
    };
  }
}
