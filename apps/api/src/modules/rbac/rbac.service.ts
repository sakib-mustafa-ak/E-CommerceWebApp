import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AccountType } from '@siam-aqua/shared-types';

@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async getAllRoles() {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getRoleById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async createRole(
    dto: { name: string; slug: string; description?: string; permissionIds: string[] },
    actor: { id: string; email: string },
  ) {
    const existing = await this.prisma.role.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException(`Role with slug '${dto.slug}' already exists`);

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        isSystem: false,
        rolePermissions: {
          create: dto.permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'ROLE_CREATED',
      entityType: 'Role',
      entityId: role.id,
      afterData: role,
    });

    return role;
  }

  async updateRole(
    id: string,
    dto: { name?: string; description?: string; permissionIds?: string[] },
    actor: { id: string; email: string },
  ) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { rolePermissions: true },
    });
    if (!role) throw new NotFoundException('Role not found');

    // Update basic fields
    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name || role.name,
        description: dto.description !== undefined ? dto.description : role.description,
      },
    });

    if (dto.permissionIds) {
      // Re-assign permissions
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (dto.permissionIds.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }
    }

    const finalRole = await this.getRoleById(id);

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'ROLE_UPDATED',
      entityType: 'Role',
      entityId: id,
      beforeData: role,
      afterData: finalRole,
    });

    return finalRole;
  }

  async assignRolesToUser(
    userId: string,
    roleIds: string[],
    actor: { id: string; email: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountType !== AccountType.STAFF && user.accountType !== AccountType.SUPER_ADMIN) {
      throw new BadRequestException('Roles can only be assigned to staff or admin accounts');
    }

    const previousRoleIds = user.userRoles.map((ur) => ur.roleId);

    await this.prisma.userRole.deleteMany({ where: { userId } });
    if (roleIds.length > 0) {
      await this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
      });
    }

    await this.audit.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: AuditAction.STAFF_ROLE_ASSIGNED,
      entityType: 'UserRole',
      entityId: userId,
      beforeData: { roleIds: previousRoleIds },
      afterData: { roleIds },
    });

    return { message: 'Roles assigned successfully', userId, roleIds };
  }
}
