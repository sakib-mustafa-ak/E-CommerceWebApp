import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';
import {
  RestaurantCreateDto,
  RestaurantUpdateDto,
  MenuCategoryDto,
  MenuItemCreateDto,
  MenuItemUpdateDto,
  FoodOrderCreateDto,
  FoodOrderStatusUpdateDto,
  FoodFulfillmentType,
  FoodOrderStatus,
  RestaurantDetailResponse,
  MenuCategoryResponse,
  MenuItemResponse,
  FoodOrderResponse,
  RestaurantLedgerResponse,
  AuditAction,
} from '@siam-aqua/shared-types';

@Injectable()
export class FoodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ----------------------------------------------------
  // 1. RESTAURANT ONBOARDING & MANAGEMENT
  // ----------------------------------------------------

  async applyForRestaurant(
    vendorUserId: string,
    dto: RestaurantCreateDto,
  ): Promise<RestaurantDetailResponse> {
    const existing = await this.prisma.restaurant.findUnique({
      where: { vendorUserId },
    });
    if (existing) {
      throw new BadRequestException('User already has a registered restaurant profile.');
    }

    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

    const restaurant = await this.prisma.restaurant.create({
      data: {
        vendorUserId,
        name: dto.name,
        slug,
        description: dto.description || null,
        area: dto.area,
        address: dto.address,
        phone: dto.phone,
        bannerImageUrl: dto.bannerImageUrl || null,
        logoUrl: dto.logoUrl || null,
        cuisines: JSON.stringify(dto.cuisines || ['Bangladeshi']),
        commissionRate: dto.commissionRate ?? 0.15,
        deliveryFee: dto.deliveryFee ?? 60.0,
        isPlatformDelivery: dto.isPlatformDelivery ?? true,
        isOpen: true,
        isApproved: false,
      },
      include: {
        categories: { include: { menuItems: true } },
      },
    });

    await this.auditService.log({
      action: AuditAction.FOOD_VENDOR_REGISTERED,
      actorId: vendorUserId,
      entityId: restaurant.id,
      entityType: 'Restaurant',
      afterData: { name: restaurant.name, area: restaurant.area },
    });

    return this.mapRestaurantToDetail(restaurant);
  }

  async approveRestaurant(
    staffId: string,
    restaurantId: string,
    commissionRate?: number,
  ): Promise<RestaurantDetailResponse> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID "${restaurantId}" not found.`);
    }

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        approvedByStaffId: staffId,
        commissionRate: commissionRate !== undefined ? commissionRate : restaurant.commissionRate,
      },
      include: {
        categories: { include: { menuItems: true } },
      },
    });

    await this.auditService.log({
      action: AuditAction.FOOD_VENDOR_APPROVED,
      actorId: staffId,
      entityId: restaurant.id,
      entityType: 'Restaurant',
      afterData: { commissionRate: updated.commissionRate },
    });

    return this.mapRestaurantToDetail(updated);
  }

  async updateRestaurant(
    userId: string,
    isStaff: boolean,
    restaurantId: string,
    dto: RestaurantUpdateDto,
  ): Promise<RestaurantDetailResponse> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID "${restaurantId}" not found.`);
    }

    if (!isStaff && restaurant.vendorUserId !== userId) {
      throw new ForbiddenException('You are not authorized to edit this restaurant.');
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.area !== undefined) updateData.area = dto.area;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.bannerImageUrl !== undefined) updateData.bannerImageUrl = dto.bannerImageUrl;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
    if (dto.cuisines !== undefined) updateData.cuisines = JSON.stringify(dto.cuisines);
    if (dto.deliveryFee !== undefined) updateData.deliveryFee = dto.deliveryFee;
    if (dto.isPlatformDelivery !== undefined) updateData.isPlatformDelivery = dto.isPlatformDelivery;
    if (dto.isOpen !== undefined) updateData.isOpen = dto.isOpen;
    if (isStaff && dto.commissionRate !== undefined) updateData.commissionRate = dto.commissionRate;

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: updateData,
      include: {
        categories: { include: { menuItems: true } },
      },
    });

    return this.mapRestaurantToDetail(updated);
  }

  // ----------------------------------------------------
  // 2. RESTAURANT BROWSING (LOCATION & CUISINE FILTERS)
  // ----------------------------------------------------

  async getPublicRestaurants(params?: {
    area?: string;
    cuisine?: string;
    search?: string;
  }): Promise<RestaurantDetailResponse[]> {
    const where: any = {
      isApproved: true,
    };

    if (params?.area && params.area !== 'ALL') {
      where.area = params.area;
    }

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search } },
        { description: { contains: params.search } },
        { address: { contains: params.search } },
      ];
    }

    const restaurants = await this.prisma.restaurant.findMany({
      where,
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            menuItems: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { isOpen: 'desc' },
    });

    let result = restaurants.map((r) => this.mapRestaurantToDetail(r));

    if (params?.cuisine && params.cuisine !== 'ALL') {
      const targetCuisine = params.cuisine.toLowerCase();
      result = result.filter((r) =>
        r.cuisines.some((c) => c.toLowerCase().includes(targetCuisine)),
      );
    }

    return result;
  }

  async getAllRestaurantsAdmin(): Promise<RestaurantDetailResponse[]> {
    const restaurants = await this.prisma.restaurant.findMany({
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: { menuItems: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return restaurants.map((r) => this.mapRestaurantToDetail(r));
  }

  async getRestaurantBySlug(slug: string): Promise<RestaurantDetailResponse> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            menuItems: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
    if (!restaurant) {
      throw new NotFoundException(`Restaurant "${slug}" not found.`);
    }
    return this.mapRestaurantToDetail(restaurant);
  }

  async getRestaurantByVendorUser(vendorUserId: string): Promise<RestaurantDetailResponse> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { vendorUserId },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            menuItems: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
    if (!restaurant) {
      throw new NotFoundException('No restaurant profile found for this vendor user.');
    }
    return this.mapRestaurantToDetail(restaurant);
  }

  // ----------------------------------------------------
  // 3. MENU CATEGORIES & ITEMS (WITH 86'd AVAILABILITY)
  // ----------------------------------------------------

  async createCategory(vendorUserId: string, dto: MenuCategoryDto): Promise<MenuCategoryResponse> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { vendorUserId },
    });
    if (!restaurant) {
      throw new NotFoundException('No restaurant found for this vendor.');
    }

    const category = await this.prisma.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        name: dto.name,
        description: dto.description || null,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { menuItems: true },
    });

    return this.mapCategoryToResponse(category);
  }

  async createMenuItem(vendorUserId: string, dto: MenuItemCreateDto): Promise<MenuItemResponse> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { vendorUserId },
    });
    if (!restaurant) {
      throw new NotFoundException('No restaurant found for this vendor.');
    }

    const category = await this.prisma.menuCategory.findFirst({
      where: { id: dto.categoryId, restaurantId: restaurant.id },
    });
    if (!category) {
      throw new BadRequestException('Category does not belong to your restaurant.');
    }

    const item = await this.prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description || null,
        priceBdt: dto.priceBdt,
        imageUrl: dto.imageUrl || null,
        isAvailable: dto.isAvailable ?? true,
        isVegetarian: dto.isVegetarian ?? false,
        preparationTimeMinutes: dto.preparationTimeMinutes ?? 20,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.auditService.log({
      action: AuditAction.FOOD_ITEM_CREATED,
      actorId: vendorUserId,
      entityId: item.id,
      entityType: 'MenuItem',
      afterData: { name: item.name, priceBdt: item.priceBdt },
    });

    return this.mapItemToResponse(item);
  }

  async updateMenuItem(
    vendorUserId: string,
    itemId: string,
    dto: MenuItemUpdateDto,
  ): Promise<MenuItemResponse> {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { restaurant: true },
    });
    if (!item) {
      throw new NotFoundException(`Menu item "${itemId}" not found.`);
    }
    if (item.restaurant.vendorUserId !== vendorUserId) {
      throw new ForbiddenException('You do not own this menu item.');
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priceBdt !== undefined) updateData.priceBdt = dto.priceBdt;
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl;
    if (dto.isAvailable !== undefined) updateData.isAvailable = dto.isAvailable;
    if (dto.isVegetarian !== undefined) updateData.isVegetarian = dto.isVegetarian;
    if (dto.preparationTimeMinutes !== undefined)
      updateData.preparationTimeMinutes = dto.preparationTimeMinutes;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;

    const updated = await this.prisma.menuItem.update({
      where: { id: itemId },
      data: updateData,
    });

    if (dto.isAvailable === false && item.isAvailable === true) {
      await this.auditService.log({
        action: AuditAction.FOOD_ITEM_86ED,
        actorId: vendorUserId,
        entityId: item.id,
        entityType: 'MenuItem',
        afterData: { isAvailable: false },
      });
    }

    return this.mapItemToResponse(updated);
  }

  async toggleMenuItemAvailability(
    vendorUserId: string,
    itemId: string,
    isAvailable: boolean,
  ): Promise<MenuItemResponse> {
    return this.updateMenuItem(vendorUserId, itemId, { isAvailable });
  }

  // ----------------------------------------------------
  // 4. FOOD ORDER CHECKOUT & FULFILLMENT MODES
  // ----------------------------------------------------

  async placeOrder(
    userId: string | undefined,
    dto: FoodOrderCreateDto,
  ): Promise<FoodOrderResponse> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item.');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found.');
    }
    if (!restaurant.isApproved) {
      throw new BadRequestException('Restaurant is not yet approved for orders.');
    }
    if (!restaurant.isOpen) {
      throw new BadRequestException('Restaurant is currently closed and not accepting orders.');
    }

    // Validate fulfillment type
    if (
      dto.fulfillmentType === FoodFulfillmentType.HOME_DELIVERY &&
      (!dto.deliveryAddress || !dto.deliveryAddress.trim())
    ) {
      throw new BadRequestException('Delivery address is required for Home Delivery.');
    }

    // Fetch and validate all items
    const itemIds = dto.items.map((i) => i.menuItemId);
    const dbItems = await this.prisma.menuItem.findMany({
      where: {
        id: { in: itemIds },
        restaurantId: restaurant.id,
      },
    });

    if (dbItems.length !== itemIds.length) {
      throw new BadRequestException('One or more items do not belong to this restaurant.');
    }

    // Check for 86'd items
    const unavailableItems = dbItems.filter((item) => !item.isAvailable);
    if (unavailableItems.length > 0) {
      const names = unavailableItems.map((i) => i.name).join(', ');
      throw new BadRequestException(
        `The following items are currently sold out (86'd): ${names}. Please remove them to proceed.`,
      );
    }

    const itemMap = new Map(dbItems.map((i) => [i.id, i]));
    let subtotal = 0;
    let maxPrepTime = 20;

    const orderItemsData = dto.items.map((input) => {
      const dbItem = itemMap.get(input.menuItemId)!;
      const quantity = Math.max(1, input.quantity);
      const lineTotal = dbItem.priceBdt * quantity;
      subtotal += lineTotal;
      if (dbItem.preparationTimeMinutes > maxPrepTime) {
        maxPrepTime = dbItem.preparationTimeMinutes;
      }
      return {
        menuItemId: dbItem.id,
        itemName: dbItem.name,
        unitPriceBdt: dbItem.priceBdt,
        quantity,
        totalPriceBdt: lineTotal,
        specialNotes: input.specialNotes || null,
      };
    });

    // Delivery fee calculation
    const deliveryFee =
      dto.fulfillmentType === FoodFulfillmentType.HOME_DELIVERY ? restaurant.deliveryFee : 0.0;
    const totalAmount = subtotal + deliveryFee;

    // Large-Order Deposit Rule (Orders >= 2000 BDT require advance deposit)
    let depositRequired = 0.0;
    let depositPaid = 0.0;
    let paymentStatus = 'PENDING';

    if (totalAmount >= 2000) {
      depositRequired = Math.ceil(totalAmount * 0.3); // 30% advance deposit required
    }

    if (['BKASH', 'NAGAD', 'CARD'].includes(dto.paymentMethod.toUpperCase())) {
      paymentStatus = 'PAID';
      depositPaid = totalAmount;
    }

    // Commission calculations
    const commissionRate = restaurant.commissionRate;
    const commissionAmount = Math.round(subtotal * commissionRate * 100) / 100;
    const netVendorEarnings = Math.round((subtotal - commissionAmount) * 100) / 100;

    // Generate Order Number
    const count = await this.prisma.foodOrder.count();
    const orderNumber = `ORD-FOOD-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const order = await this.prisma.foodOrder.create({
      data: {
        orderNumber,
        restaurantId: restaurant.id,
        userId: userId || null,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail || null,
        fulfillmentType: dto.fulfillmentType,
        deliveryArea: dto.deliveryArea || restaurant.area,
        deliveryAddress: dto.deliveryAddress || null,
        subtotalBdt: subtotal,
        deliveryFeeBdt: deliveryFee,
        totalAmountBdt: totalAmount,
        depositRequiredBdt: depositRequired,
        depositPaidBdt: depositPaid,
        paymentMethod: dto.paymentMethod.toUpperCase(),
        paymentStatus,
        orderStatus: FoodOrderStatus.PENDING,
        cookingMinutesEstimated: maxPrepTime,
        specialInstructions: dto.specialInstructions || null,
        commissionRate,
        commissionAmountBdt: commissionAmount,
        netVendorEarningsBdt: netVendorEarnings,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        restaurant: true,
        items: true,
      },
    });

    // Broadcast order to vendor room
    try {
      if (this.eventsGateway?.server) {
        this.eventsGateway.server
          .to(`vendor:${restaurant.vendorUserId}`)
          .emit('food_order:created', this.mapOrderToResponse(order));
      }
    } catch (e) {
      // Non-blocking socket error
    }

    await this.auditService.log({
      action: AuditAction.FOOD_ORDER_CREATED,
      actorId: userId || undefined,
      entityId: order.id,
      entityType: 'FoodOrder',
      afterData: { orderNumber, totalAmount, fulfillmentType: dto.fulfillmentType },
    });

    return this.mapOrderToResponse(order);
  }

  // ----------------------------------------------------
  // 5. ORDER STATUS LIFECYCLE & COOKING COUNTDOWN
  // ----------------------------------------------------

  async updateOrderStatus(
    userId: string,
    isStaff: boolean,
    orderId: string,
    dto: FoodOrderStatusUpdateDto,
  ): Promise<FoodOrderResponse> {
    const order = await this.prisma.foodOrder.findUnique({
      where: { id: orderId },
      include: { restaurant: true, items: true },
    });
    if (!order) {
      throw new NotFoundException(`Food order "${orderId}" not found.`);
    }

    if (!isStaff && order.restaurant.vendorUserId !== userId) {
      throw new ForbiddenException('You are not authorized to update this order.');
    }

    const updateData: any = {
      orderStatus: dto.status,
    };

    if (dto.status === FoodOrderStatus.COOKING) {
      const minutes = dto.cookingMinutes || order.cookingMinutesEstimated || 25;
      const startedAt = new Date();
      const targetAt = new Date(startedAt.getTime() + minutes * 60 * 1000);

      updateData.cookingMinutesEstimated = minutes;
      updateData.cookingStartedAt = startedAt;
      updateData.cookingTargetAt = targetAt;

      await this.auditService.log({
        action: AuditAction.FOOD_ORDER_COOKING_STARTED,
        actorId: userId,
        entityId: order.id,
        entityType: 'FoodOrder',
        afterData: { cookingMinutesEstimated: minutes },
      });
    } else if (dto.status === FoodOrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
      updateData.paymentStatus = 'PAID';
    } else if (dto.status === FoodOrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = dto.cancellationReason || 'Cancelled by vendor';
    }

    const updated = await this.prisma.foodOrder.update({
      where: { id: orderId },
      data: updateData,
      include: { restaurant: true, items: true },
    });

    // Real-time status broadcast
    try {
      if (this.eventsGateway?.server) {
        const response = this.mapOrderToResponse(updated);
        this.eventsGateway.server.to(`food_order:${orderId}`).emit('food_order:status_updated', response);
        this.eventsGateway.server
          .to(`vendor:${order.restaurant.vendorUserId}`)
          .emit('food_order:status_updated', response);
      }
    } catch (e) {
      // Non-blocking socket error
    }

    await this.auditService.log({
      action: AuditAction.FOOD_ORDER_STATUS_CHANGED,
      actorId: userId,
      entityId: order.id,
      entityType: 'FoodOrder',
      afterData: { status: dto.status },
    });

    return this.mapOrderToResponse(updated);
  }

  // ----------------------------------------------------
  // 6. ORDER RETRIEVAL & VENDOR DASHBOARD
  // ----------------------------------------------------

  async getOrderById(orderId: string): Promise<FoodOrderResponse> {
    const order = await this.prisma.foodOrder.findUnique({
      where: { id: orderId },
      include: { restaurant: true, items: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found.`);
    }
    return this.mapOrderToResponse(order);
  }

  async getOrderByOrderNumber(orderNumber: string): Promise<FoodOrderResponse> {
    const order = await this.prisma.foodOrder.findUnique({
      where: { orderNumber },
      include: { restaurant: true, items: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with number "${orderNumber}" not found.`);
    }
    return this.mapOrderToResponse(order);
  }

  async getVendorOrders(
    vendorUserId: string,
    status?: FoodOrderStatus,
  ): Promise<FoodOrderResponse[]> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { vendorUserId },
    });
    if (!restaurant) {
      throw new NotFoundException('No restaurant found for this vendor.');
    }

    const where: any = { restaurantId: restaurant.id };
    if (status) {
      where.orderStatus = status;
    }

    const orders = await this.prisma.foodOrder.findMany({
      where,
      include: { restaurant: true, items: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => this.mapOrderToResponse(o));
  }

  async getUserOrders(userId: string): Promise<FoodOrderResponse[]> {
    const orders = await this.prisma.foodOrder.findMany({
      where: { userId },
      include: { restaurant: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.mapOrderToResponse(o));
  }

  // ----------------------------------------------------
  // 7. VENDOR FINANCIAL & COMMISSION LEDGER
  // ----------------------------------------------------

  async getRestaurantLedger(vendorUserId: string): Promise<RestaurantLedgerResponse> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { vendorUserId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found for this vendor.');
    }

    const orders = await this.prisma.foodOrder.findMany({
      where: {
        restaurantId: restaurant.id,
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter((o) => o.orderStatus === FoodOrderStatus.DELIVERED);
    const grossSalesBdt = deliveredOrders.reduce((sum, o) => sum + o.subtotalBdt, 0);
    const platformCommissionBdt = deliveredOrders.reduce(
      (sum, o) => sum + o.commissionAmountBdt,
      0,
    );
    const netVendorPayoutBdt = deliveredOrders.reduce(
      (sum, o) => sum + o.netVendorEarningsBdt,
      0,
    );

    return {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      commissionRate: restaurant.commissionRate,
      totalOrdersCount: totalOrders,
      deliveredOrdersCount: deliveredOrders.length,
      grossSalesBdt: Math.round(grossSalesBdt * 100) / 100,
      platformCommissionBdt: Math.round(platformCommissionBdt * 100) / 100,
      netVendorPayoutBdt: Math.round(netVendorPayoutBdt * 100) / 100,
      recentOrders: orders.slice(0, 10).map((o) => this.mapOrderToResponse(o)),
    };
  }

  // ----------------------------------------------------
  // HELPER MAPPERS
  // ----------------------------------------------------

  private mapRestaurantToDetail(r: any): RestaurantDetailResponse {
    let cuisines: string[] = [];
    try {
      cuisines = typeof r.cuisines === 'string' ? JSON.parse(r.cuisines) : r.cuisines || [];
    } catch {
      cuisines = [r.cuisines || 'General'];
    }

    return {
      id: r.id,
      vendorUserId: r.vendorUserId,
      name: r.name,
      slug: r.slug,
      description: r.description,
      area: r.area,
      address: r.address,
      phone: r.phone,
      bannerImageUrl: r.bannerImageUrl,
      logoUrl: r.logoUrl,
      cuisines,
      commissionRate: r.commissionRate,
      deliveryFee: r.deliveryFee,
      isPlatformDelivery: r.isPlatformDelivery,
      isOpen: r.isOpen,
      isApproved: r.isApproved,
      createdAt: r.createdAt?.toISOString?.() || r.createdAt,
      categories: (r.categories || []).map((c: any) => this.mapCategoryToResponse(c)),
    };
  }

  private mapCategoryToResponse(c: any): MenuCategoryResponse {
    return {
      id: c.id,
      restaurantId: c.restaurantId,
      name: c.name,
      description: c.description,
      sortOrder: c.sortOrder,
      menuItems: (c.menuItems || []).map((i: any) => this.mapItemToResponse(i)),
    };
  }

  private mapItemToResponse(i: any): MenuItemResponse {
    return {
      id: i.id,
      restaurantId: i.restaurantId,
      categoryId: i.categoryId,
      name: i.name,
      description: i.description,
      priceBdt: i.priceBdt,
      imageUrl: i.imageUrl,
      isAvailable: i.isAvailable,
      isVegetarian: i.isVegetarian,
      preparationTimeMinutes: i.preparationTimeMinutes,
      sortOrder: i.sortOrder,
      createdAt: i.createdAt?.toISOString?.() || i.createdAt,
    };
  }

  private mapOrderToResponse(o: any): FoodOrderResponse {
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      restaurantId: o.restaurantId,
      restaurantName: o.restaurant?.name || 'Restaurant',
      restaurantPhone: o.restaurant?.phone || '',
      restaurantAddress: o.restaurant?.address || '',
      userId: o.userId,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      customerEmail: o.customerEmail,
      fulfillmentType: o.fulfillmentType as FoodFulfillmentType,
      deliveryArea: o.deliveryArea,
      deliveryAddress: o.deliveryAddress,
      subtotalBdt: o.subtotalBdt,
      deliveryFeeBdt: o.deliveryFeeBdt,
      totalAmountBdt: o.totalAmountBdt,
      depositRequiredBdt: o.depositRequiredBdt,
      depositPaidBdt: o.depositPaidBdt,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus as FoodOrderStatus,
      cookingMinutesEstimated: o.cookingMinutesEstimated,
      cookingStartedAt: o.cookingStartedAt?.toISOString?.() || o.cookingStartedAt,
      cookingTargetAt: o.cookingTargetAt?.toISOString?.() || o.cookingTargetAt,
      specialInstructions: o.specialInstructions,
      commissionRate: o.commissionRate,
      commissionAmountBdt: o.commissionAmountBdt,
      netVendorEarningsBdt: o.netVendorEarningsBdt,
      deliveredAt: o.deliveredAt?.toISOString?.() || o.deliveredAt,
      cancelledAt: o.cancelledAt?.toISOString?.() || o.cancelledAt,
      cancellationReason: o.cancellationReason,
      createdAt: o.createdAt?.toISOString?.() || o.createdAt,
      items: (o.items || []).map((it: any) => ({
        id: it.id,
        menuItemId: it.menuItemId,
        itemName: it.itemName,
        unitPriceBdt: it.unitPriceBdt,
        quantity: it.quantity,
        totalPriceBdt: it.totalPriceBdt,
        specialNotes: it.specialNotes,
      })),
    };
  }
}
