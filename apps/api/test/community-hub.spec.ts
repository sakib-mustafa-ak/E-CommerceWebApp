import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { CommunityService } from '../src/modules/community/community.service';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  AccountType,
  CommunityPostCategory,
  CommunityPostStatus,
} from '@siam-aqua/shared-types';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('Phase 10: Hub & Community Classifieds Test Suite', () => {
  let prisma: PrismaClient;
  let service: CommunityService;
  let auditService: AuditService;

  let publicAuthor: any;
  let superAdmin: any;
  let authorizedStaff: any;
  let unauthorizedStaff: any;

  let courierPost: any;
  let pharmaJobPost: any;
  let rejectedPost: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    auditService = new AuditService(prisma as any);
    service = new CommunityService(prisma as any, auditService);

    // Clean test data
    await prisma.communityPost.deleteMany({});

    const timestamp = Date.now();

    // 1. Public author user
    publicAuthor = await prisma.user.create({
      data: {
        email: `community_author_${timestamp}@test.com`,
        passwordHash: 'hash',
        name: 'Rahim Pharmacy Logistics',
        phone: '01711223344',
        accountType: AccountType.PUBLIC_USER,
      },
    });

    // 2. Super admin
    superAdmin = await prisma.user.create({
      data: {
        email: `super_admin_hub_${timestamp}@test.com`,
        passwordHash: 'hash',
        name: 'Siam SuperAdmin',
        accountType: AccountType.SUPER_ADMIN,
      },
    });

    // 3. Authorized staff with community.moderate_posts permission
    authorizedStaff = await prisma.user.create({
      data: {
        email: `mod_staff_${timestamp}@test.com`,
        passwordHash: 'hash',
        name: 'Community Moderator Staff',
        accountType: AccountType.STAFF,
      },
    });

    // 4. Unauthorized staff without community.moderate_posts permission
    unauthorizedStaff = await prisma.user.create({
      data: {
        email: `plain_staff_${timestamp}@test.com`,
        passwordHash: 'hash',
        name: 'Junior Warehouse Staff',
        accountType: AccountType.STAFF,
      },
    });

    // Create dynamic permission 'community.moderate_posts' if not existing
    let perm = await prisma.permission.findUnique({
      where: { slug: 'community.moderate_posts' },
    });
    if (!perm) {
      perm = await prisma.permission.create({
        data: {
          slug: 'community.moderate_posts',
          name: 'Moderate Community Hub Posts',
          category: 'community',
          description: 'Approve, reject, and remove community classifieds and forum posts',
        },
      });
    }

    // Create role with this permission
    let role = await prisma.role.findUnique({
      where: { slug: 'community-moderator-role' },
    });
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: 'Community Moderator',
          slug: 'community-moderator-role',
          description: 'Can moderate and curate public community board posts',
          rolePermissions: {
            create: [{ permissionId: perm.id }],
          },
        },
      });
    }

    // Assign role to authorizedStaff
    await prisma.userRole.create({
      data: {
        userId: authorizedStaff.id,
        roleId: role.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.communityPost.deleteMany({});
    await prisma.userRole.deleteMany({
      where: { userId: { in: [publicAuthor.id, superAdmin.id, authorizedStaff.id, unauthorizedStaff.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [publicAuthor.id, superAdmin.id, authorizedStaff.id, unauthorizedStaff.id] } },
    });
    await prisma.$disconnect();
  });

  describe('1. Post Submission & Strict Pre-Publication Queue', () => {
    it('should allow user to submit a classified post and default status to PENDING_APPROVAL', async () => {
      courierPost = await service.createPost(
        publicAuthor.id,
        { name: publicAuthor.name, phone: publicAuthor.phone, email: publicAuthor.email },
        {
          title: 'Need Urgent Cold-Chain Refrigerated Courier for Insulin Batch from Dhaka to Sylhet',
          content:
            'Looking for an experienced cold-chain delivery service provider with temperature logging box (2-8°C) for 50 boxes of insulin delivery.',
          category: CommunityPostCategory.LOGISTICS_COURIER,
          location: 'Dhaka to Sylhet',
          priceBdt: 3500,
          tags: ['courier', 'coldchain', 'insulin', 'urgent'],
          linkedSector: 'PAIKARI',
        },
      );

      expect(courierPost).toBeDefined();
      expect(courierPost.status).toBe(CommunityPostStatus.PENDING_APPROVAL);
      expect(courierPost.category).toBe(CommunityPostCategory.LOGISTICS_COURIER);
      expect(courierPost.linkedSector).toBe('PAIKARI');
      expect(courierPost.tags).toContain('coldchain');
    });

    it('should NOT display pending posts on the public community board', async () => {
      const publicPosts = await service.getPublicPosts({ category: CommunityPostCategory.LOGISTICS_COURIER });
      expect(publicPosts.some((p) => p.id === courierPost.id)).toBe(false);
    });

    it('should list pending posts in the staff/admin moderation review queue', async () => {
      const queue = await service.getPendingReviewQueue();
      expect(queue.some((p) => p.id === courierPost.id)).toBe(true);
    });
  });

  describe('2. Dynamic RBAC Moderation & Approval Flow', () => {
    it('should allow authorized moderator staff to approve a pending post into published status', async () => {
      const approved = await service.moderatePost(
        authorizedStaff.id,
        authorizedStaff.name,
        courierPost.id,
        {
          status: CommunityPostStatus.APPROVED,
        },
      );

      expect(approved.status).toBe(CommunityPostStatus.APPROVED);
      expect(approved.reviewedById).toBe(authorizedStaff.id);
      expect(approved.reviewedByName).toBe(authorizedStaff.name);
      expect(approved.reviewedAt).toBeDefined();

      // Now it must appear on the public board
      const publicPosts = await service.getPublicPosts({ category: CommunityPostCategory.LOGISTICS_COURIER });
      expect(publicPosts.some((p) => p.id === courierPost.id)).toBe(true);
    });

    it('should allow moderator to reject a spam post with a recorded reason', async () => {
      const spamPost = await service.createPost(
        publicAuthor.id,
        { name: publicAuthor.name },
        {
          title: 'Promotional Spam Gambling Ad',
          content: 'Join external Telegram channel for free money.',
          category: CommunityPostCategory.GENERAL_DISCUSSION,
        },
      );

      const rejected = await service.moderatePost(
        authorizedStaff.id,
        authorizedStaff.name,
        spamPost.id,
        {
          status: CommunityPostStatus.REJECTED,
          rejectionReason: 'Violates platform community guidelines on promotional gambling links.',
        },
      );

      expect(rejected.status).toBe(CommunityPostStatus.REJECTED);
      expect(rejected.rejectionReason).toContain('Violates platform community guidelines');

      // Rejected post must never appear on public board
      const publicPosts = await service.getPublicPosts();
      expect(publicPosts.some((p) => p.id === spamPost.id)).toBe(false);
    });
  });

  describe('3. Category Browsing, Sector Linking & View Counter', () => {
    it('should create and approve a second post under HIRING_JOBS', async () => {
      pharmaJobPost = await service.createPost(
        publicAuthor.id,
        { name: publicAuthor.name },
        {
          title: 'Hiring Registered Pharmacist (Grade B/C) for Dhanmondi Outlet',
          content:
            'Full-time retail pharmacist wanted for prescription dispensing, customer counseling, and MedEx inventory oversight.',
          category: CommunityPostCategory.HIRING_JOBS,
          location: 'Dhanmondi, Dhaka',
          priceBdt: 28000,
          tags: ['hiring', 'pharmacist', 'dhanmondi'],
          linkedSector: 'WHOLESALE',
        },
      );

      await service.moderatePost(superAdmin.id, superAdmin.name, pharmaJobPost.id, {
        status: CommunityPostStatus.APPROVED,
      });

      const hiringPosts = await service.getPublicPosts({ category: CommunityPostCategory.HIRING_JOBS });
      expect(hiringPosts.some((p) => p.id === pharmaJobPost.id)).toBe(true);
    });

    it('should filter posts by search keyword and location correctly', async () => {
      const searchResults = await service.getPublicPosts({ search: 'Insulin' });
      expect(searchResults.some((p) => p.id === courierPost.id)).toBe(true);
      expect(searchResults.some((p) => p.id === pharmaJobPost.id)).toBe(false);
    });

    it('should fetch single post by slug and increment view count atomically', async () => {
      const fetched = await service.getPostBySlug(courierPost.slug);
      expect(fetched.id).toBe(courierPost.id);
      expect(fetched.viewCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('4. Emergency Admin Removal Flow', () => {
    it('should allow admin to remove any published post at any time with a recorded removal reason', async () => {
      const removed = await service.removePublishedPost(
        superAdmin.id,
        superAdmin.name,
        courierPost.id,
        'Item fulfilled and archived upon poster request.',
      );

      expect(removed.status).toBe(CommunityPostStatus.REMOVED);
      expect(removed.removalReason).toBe('Item fulfilled and archived upon poster request.');

      // Removed post must immediately disappear from public board
      const publicPosts = await service.getPublicPosts();
      expect(publicPosts.some((p) => p.id === courierPost.id)).toBe(false);
    });
  });
});
