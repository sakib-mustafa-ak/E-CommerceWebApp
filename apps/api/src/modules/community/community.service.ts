import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CommunityPostCategory,
  CommunityPostStatus,
  CommunityPostCreateDto,
  CommunityPostUpdateDto,
  CommunityPostModerationDto,
  CommunityPostResponse,
  AuditAction,
} from '@siam-aqua/shared-types';

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ----------------------------------------------------
  // 1. POST CREATION (DEFAULTS TO PENDING_APPROVAL)
  // ----------------------------------------------------

  async createPost(
    authorId: string,
    author: { name: string; phone?: string; email?: string },
    dto: CommunityPostCreateDto,
  ): Promise<CommunityPostResponse> {
    if (!dto.title || !dto.title.trim()) {
      throw new BadRequestException('Post title is required.');
    }
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('Post content is required.');
    }

    const baseSlug = dto.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const slug = `${baseSlug || 'post'}-${Math.floor(10000 + Math.random() * 90000)}`;

    const post = await this.prisma.communityPost.create({
      data: {
        title: dto.title.trim(),
        slug,
        content: dto.content.trim(),
        category: dto.category || CommunityPostCategory.GENERAL_DISCUSSION,
        status: CommunityPostStatus.PENDING_APPROVAL, // Strict review queue
        authorId,
        authorName: author.name,
        authorPhone: dto.authorPhone || author.phone || null,
        authorEmail: dto.authorEmail || author.email || null,
        location: dto.location || null,
        priceBdt: dto.priceBdt !== undefined ? Number(dto.priceBdt) : null,
        tags: dto.tags && dto.tags.length > 0 ? JSON.stringify(dto.tags) : null,
        linkedSector: dto.linkedSector || null,
        linkedEntityId: dto.linkedEntityId || null,
        linkedUrl: dto.linkedUrl || null,
      },
    });

    await this.auditService.log({
      action: AuditAction.COMMUNITY_POST_CREATED,
      actorId: authorId,
      entityId: post.id,
      entityType: 'CommunityPost',
      afterData: { title: post.title, category: post.category, status: post.status },
    });

    return this.mapPostToResponse(post);
  }

  // ----------------------------------------------------
  // 2. PUBLIC POSTS BROWSING & CATEGORY FILTERING
  // ----------------------------------------------------

  async getPublicPosts(params?: {
    category?: string;
    search?: string;
    location?: string;
    sector?: string;
  }): Promise<CommunityPostResponse[]> {
    const where: any = {
      status: CommunityPostStatus.APPROVED, // Only approved posts are public
    };

    if (params?.category && params.category !== 'ALL') {
      where.category = params.category;
    }

    if (params?.location && params.location !== 'ALL') {
      where.location = { contains: params.location };
    }

    if (params?.sector && params.sector !== 'ALL') {
      where.linkedSector = params.sector;
    }

    if (params?.search) {
      where.OR = [
        { title: { contains: params.search } },
        { content: { contains: params.search } },
        { authorName: { contains: params.search } },
        { tags: { contains: params.search } },
      ];
    }

    const posts = await this.prisma.communityPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return posts.map((p) => this.mapPostToResponse(p));
  }

  async getPostBySlug(slug: string): Promise<CommunityPostResponse> {
    const post = await this.prisma.communityPost.findUnique({
      where: { slug },
    });

    if (!post) {
      throw new NotFoundException(`Community post with slug "${slug}" not found.`);
    }

    // Increment view count
    if (post.status === CommunityPostStatus.APPROVED) {
      await this.prisma.communityPost.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } },
      });
      post.viewCount += 1;
    }

    return this.mapPostToResponse(post);
  }

  // ----------------------------------------------------
  // 3. ADMIN / MODERATION REVIEW QUEUE
  // ----------------------------------------------------

  async getPendingReviewQueue(): Promise<CommunityPostResponse[]> {
    const posts = await this.prisma.communityPost.findMany({
      where: { status: CommunityPostStatus.PENDING_APPROVAL },
      orderBy: { createdAt: 'asc' },
    });

    return posts.map((p) => this.mapPostToResponse(p));
  }

  async getAllPostsAdmin(): Promise<CommunityPostResponse[]> {
    const posts = await this.prisma.communityPost.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return posts.map((p) => this.mapPostToResponse(p));
  }

  async moderatePost(
    moderatorId: string,
    moderatorName: string,
    postId: string,
    dto: CommunityPostModerationDto,
  ): Promise<CommunityPostResponse> {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException(`Community post with ID "${postId}" not found.`);
    }

    const updated = await this.prisma.communityPost.update({
      where: { id: postId },
      data: {
        status: dto.status,
        reviewedById: moderatorId,
        reviewedByName: moderatorName,
        reviewedAt: new Date(),
        rejectionReason: dto.status === CommunityPostStatus.REJECTED ? dto.rejectionReason || null : null,
      },
    });

    const action =
      dto.status === CommunityPostStatus.APPROVED
        ? AuditAction.COMMUNITY_POST_APPROVED
        : AuditAction.COMMUNITY_POST_REJECTED;

    await this.auditService.log({
      action,
      actorId: moderatorId,
      entityId: post.id,
      entityType: 'CommunityPost',
      afterData: { status: updated.status, rejectionReason: updated.rejectionReason },
    });

    return this.mapPostToResponse(updated);
  }

  async removePublishedPost(
    moderatorId: string,
    moderatorName: string,
    postId: string,
    reason?: string,
  ): Promise<CommunityPostResponse> {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException(`Community post with ID "${postId}" not found.`);
    }

    const updated = await this.prisma.communityPost.update({
      where: { id: postId },
      data: {
        status: CommunityPostStatus.REMOVED,
        removalReason: reason || 'Removed by moderator/admin',
        reviewedById: moderatorId,
        reviewedByName: moderatorName,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.log({
      action: AuditAction.COMMUNITY_POST_REMOVED,
      actorId: moderatorId,
      entityId: post.id,
      entityType: 'CommunityPost',
      afterData: { removalReason: updated.removalReason },
    });

    return this.mapPostToResponse(updated);
  }

  // ----------------------------------------------------
  // 4. USER MY-POSTS
  // ----------------------------------------------------

  async getUserPosts(userId: string): Promise<CommunityPostResponse[]> {
    const posts = await this.prisma.communityPost.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return posts.map((p) => this.mapPostToResponse(p));
  }

  // ----------------------------------------------------
  // HELPER MAPPERS
  // ----------------------------------------------------

  private mapPostToResponse(p: any): CommunityPostResponse {
    let tags: string[] = [];
    try {
      tags = typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags || [];
    } catch {
      tags = [];
    }

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      content: p.content,
      category: p.category as CommunityPostCategory,
      status: p.status as CommunityPostStatus,
      authorId: p.authorId,
      authorName: p.authorName,
      authorPhone: p.authorPhone,
      authorEmail: p.authorEmail,
      location: p.location,
      priceBdt: p.priceBdt,
      tags,
      linkedSector: p.linkedSector,
      linkedEntityId: p.linkedEntityId,
      linkedUrl: p.linkedUrl,
      reviewedById: p.reviewedById,
      reviewedByName: p.reviewedByName,
      reviewedAt: p.reviewedAt?.toISOString?.() || p.reviewedAt,
      rejectionReason: p.rejectionReason,
      removalReason: p.removalReason,
      viewCount: p.viewCount,
      createdAt: p.createdAt?.toISOString?.() || p.createdAt,
      updatedAt: p.updatedAt?.toISOString?.() || p.updatedAt,
    };
  }
}
