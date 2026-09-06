import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TicketsService } from '../src/modules/tickets/tickets.service';
import { AccountType } from '@siam-aqua/shared-types';

describe('Phase 11.7: Support Ticket System Suite', () => {
  let prisma: PrismaClient;
  let ticketsService: TicketsService;

  let testCustomer: any;
  let testStaff: any;
  let createdTicket: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    ticketsService = new TicketsService(prisma as any);

    testCustomer = await prisma.user.create({
      data: {
        email: `ticket_cust_${Date.now()}@siamaqua.com`,
        passwordHash: 'hash',
        accountType: AccountType.PUBLIC_USER,
        name: 'Kamal Support Requester',
        phone: '01899887766',
      },
    });

    testStaff = await prisma.user.create({
      data: {
        email: `ticket_staff_${Date.now()}@siamaqua.com`,
        passwordHash: 'hash',
        accountType: AccountType.STAFF,
        name: 'Sadia Support Agent',
      },
    });
  });

  afterAll(async () => {
    if (createdTicket) {
      await prisma.ticketMessage.deleteMany({ where: { ticketId: createdTicket.id } });
      await prisma.supportTicket.deleteMany({ where: { id: createdTicket.id } });
    }
    if (testCustomer) {
      await prisma.user.deleteMany({ where: { id: testCustomer.id } });
    }
    if (testStaff) {
      await prisma.user.deleteMany({ where: { id: testStaff.id } });
    }
    await prisma.$disconnect();
  });

  it('1. should create a support ticket with auto ticket number and initial message', async () => {
    const ticket = await ticketsService.createTicket(testCustomer.id, {
      subject: 'Damaged item received in Order #ORD-9912',
      category: 'RETURN',
      priority: 'HIGH',
      message: 'One strip of medicine was broken upon delivery. Requesting replacement.',
      attachments: ['https://cdn.siamaqua.com/evidence/damaged-strip.jpg'],
    });

    expect(ticket).toBeDefined();
    expect(ticket.ticketNumber).toMatch(/^TKT-2026-\d{4}-\d{4}$/);
    expect(ticket.status).toBe('OPEN');
    expect(ticket.priority).toBe('HIGH');
    expect(ticket.category).toBe('RETURN');
    expect(ticket.messages?.length).toBe(1);
    expect(ticket.messages?.[0].senderRole).toBe('CUSTOMER');
    createdTicket = ticket;
  });

  it('2. should append staff reply and update status when staff responds', async () => {
    const replied = await ticketsService.replyTicket(
      createdTicket.id,
      testStaff.id,
      testStaff.name,
      'STAFF',
      {
        message: 'Hello Kamal, we apologize for the issue. A replacement order has been dispatched.',
      },
    );

    expect(replied.messages?.length).toBe(2);
    expect(replied.messages?.[1].senderName).toBe('Sadia Support Agent');
    expect(replied.messages?.[1].senderRole).toBe('STAFF');
  });

  it('3. should list customer tickets and admin queue correctly', async () => {
    const customerTickets = await ticketsService.getMyTickets(testCustomer.id);
    expect(customerTickets.length).toBe(1);

    const adminQueue = await ticketsService.getAdminTickets({ category: 'RETURN' });
    expect(adminQueue.length).toBeGreaterThanOrEqual(1);
  });

  it('4. should update ticket status to RESOLVED with assigned staff', async () => {
    const resolved = await ticketsService.updateTicketStatus(
      createdTicket.id,
      {
        status: 'RESOLVED',
        assignedToStaffId: testStaff.id,
      },
      testStaff.name,
    );

    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.assignedToStaffName).toBe('Sadia Support Agent');
  });
});
