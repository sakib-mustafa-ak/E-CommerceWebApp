import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import {
  CommunityPostCreateDto,
  CommunityPostModerationDto,
} from '@siam-aqua/shared-types';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // ================= PUBLIC COMMUNITY STOREFRONT ENDPOINTS =================

  @Get('posts')
  async getPublicPosts(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('location') location?: string,
    @Query('sector') sector?: string,
  ) {
    return this.communityService.getPublicPosts({ category, search, location, sector });
  }

  @Get('posts/:slug')
  async getPostBySlug(@Param('slug') slug: string) {
    return this.communityService.getPostBySlug(slug);
  }

  // ================= AUTHENTICATED USER POST CREATION =================

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  async createPost(@Body() dto: CommunityPostCreateDto, @Request() req: any) {
    const author = {
      name: req.user.name,
      phone: req.user.phone,
      email: req.user.email,
    };
    return this.communityService.createPost(req.user.id, author, dto);
  }

  @Get('my-posts')
  @UseGuards(JwtAuthGuard)
  async getMyPosts(@Request() req: any) {
    return this.communityService.getUserPosts(req.user.id);
  }

  // ================= ADMIN & SUB-ADMIN MODERATION ENDPOINTS =================
  // Reuses Phase 0 dynamic RBAC permission: 'community.moderate_posts'

  @Get('admin/review-queue')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('community.moderate_posts')
  async getPendingReviewQueue() {
    return this.communityService.getPendingReviewQueue();
  }

  @Get('admin/all-posts')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('community.moderate_posts')
  async getAllPostsAdmin() {
    return this.communityService.getAllPostsAdmin();
  }

  @Patch('admin/posts/:postId/moderate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('community.moderate_posts')
  async moderatePost(
    @Param('postId') postId: string,
    @Body() dto: CommunityPostModerationDto,
    @Request() req: any,
  ) {
    return this.communityService.moderatePost(
      req.user.id,
      req.user.name || 'Staff Moderator',
      postId,
      dto,
    );
  }

  @Delete('admin/posts/:postId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('community.moderate_posts')
  async removePublishedPost(
    @Param('postId') postId: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.communityService.removePublishedPost(
      req.user.id,
      req.user.name || 'Staff Moderator',
      postId,
      reason,
    );
  }
}
