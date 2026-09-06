import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import {
  CreateSupportTicketDto,
  SupportTicketResponse,
  TicketReplyDto,
  UpdateTicketStatusDto,
} from '@siam-aqua/shared-types';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(
    userId?: string,
    dto?: CreateSupportTicketDto,
  ): Promise<SupportTicketResponse> {
    if (!dto?.subject || !dto?.message) {
      throw new BadRequestException('Subject and message are required');
    }

    const count = await this.prisma.supportTicket.count();
    const entropy = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TKT-2026-${String(count + 1).padStart(4, '0')}-${entropy}`;

    let customerName = dto.customerName || 'Customer';
    let customerEmail = dto.customerEmail || null;
    let customerPhone = dto.customerPhone || null;

    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        customerName = user.name;
        customerEmail = user.email;
        customerPhone = user.phone || null;
      }
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId: userId || null,
        customerName,
        customerEmail,
        customerPhone,
        subject: dto.subject,
        category: dto.category || 'GENERAL',
        priority: dto.priority || 'MEDIUM',
        status: 'OPEN',
        messages: {
          create: [
            {
              senderId: userId || null,
              senderName: customerName,
              senderRole: 'CUSTOMER',
              message: dto.message,
              attachmentsJson: dto.attachments ? JSON.stringify(dto.attachments) : null,
            },
          ],
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return this.mapTicketResponse(ticket);
  }

  async replyTicket(
    ticketId: string,
    senderId: string | undefined,
    senderName: string,
    senderRole: string,
    dto: TicketReplyDto,
  ): Promise<SupportTicketResponse> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket not found: ${ticketId}`);
    }

    await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: senderId || null,
        senderName,
        senderRole,
        message: dto.message,
        attachmentsJson: dto.attachments ? JSON.stringify(dto.attachments) : null,
      },
    });

    // If customer replies to a resolved ticket, re-open it
    const newStatus =
      senderRole === 'CUSTOMER' && ticket.status === 'RESOLVED' ? 'IN_PROGRESS' : ticket.status;

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return this.mapTicketResponse(updated);
  }

  async getMyTickets(userId: string): Promise<SupportTicketResponse[]> {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return tickets.map((t) => this.mapTicketResponse(t));
  }

  async getAdminTickets(filters?: {
    status?: string;
    category?: string;
    priority?: string;
  }): Promise<SupportTicketResponse[]> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.priority) where.priority = filters.priority;

    const tickets = await this.prisma.supportTicket.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return tickets.map((t) => this.mapTicketResponse(t));
  }

  async getTicketById(ticketId: string): Promise<SupportTicketResponse> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }

    return this.mapTicketResponse(ticket);
  }

  async updateTicketStatus(
    ticketId: string,
    dto: UpdateTicketStatusDto,
    staffName?: string,
  ): Promise<SupportTicketResponse> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: dto.status,
        assignedToStaffId: dto.assignedToStaffId || ticket.assignedToStaffId,
        assignedToStaffName: staffName || ticket.assignedToStaffName,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return this.mapTicketResponse(updated);
  }

  private mapTicketResponse(ticket: any): SupportTicketResponse {
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userId: ticket.userId,
      customerName: ticket.customerName,
      customerEmail: ticket.customerEmail,
      customerPhone: ticket.customerPhone,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      assignedToStaffId: ticket.assignedToStaffId,
      assignedToStaffName: ticket.assignedToStaffName,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      messages: ticket.messages?.map((m: any) => ({
        id: m.id,
        ticketId: m.ticketId,
        senderId: m.senderId,
        senderName: m.senderName,
        senderRole: m.senderRole,
        message: m.message,
        attachments: m.attachmentsJson ? JSON.parse(m.attachmentsJson) : [],
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }
}
