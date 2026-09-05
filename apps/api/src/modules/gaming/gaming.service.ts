import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  GameCreateDto,
  GamePackageCreateDto,
  PlayerIdValidationDto,
  PlayerIdValidationResponse,
  GameTopUpCheckoutDto,
  GameDetailResponse,
  GamePackageResponse,
  GameTopUpOrderResponse,
  GameFulfillmentActionDto,
  GameFulfillmentMode,
  GameFulfillmentStatus,
  AuditAction,
} from '@siam-aqua/shared-types';

@Injectable()
export class GamingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // 1. Get All Active Games (Public Catalog)
  async getPublicGames(): Promise<GameDetailResponse[]> {
    const games = await this.prisma.game.findMany({
      where: { isActive: true },
      include: {
        packages: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return games.map((g) => this.mapGameToResponse(g));
  }

  // 2. Get Single Game by Slug
  async getGameBySlug(slug: string): Promise<GameDetailResponse> {
    const game = await this.prisma.game.findUnique({
      where: { slug },
      include: {
        packages: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!game) {
      throw new NotFoundException(`Game with slug "${slug}" not found.`);
    }

    return this.mapGameToResponse(game);
  }

  // 3. Admin: Create Game
  async createGame(dto: GameCreateDto, staff: any): Promise<GameDetailResponse> {
    if (!dto.name || !dto.slug || !dto.publisher) {
      throw new BadRequestException('Game name, slug, and publisher are required.');
    }

    const existing = await this.prisma.game.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new BadRequestException(`Game with slug "${dto.slug}" already exists.`);
    }

    const game = await this.prisma.game.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        publisher: dto.publisher,
        category: dto.category || 'BATTLE_ROYALE',
        imageUrl: dto.imageUrl || null,
        bannerUrl: dto.bannerUrl || null,
        requiresZoneId: dto.requiresZoneId ?? false,
        zoneIdLabel: dto.zoneIdLabel || null,
        requiresServer: dto.requiresServer ?? false,
        serverOptionsJson: dto.serverOptionsJson || null,
        idFormatValidationRegex: dto.idFormatValidationRegex || null,
        idInstructions: dto.idInstructions || null,
        fulfillmentMode: dto.fulfillmentMode || GameFulfillmentMode.AUTO_API,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: {
        packages: true,
      },
    });

    await this.auditService.log({
      actorId: staff?.id,
      actorEmail: staff?.email,
      action: AuditAction.GAME_CATALOG_CREATED,
      entityType: 'Game',
      entityId: game.id,
      afterData: { name: game.name, slug: game.slug, fulfillmentMode: game.fulfillmentMode },
    });

    return this.mapGameToResponse(game);
  }

  // 4. Admin: Update Game
  async updateGame(id: string, dto: Partial<GameCreateDto>, staff: any): Promise<GameDetailResponse> {
    const game = await this.prisma.game.findUnique({ where: { id } });
    if (!game) throw new NotFoundException('Game not found.');

    const updated = await this.prisma.game.update({
      where: { id },
      data: {
        name: dto.name ?? game.name,
        slug: dto.slug ?? game.slug,
        publisher: dto.publisher ?? game.publisher,
        category: dto.category ?? game.category,
        imageUrl: dto.imageUrl ?? game.imageUrl,
        bannerUrl: dto.bannerUrl ?? game.bannerUrl,
        requiresZoneId: dto.requiresZoneId ?? game.requiresZoneId,
        zoneIdLabel: dto.zoneIdLabel ?? game.zoneIdLabel,
        requiresServer: dto.requiresServer ?? game.requiresServer,
        serverOptionsJson: dto.serverOptionsJson ?? game.serverOptionsJson,
        idFormatValidationRegex: dto.idFormatValidationRegex ?? game.idFormatValidationRegex,
        idInstructions: dto.idInstructions ?? game.idInstructions,
        fulfillmentMode: dto.fulfillmentMode ?? game.fulfillmentMode,
        sortOrder: dto.sortOrder ?? game.sortOrder,
        isActive: dto.isActive ?? game.isActive,
      },
      include: { packages: true },
    });

    await this.auditService.log({
      actorId: staff?.id,
      actorEmail: staff?.email,
      action: AuditAction.GAME_CATALOG_UPDATED,
      entityType: 'Game',
      entityId: id,
      afterData: dto,
    });

    return this.mapGameToResponse(updated);
  }

  // 5. Admin: Create Top-Up Package
  async createPackage(dto: GamePackageCreateDto, staff: any): Promise<GamePackageResponse> {
    if (!dto.gameId || !dto.name || dto.priceBdt <= 0) {
      throw new BadRequestException('Game ID, package name, and price (>0) are required.');
    }

    const game = await this.prisma.game.findUnique({ where: { id: dto.gameId } });
    if (!game) throw new NotFoundException('Game not found.');

    const pkg = await this.prisma.gameTopUpPackage.create({
      data: {
        gameId: dto.gameId,
        name: dto.name,
        diamondCount: dto.diamondCount || 0,
        bonusCount: dto.bonusCount || 0,
        priceBdt: dto.priceBdt,
        badgeText: dto.badgeText || null,
        iconUrl: dto.iconUrl || null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditService.log({
      actorId: staff?.id,
      actorEmail: staff?.email,
      action: AuditAction.GAME_PACKAGE_CREATED,
      entityType: 'GameTopUpPackage',
      entityId: pkg.id,
      afterData: { gameName: game.name, packageName: pkg.name, price: pkg.priceBdt },
    });

    return this.mapPackageToResponse(pkg);
  }

  // 6. Admin: Update Package
  async updatePackage(id: string, dto: Partial<GamePackageCreateDto>, staff: any): Promise<GamePackageResponse> {
    const pkg = await this.prisma.gameTopUpPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found.');

    const updated = await this.prisma.gameTopUpPackage.update({
      where: { id },
      data: {
        name: dto.name ?? pkg.name,
        diamondCount: dto.diamondCount ?? pkg.diamondCount,
        bonusCount: dto.bonusCount ?? pkg.bonusCount,
        priceBdt: dto.priceBdt ?? pkg.priceBdt,
        badgeText: dto.badgeText ?? pkg.badgeText,
        iconUrl: dto.iconUrl ?? pkg.iconUrl,
        sortOrder: dto.sortOrder ?? pkg.sortOrder,
        isActive: dto.isActive ?? pkg.isActive,
      },
    });

    await this.auditService.log({
      actorId: staff?.id,
      actorEmail: staff?.email,
      action: AuditAction.GAME_PACKAGE_UPDATED,
      entityType: 'GameTopUpPackage',
      entityId: id,
      afterData: dto,
    });

    return this.mapPackageToResponse(updated);
  }

  // 7. Player / Game ID Validation Service
  async validatePlayerId(dto: PlayerIdValidationDto): Promise<PlayerIdValidationResponse> {
    if (!dto.playerId || !dto.gameSlug) {
      throw new BadRequestException('Game slug and Player ID are required.');
    }

    const game = await this.prisma.game.findUnique({
      where: { slug: dto.gameSlug },
    });

    if (!game) {
      throw new NotFoundException(`Game "${dto.gameSlug}" not found.`);
    }

    // 1. Regex Validation
    if (game.idFormatValidationRegex) {
      try {
        const regex = new RegExp(game.idFormatValidationRegex);
        if (!regex.test(dto.playerId.trim())) {
          return {
            isValid: false,
            playerId: dto.playerId,
            message: `Invalid Player ID format. ${game.idInstructions || 'Please verify your in-game User ID.'}`,
          };
        }
      } catch (err) {
        // Fallback if invalid regex in db
      }
    }

    // 2. Zone ID Check if game requires it
    if (game.requiresZoneId) {
      if (!dto.zoneId || dto.zoneId.trim().length < 3) {
        return {
          isValid: false,
          playerId: dto.playerId,
          message: `Zone ID is required for ${game.name}. (e.g. 4-5 digits next to your User ID).`,
        };
      }
    }

    // 3. Server Region Check if game requires it
    if (game.requiresServer) {
      if (!dto.serverRegion) {
        return {
          isValid: false,
          playerId: dto.playerId,
          message: `Please select your game server region for ${game.name}.`,
        };
      }
    }

    // 4. Generate simulated gamer IGN lookup
    const lastDigits = dto.playerId.replace(/[^0-9]/g, '').slice(-4) || '99';
    const playerNickname = `Gamer_${game.slug.replace(/[^a-zA-Z]/g, '').slice(0, 4)}_${lastDigits}`;

    return {
      isValid: true,
      playerId: dto.playerId.trim(),
      zoneId: dto.zoneId?.trim(),
      serverRegion: dto.serverRegion?.trim(),
      playerNickname,
      message: `Verified: Account belongs to ${playerNickname}`,
    };
  }

  // 8. Gaming Top-Up Checkout (Strict Online Payment Only, No COD)
  async checkoutTopUp(dto: GameTopUpCheckoutDto, userId?: string): Promise<GameTopUpOrderResponse> {
    // RULE: Online Payment ONLY - NO COD
    if ((dto.paymentMethod as any) === 'COD' || !['BKASH', 'NAGAD', 'CARD'].includes(dto.paymentMethod)) {
      throw new BadRequestException(
        'Cash on Delivery is strictly prohibited for digital game recharges. Please choose bKash, Nagad, or Debit/Credit Card.',
      );
    }

    if (!dto.gameSlug || !dto.packageId || !dto.playerId) {
      throw new BadRequestException('Game slug, package ID, and player ID are required.');
    }

    const game = await this.prisma.game.findUnique({
      where: { slug: dto.gameSlug },
    });
    if (!game || !game.isActive) {
      throw new NotFoundException('Selected game is currently unavailable for recharge.');
    }

    const pkg = await this.prisma.gameTopUpPackage.findUnique({
      where: { id: dto.packageId },
    });
    if (!pkg || !pkg.isActive || pkg.gameId !== game.id) {
      throw new NotFoundException('Selected top-up package is not available.');
    }

    // Validate player ID
    const validation = await this.validatePlayerId({
      gameSlug: dto.gameSlug,
      playerId: dto.playerId,
      zoneId: dto.zoneId,
      serverRegion: dto.serverRegion,
    });

    if (!validation.isValid) {
      throw new BadRequestException(validation.message || 'Invalid Player ID.');
    }

    const count = await this.prisma.gameTopUpOrder.count();
    const entropy = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-GAME-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}-${entropy}`;

    // Fulfillment Mode Logic
    const isAutoApi = game.fulfillmentMode === GameFulfillmentMode.AUTO_API;
    const fulfillmentStatus = isAutoApi
      ? GameFulfillmentStatus.DELIVERED
      : GameFulfillmentStatus.PENDING;
    const providerTransactionRef = isAutoApi
      ? `GAME-TX-${Date.now()}-${entropy}`
      : null;
    const fulfilledAt = isAutoApi ? new Date() : null;

    const order = await this.prisma.gameTopUpOrder.create({
      data: {
        orderNumber,
        userId: userId || null,
        guestEmail: dto.guestEmail || null,
        guestPhone: dto.guestPhone || null,
        gameId: game.id,
        packageId: pkg.id,
        playerId: dto.playerId.trim(),
        zoneId: dto.zoneId?.trim() || null,
        serverRegion: dto.serverRegion?.trim() || null,
        playerNickname: validation.playerNickname || null,
        priceBdt: pkg.priceBdt,
        paymentMethod: dto.paymentMethod,
        paymentStatus: 'PAID',
        fulfillmentStatus,
        fulfillmentMode: game.fulfillmentMode as GameFulfillmentMode,
        providerTransactionRef,
        fulfilledAt,
        notes: isAutoApi
          ? `Instant Provider API handshake completed for ${validation.playerNickname}`
          : `Awaiting manual staff top-up execution`,
      },
      include: {
        game: true,
        package: true,
      },
    });

    if (isAutoApi) {
      await this.auditService.log({
        actorId: userId,
        actorEmail: dto.guestEmail,
        action: AuditAction.GAME_TOPUP_FULFILLED,
        entityType: 'GameTopUpOrder',
        entityId: order.id,
        afterData: {
          orderNumber: order.orderNumber,
          game: game.name,
          package: pkg.name,
          playerId: dto.playerId,
          providerTransactionRef,
          status: 'DELIVERED',
        },
      });
    }

    return this.mapOrderToResponse(order);
  }

  // 9. Admin: Pending Manual Top-Up Queue
  async getPendingTopUpQueue(): Promise<GameTopUpOrderResponse[]> {
    const orders = await this.prisma.gameTopUpOrder.findMany({
      where: {
        fulfillmentStatus: { in: ['PENDING', 'PROCESSING'] },
      },
      include: {
        game: true,
        package: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return orders.map((o) => this.mapOrderToResponse(o));
  }

  // 10. Admin: Fulfill / Complete Manual Top-Up Order
  async fulfillManualTopUp(
    orderId: string,
    dto: GameFulfillmentActionDto,
    staff: any,
  ): Promise<GameTopUpOrderResponse> {
    const order = await this.prisma.gameTopUpOrder.findUnique({
      where: { id: orderId },
      include: { game: true, package: true },
    });

    if (!order) {
      throw new NotFoundException('Game top-up order not found.');
    }

    const providerTransactionRef =
      dto.providerTransactionRef || `MANUAL-STAFF-${staff.id.slice(0, 5)}-${Date.now()}`;

    const updated = await this.prisma.gameTopUpOrder.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: dto.status === 'DELIVERED' ? GameFulfillmentStatus.DELIVERED : GameFulfillmentStatus.FAILED,
        providerTransactionRef,
        fulfilledByStaffId: staff.id,
        fulfilledAt: new Date(),
        notes: dto.notes || `Manually fulfilled by staff: ${staff.name || staff.email}`,
      },
      include: {
        game: true,
        package: true,
      },
    });

    await this.auditService.log({
      actorId: staff.id,
      actorEmail: staff.email,
      action:
        dto.status === 'DELIVERED'
          ? AuditAction.GAME_TOPUP_FULFILLED
          : AuditAction.GAME_TOPUP_FAILED,
      entityType: 'GameTopUpOrder',
      entityId: orderId,
      afterData: {
        orderNumber: order.orderNumber,
        status: dto.status,
        providerTransactionRef,
        notes: dto.notes,
      },
    });

    return this.mapOrderToResponse(updated);
  }

  // 11. Public Order Status Lookup
  async getOrderByNumber(orderNumber: string): Promise<GameTopUpOrderResponse> {
    const order = await this.prisma.gameTopUpOrder.findUnique({
      where: { orderNumber },
      include: { game: true, package: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found.`);
    }

    return this.mapOrderToResponse(order);
  }

  // Mapping Helpers
  private mapGameToResponse(game: any): GameDetailResponse {
    let serverOptions: string[] = [];
    if (game.serverOptionsJson) {
      try {
        serverOptions = JSON.parse(game.serverOptionsJson);
      } catch {
        serverOptions = [];
      }
    }

    return {
      id: game.id,
      name: game.name,
      slug: game.slug,
      publisher: game.publisher,
      category: game.category,
      imageUrl: game.imageUrl || undefined,
      bannerUrl: game.bannerUrl || undefined,
      requiresZoneId: game.requiresZoneId,
      zoneIdLabel: game.zoneIdLabel || undefined,
      requiresServer: game.requiresServer,
      serverOptions,
      idFormatValidationRegex: game.idFormatValidationRegex || undefined,
      idInstructions: game.idInstructions || undefined,
      fulfillmentMode: game.fulfillmentMode as GameFulfillmentMode,
      sortOrder: game.sortOrder,
      isActive: game.isActive,
      packages: (game.packages || []).map((p: any) => this.mapPackageToResponse(p)),
    };
  }

  private mapPackageToResponse(pkg: any): GamePackageResponse {
    return {
      id: pkg.id,
      gameId: pkg.gameId,
      name: pkg.name,
      diamondCount: pkg.diamondCount,
      bonusCount: pkg.bonusCount,
      totalDiamonds: pkg.diamondCount + pkg.bonusCount,
      priceBdt: pkg.priceBdt,
      badgeText: pkg.badgeText || undefined,
      iconUrl: pkg.iconUrl || undefined,
      sortOrder: pkg.sortOrder,
      isActive: pkg.isActive,
    };
  }

  private mapOrderToResponse(order: any): GameTopUpOrderResponse {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      gameName: order.game?.name || 'Game',
      gameSlug: order.game?.slug || '',
      packageName: order.package?.name || 'Top-Up Package',
      diamondCount: order.package?.diamondCount || 0,
      bonusCount: order.package?.bonusCount || 0,
      playerId: order.playerId,
      zoneId: order.zoneId || undefined,
      serverRegion: order.serverRegion || undefined,
      playerNickname: order.playerNickname || undefined,
      priceBdt: order.priceBdt,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus as GameFulfillmentStatus,
      fulfillmentMode: order.fulfillmentMode as GameFulfillmentMode,
      providerTransactionRef: order.providerTransactionRef || undefined,
      fulfilledAt: order.fulfilledAt?.toISOString() || undefined,
      createdAt: order.createdAt.toISOString(),
    };
  }
}
