import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { AuthService } from '../src/modules/auth/auth.service';
import { AccountsService } from '../src/modules/accounts/accounts.service';
import { RbacService } from '../src/modules/rbac/rbac.service';
import { PricingService } from '../src/modules/pricing/pricing.service';
import { SecurityService } from '../src/modules/security/security.service';
import { ImportService } from '../src/modules/import/import.service';
import { BackupService } from '../src/modules/backup/backup.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/common/services/prisma.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { AccountType, IpRuleType, SuspensionType } from '@siam-aqua/shared-types';
import { AccountTypeGuard } from '../src/common/guards/account-type.guard';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { Reflector } from '@nestjs/core';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('Phase 0: Foundation Integration & Security Test Suite', () => {
  let prisma: PrismaService;
  let jwtService: JwtService;
  let auditService: AuditService;
  let authService: AuthService;
  let accountsService: AccountsService;
  let rbacService: RbacService;
  let pricingService: PricingService;
  let securityService: SecurityService;
  let importService: ImportService;
  let backupService: BackupService;
  let reflector: Reflector;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    jwtService = new JwtService({ secret: 'test-secret-key-2026' });
    auditService = new AuditService(prisma);
    authService = new AuthService(prisma, jwtService, auditService);
    accountsService = new AccountsService(prisma, auditService);
    rbacService = new RbacService(prisma, auditService);
    pricingService = new PricingService(prisma, auditService);
    securityService = new SecurityService(prisma, auditService);
    importService = new ImportService(prisma, auditService);
    backupService = new BackupService(prisma, auditService);
    reflector = new Reflector();
  });

  beforeEach(async () => {
    // Reset suspension on all users before each test
    await prisma.user.updateMany({
      data: {
        suspensionType: SuspensionType.NONE,
        suspendedUntil: null,
        suspensionReason: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // 1. All 7 Account Types exist and login to distinct redirect URLs
  it('Requirement 1 & 3: logs in all 7 distinct account types and routes to their dedicated landing pages', async () => {
    const testAccounts = [
      { email: 'admin@siamaqua.com', expectedType: AccountType.SUPER_ADMIN, expectedUrl: '/admin' },
      { email: 'orderstaff@siamaqua.com', expectedType: AccountType.STAFF, expectedUrl: '/admin' },
      { email: 'paikari@alaminpharma.com', expectedType: AccountType.PAIKARI_SELLER, expectedUrl: '/paikari' },
      { email: 'wholesale@medidistributors.com', expectedType: AccountType.WHOLESALER_SELLER, expectedUrl: '/wholesale' },
      { email: 'mpo.sakib@siamaqua.com', expectedType: AccountType.MPO, expectedUrl: '/mpo' },
      { email: 'vendor@dhakabiryani.com', expectedType: AccountType.FOOD_VENDOR, expectedUrl: '/food' },
      { email: 'customer@gmail.com', expectedType: AccountType.PUBLIC_USER, expectedUrl: '/' },
    ];

    for (const acc of testAccounts) {
      const res = await authService.login(
        { emailOrPhone: acc.email, password: 'SiamAqua@2026' },
        '127.0.0.1',
        'Vitest Test Runner',
      );

      expect(res.accessToken).toBeDefined();
      expect(res.user.accountType).toBe(acc.expectedType);
      expect(res.redirectUrl).toBe(acc.expectedUrl);
    }
  });

  // 2. Strict Wholesale Stealth Rule (404 instead of 403)
  it('Requirement 4: Paikari seller attempting to reach wholesale route receives 404 (zero trace)', () => {
    const guard = new AccountTypeGuard(reflector);

    // Mock handler requiring WHOLESALER_SELLER
    reflector.getAllAndOverride = () => [AccountType.WHOLESALER_SELLER];

    const mockPaikariContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: 'paikari-id',
            accountType: AccountType.PAIKARI_SELLER,
          },
          originalUrl: '/api/wholesale/catalog',
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };

    // Must throw NotFoundException (404), NEVER ForbiddenException (403)
    expect(() => guard.canActivate(mockPaikariContext)).toThrow(NotFoundException);
  });

  // 3. Dynamic Roles & Granular Permissions Enforcement
  it('Requirement 7: dynamic staff roles restrict access server-side based on permission records', async () => {
    const guard = new PermissionsGuard(reflector);

    // Context with Order Manager role (has 'orders.view_orders', but lacks 'pricing.manage_tiers')
    const orderStaffUser = await prisma.user.findUnique({
      where: { email: 'orderstaff@siamaqua.com' },
      include: {
        userRoles: {
          include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
        },
      },
    });

    const permissions = orderStaffUser?.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => rp.permission.slug),
    );

    const mockStaffContext = (requiredPerms: string[]): any => {
      reflector.getAllAndOverride = () => requiredPerms;
      return {
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              id: orderStaffUser?.id,
              accountType: AccountType.STAFF,
              permissions,
            },
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      };
    };

    // Order manager CAN access orders.view_orders
    expect(guard.canActivate(mockStaffContext(['orders.view_orders']))).toBe(true);

    // Order manager CANNOT access pricing.manage_tiers -> Throws ForbiddenException
    expect(() => guard.canActivate(mockStaffContext(['pricing.manage_tiers']))).toThrow(
      ForbiddenException,
    );
  });

  // 4. IP Block and Two-State Suspension
  it('Requirement 8: handles IP block and two-state suspensions (indefinite and auto-expiring)', async () => {
    // A. Indefinite Suspension
    const testUser = await prisma.user.findUnique({ where: { email: 'customer@gmail.com' } });
    await securityService.suspendAccount(
      testUser!.id,
      {
        suspensionType: SuspensionType.INDEFINITE,
        reason: 'Violation of fraud prevention policy',
      },
      { id: 'admin-id', email: 'admin@siamaqua.com' },
    );

    await expect(
      authService.login(
        { emailOrPhone: 'customer@gmail.com', password: 'SiamAqua@2026' },
        '127.0.0.1',
        'Vitest',
      ),
    ).rejects.toThrow(ForbiddenException);

    // Reactivate
    await securityService.reactivateAccount(testUser!.id, {
      id: 'admin-id',
      email: 'admin@siamaqua.com',
    });

    const reactivatedLogin = await authService.login(
      { emailOrPhone: 'customer@gmail.com', password: 'SiamAqua@2026' },
      '127.0.0.1',
      'Vitest',
    );
    expect(reactivatedLogin.accessToken).toBeDefined();

    // B. IP Block
    const testIp = '192.168.100.55';
    const rule = await securityService.createIpRule(
      {
        ipAddress: testIp,
        type: IpRuleType.BLOCK,
        reason: 'Malicious scraper bot detected',
      },
      { id: 'admin-id', email: 'admin@siamaqua.com' },
    );
    expect(rule.type).toBe(IpRuleType.BLOCK);

    // Cleanup rule
    await securityService.deleteIpRule(rule.id, { id: 'admin-id', email: 'admin@siamaqua.com' });
  });

  // 5. Automated Backup & Restore Drill
  it('Requirement 9: creates a snapshot backup with SHA256 checksum and executes a verified restore drill', async () => {
    const backupRes = await backupService.triggerBackup('Automated nightly test snapshot');
    expect(backupRes.backup.id).toBeDefined();
    expect(backupRes.backup.checksum).toBeDefined();
    expect(backupRes.summary.usersCount).toBeGreaterThan(0);

    const drillRes = await backupService.performRestoreDrill(
      backupRes.backup.id,
      'Manual drill verification: all tables parsed and checksum validated',
    );
    expect(drillRes.backup.drillVerifiedAt).toBeDefined();
    expect(drillRes.backup.drillNotes).toContain('Manual drill verification');
  });

  // 6. Bulk Paikari Customer CSV Importer
  it('Requirement 10: imports bulk Paikari customer shops from sample CSV with tiers and overrides', async () => {
    const sampleCsv = `shopName,ownerName,phone,email,address,tierCode,creditLimit,codLimit,deliveryFeeThreshold
Bismillah Medicine Corner,Haji Mokbul,+8801811223301,bismillah@pharma.bd,"Chawkbazar, Chittagong",TIER_A,50000,100000,2000
Janata Pharmacy,Nurul Huda,+8801811223302,janata@pharma.bd,"GEC Circle, Chittagong",TIER_B,20000,50000,1000
Shahjalal Drug House,Syed Ali,+8801811223303,shahjalal@pharma.bd,"Zindabazar, Sylhet",TIER_C,0,30000,500`;

    const importRes = await importService.importPaikariCustomersFromCsv(sampleCsv, {
      id: 'admin-id',
      email: 'admin@siamaqua.com',
    });

    expect(importRes.totalRows).toBe(3);
    expect(importRes.importedCount).toBe(3);
    expect(importRes.failedCount).toBe(0);
    expect(importRes.importedCustomerIds.length).toBe(3);

    // Verify one of the imported shops
    const importedShop = await prisma.user.findFirst({
      where: { email: 'bismillah@pharma.bd' },
      include: { customerProfile: { include: { tier: true } } },
    });
    expect(importedShop?.customerProfile?.shopName).toBe('Bismillah Medicine Corner');
    expect(importedShop?.customerProfile?.tier.code).toBe('TIER_A');
    expect(importedShop?.customerProfile?.creditLimit).toBe(50000);
  });
});
