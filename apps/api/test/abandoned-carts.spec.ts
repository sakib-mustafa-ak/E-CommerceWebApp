import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AbandonedCartsService } from '../src/modules/abandoned-carts/abandoned-carts.service';

describe('Phase 11.5: Abandoned Cart Reminders Suite', () => {
  let prisma: PrismaClient;
  let cartsService: AbandonedCartsService;

  let testGuestSessionId: string;
  let testSessionRecord: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    cartsService = new AbandonedCartsService(prisma as any);
    testGuestSessionId = `guest_cart_${Date.now()}`;
  });

  afterAll(async () => {
    await prisma.abandonedCartSession.deleteMany({
      where: { guestSessionId: testGuestSessionId },
    });
    await prisma.$disconnect();
  });

  it('1. should track active cart session with items and subtotal', async () => {
    const session = await cartsService.trackCartActivity({
      guestSessionId: testGuestSessionId,
      customerEmail: 'shopper@gmail.com',
      customerPhone: '01711223344',
      items: [
        { productId: 'prod-1', name: 'Ace Plus', quantity: 3, price: 30 },
      ],
      cartSubtotalBdt: 90.0,
    });

    expect(session).toBeDefined();
    expect(session.guestSessionId).toBe(testGuestSessionId);
    expect(session.cartSubtotalBdt).toBe(90.0);
    expect(session.status).toBe('ACTIVE');
    testSessionRecord = session;
  });

  it('2. should identify cart as abandoned when inactive for more than specified hours', async () => {
    // Manually age the session lastActivityAt to 3 hours ago
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000);
    await prisma.abandonedCartSession.update({
      where: { id: testSessionRecord.id },
      data: { lastActivityAt: threeHoursAgo },
    });

    const abandonedList = await cartsService.getAbandonedCarts(2); // threshold 2 hours
    expect(abandonedList.length).toBeGreaterThanOrEqual(1);

    const found = abandonedList.find((s) => s.id === testSessionRecord.id);
    expect(found).toBeDefined();
    expect(found?.customerEmail).toBe('shopper@gmail.com');
  });

  it('3. should dispatch reminder to customer and increment reminder count', async () => {
    const reminderRes = await cartsService.sendReminder({
      sessionId: testSessionRecord.id,
      channel: 'SMS',
    });

    expect(reminderRes.success).toBe(true);
    expect(reminderRes.reminderSentCount).toBe(1);
    expect(reminderRes.channel).toBe('SMS');

    const updated = await prisma.abandonedCartSession.findUnique({
      where: { id: testSessionRecord.id },
    });
    expect(updated?.reminderSentCount).toBe(1);
    expect(updated?.lastReminderSentAt).toBeDefined();
  });

  it('4. should mark cart session as RECOVERED upon checkout completion', async () => {
    await cartsService.markRecovered(undefined, testGuestSessionId);

    const updated = await prisma.abandonedCartSession.findUnique({
      where: { id: testSessionRecord.id },
    });
    expect(updated?.status).toBe('RECOVERED');
  });
});
