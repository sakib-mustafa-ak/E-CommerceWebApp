import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditAction } from '@siam-aqua/shared-types';

export interface CreateAuditLogDto {
  actorId?: string;
  actorEmail?: string;
  action: AuditAction | string;
  entityType: string;
  entityId: string;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto) {
    let validActorId: string | null = null;
    if (dto.actorId) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: dto.actorId },
        select: { id: true },
      });
      if (userExists) {
        validActorId = userExists.id;
      }
    }

    return this.prisma.auditLog.create({
      data: {
        actorId: validActorId,
        actorEmail: dto.actorEmail,
        action: dto.action,
        entityType: dto.entityType,
        entityId: dto.entityId,
        beforeData: dto.beforeData ? JSON.stringify(dto.beforeData) : null,
        afterData: dto.afterData ? JSON.stringify(dto.afterData) : null,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
    });
  }

  async getLogs(params: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) {
    const { entityType, entityId, actorId, action, limit = 50, offset = 0 } = params;
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: { id: true, name: true, email: true, accountType: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        ...log,
        beforeData: log.beforeData ? JSON.parse(log.beforeData) : null,
        afterData: log.afterData ? JSON.parse(log.afterData) : null,
      })),
      total,
      limit,
      offset,
    };
  }
}
