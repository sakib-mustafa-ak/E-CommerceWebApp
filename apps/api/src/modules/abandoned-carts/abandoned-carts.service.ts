import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import {
  AbandonedCartSessionResponse,
  AbandonedCartReminderTriggerDto,
} from '@siam-aqua/shared-types';

@Injectable()
export class AbandonedCartsService {
  constructor(private readonly prisma: PrismaService) {}

  async trackCartActivity(data: {
    userId?: string;
    guestSessionId?: string;
    customerEmail?: string;
    customerPhone?: string;
    items: any[];
    cartSubtotalBdt: number;
  }): Promise<AbandonedCartSessionResponse> {
    const filter = data.userId
      ? { userId: data.userId }
      : { guestSessionId: data.guestSessionId || 'unknown' };

    let session = await this.prisma.abandonedCartSession.findFirst({
      where: {
        ...filter,
        status: { in: ['ACTIVE', 'ABANDONED'] },
      },
    });

    if (session) {
      session = await this.prisma.abandonedCartSession.update({
        where: { id: session.id },
        data: {
          itemsJson: JSON.stringify(data.items),
          cartSubtotalBdt: data.cartSubtotalBdt,
          customerEmail: data.customerEmail || session.customerEmail,
          customerPhone: data.customerPhone || session.customerPhone,
          lastActivityAt: new Date(),
          status: 'ACTIVE',
        },
      });
    } else {
      session = await this.prisma.abandonedCartSession.create({
        data: {
          userId: data.userId || null,
          guestSessionId: data.guestSessionId || null,
          customerEmail: data.customerEmail || null,
          customerPhone: data.customerPhone || null,
          itemsJson: JSON.stringify(data.items),
          cartSubtotalBdt: data.cartSubtotalBdt,
          lastActivityAt: new Date(),
          status: 'ACTIVE',
        },
      });
    }

    return {
      id: session.id,
      userId: session.userId,
      guestSessionId: session.guestSessionId,
      customerEmail: session.customerEmail,
      customerPhone: session.customerPhone,
      items: JSON.parse(session.itemsJson),
      cartSubtotalBdt: session.cartSubtotalBdt,
      lastActivityAt: session.lastActivityAt.toISOString(),
      reminderSentCount: session.reminderSentCount,
      lastReminderSentAt: session.lastReminderSentAt?.toISOString() || null,
      status: session.status,
    };
  }

  async getAbandonedCarts(olderThanHours = 2): Promise<AbandonedCartSessionResponse[]> {
    const cutoffDate = new Date(Date.now() - olderThanHours * 3600000);

    const sessions = await this.prisma.abandonedCartSession.findMany({
      where: {
        lastActivityAt: { lte: cutoffDate },
        status: { in: ['ACTIVE', 'ABANDONED'] },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      guestSessionId: s.guestSessionId,
      customerEmail: s.customerEmail,
      customerPhone: s.customerPhone,
      items: JSON.parse(s.itemsJson),
      cartSubtotalBdt: s.cartSubtotalBdt,
      lastActivityAt: s.lastActivityAt.toISOString(),
      reminderSentCount: s.reminderSentCount,
      lastReminderSentAt: s.lastReminderSentAt?.toISOString() || null,
      status: 'ABANDONED',
    }));
  }

  async sendReminder(dto: AbandonedCartReminderTriggerDto) {
    const session = await this.prisma.abandonedCartSession.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Abandoned cart session not found: ${dto.sessionId}`);
    }

    const updated = await this.prisma.abandonedCartSession.update({
      where: { id: session.id },
      data: {
        status: 'ABANDONED',
        reminderSentCount: session.reminderSentCount + 1,
        lastReminderSentAt: new Date(),
      },
    });

    return {
      success: true,
      sessionId: updated.id,
      reminderSentCount: updated.reminderSentCount,
      channel: dto.channel || 'EMAIL',
      message:
        dto.customMessage ||
        `Hi! You left items in your Siam's Aqua cart worth ৳${updated.cartSubtotalBdt}. Complete your order now!`,
    };
  }

  async markRecovered(userId?: string, guestSessionId?: string) {
    const filter = userId ? { userId } : { guestSessionId };
    if (!userId && !guestSessionId) return;

    await this.prisma.abandonedCartSession.updateMany({
      where: {
        ...filter,
        status: { in: ['ACTIVE', 'ABANDONED'] },
      },
      data: {
        status: 'RECOVERED',
      },
    });
  }
}
