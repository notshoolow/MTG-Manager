'use server';

import { prisma } from '@/lib/db';
import { getMockUserId } from '@/lib/auth';

export async function subscribeToStock(userId: string | null, oracleId: string, scryfallCardId?: string | null) {
  try {
    const finalUserId = userId || (await getMockUserId());
    await prisma.stockNotification.create({
      data: {
        userId: finalUserId,
        oracleId,
        scryfallCardId: scryfallCardId || null,
      },
    });
    return { success: true };
  } catch (error) {
    console.error('Error subscribing to stock:', error);
    return { success: false, error: 'Failed to subscribe' };
  }
}

export async function getUserNotifications(userId?: string | null) {
  try {
    const finalUserId = userId || (await getMockUserId());
    const notifications = await prisma.notification.findMany({
      where: { userId: finalUserId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { success: true, data: notifications };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { success: false, error: 'Failed to fetch notifications' };
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: 'Failed to update notification' };
  }
}

export async function clearNotificationsAction(userId?: string | null) {
  try {
    const finalUserId = userId || (await getMockUserId());
    await prisma.notification.deleteMany({
      where: { userId: finalUserId },
    });
    return { success: true };
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return { success: false, error: 'Failed to clear notifications' };
  }
}

export async function markAllNotificationsAsReadAction(userId?: string | null) {
  try {
    const finalUserId = userId || (await getMockUserId());
    await prisma.notification.updateMany({
      where: { userId: finalUserId, read: false },
      data: { read: true },
    });
    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: 'Failed to update notifications' };
  }
}

export async function fulfillStockNotifications(scryfallCardId: string, oracleId: string) {
  try {
    const pending = await prisma.stockNotification.findMany({
      where: {
        isFulfilled: false,
        OR: [
          { scryfallCardId },
          { oracleId, scryfallCardId: null }
        ]
      },
      include: { user: true }
    });

    if (pending.length === 0) return;

    for (const notif of pending) {
      await prisma.notification.create({
        data: {
          userId: notif.userId,
          title: '¡Carta en Stock!',
          message: 'Una carta a la que estabas suscrito vuelve a estar en stock.',
          type: 'STOCK',
          linkUrl: `/player/singles?cardId=${scryfallCardId}`
        }
      });
      await prisma.stockNotification.update({
        where: { id: notif.id },
        data: { isFulfilled: true }
      });
    }
  } catch (error) {
    console.error('Error fulfilling stock notifications', error);
  }
}

export async function getUserStockNotifications(userId?: string | null) {
  try {
    const finalUserId = userId || (await getMockUserId());
    const subs = await prisma.stockNotification.findMany({
      where: { userId: finalUserId, isFulfilled: false },
      orderBy: { createdAt: 'desc' },
    });

    const subsWithCardNames = await Promise.all(subs.map(async (sub) => {
      let cardName = "Cualquier edición";
      if (sub.scryfallCardId) {
        const card = await prisma.scryfallCard.findUnique({ where: { id: sub.scryfallCardId } });
        if (card) cardName = `${card.name} (${card.setCode.toUpperCase()})`;
      } else {
        const card = await prisma.scryfallCard.findFirst({ where: { oracleId: sub.oracleId } });
        if (card) cardName = `${card.name} (Cualquier edición)`;
      }
      return {
        ...sub,
        cardName
      };
    }));

    return { success: true, data: subsWithCardNames };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function unsubscribeFromStockAction(id: string) {
  try {
    await prisma.stockNotification.delete({
      where: { id }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
