import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fulfillStockNotifications, subscribeToStock, clearNotificationsAction, markAllNotificationsAsReadAction } from '@/app/actions/notification-actions';

// Simulación (mock) de la base de datos
vi.mock('@/lib/db', () => ({
  prisma: {
    stockNotification: {
      findMany: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    }
  },
}));

vi.mock('@/lib/auth', () => ({
  getMockUserId: vi.fn().mockResolvedValue('user-1'),
}));

describe('Notification Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fulfillStockNotifications', () => {
    it('matches exact scryfallCardId subscriptions (N-1) and creates notification (N-3)', async () => {
      const { prisma } = await import('@/lib/db');
      
      (prisma.stockNotification.findMany as any).mockResolvedValue([
        { id: 'sub-1', userId: 'user-2', scryfallCardId: 'exact-scryfall-id', oracleId: 'oracle-1' }
      ]);

      await fulfillStockNotifications('exact-scryfall-id', 'oracle-1');

      expect(prisma.stockNotification.findMany).toHaveBeenCalledWith({
        where: {
          isFulfilled: false,
          OR: [
            { scryfallCardId: 'exact-scryfall-id' },
            { oracleId: 'oracle-1', scryfallCardId: null }
          ]
        },
        include: { user: true }
      });
      
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-2',
          type: 'STOCK',
          linkUrl: '/player/singles?cardId=exact-scryfall-id'
        })
      });
      
      expect(prisma.stockNotification.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { isFulfilled: true }
      });
    });

    it('matches Any Edition subscriptions where scryfallCardId is null (N-2)', async () => {
      const { prisma } = await import('@/lib/db');
      
      (prisma.stockNotification.findMany as any).mockResolvedValue([
        { id: 'sub-2', userId: 'user-3', scryfallCardId: null, oracleId: 'oracle-1' }
      ]);

      await fulfillStockNotifications('some-new-scryfall-id', 'oracle-1');

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-3',
          type: 'STOCK',
        })
      });
      expect(prisma.stockNotification.update).toHaveBeenCalledWith({
        where: { id: 'sub-2' },
        data: { isFulfilled: true }
      });
    });

    it('does not match if subscription is for a DIFFERENT specific scryfallCardId', async () => {
      const { prisma } = await import('@/lib/db');
      
      (prisma.stockNotification.findMany as any).mockResolvedValue([]);

      await fulfillStockNotifications('some-new-scryfall-id', 'oracle-1');

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(prisma.stockNotification.update).not.toHaveBeenCalled();
    });

    it('notifies multiple users correctly (N-4)', async () => {
      const { prisma } = await import('@/lib/db');
      
      (prisma.stockNotification.findMany as any).mockResolvedValue([
        { id: 'sub-1', userId: 'user-1', scryfallCardId: null, oracleId: 'oracle-1' },
        { id: 'sub-2', userId: 'user-2', scryfallCardId: 'exact-id', oracleId: 'oracle-1' },
      ]);

      await fulfillStockNotifications('exact-id', 'oracle-1');

      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
      expect(prisma.stockNotification.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('subscribeToStock', () => {
    it('creates a subscription with null scryfallCardId when not provided', async () => {
      const { prisma } = await import('@/lib/db');

      await subscribeToStock('user-1', 'oracle-1', null);

      expect(prisma.stockNotification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          oracleId: 'oracle-1',
          scryfallCardId: null
        }
      });
    });
  });

  describe('clearNotificationsAction', () => {
    it('deletes all notifications for the user', async () => {
      const { prisma } = await import('@/lib/db');
      await clearNotificationsAction('user-1');
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' }
      });
    });
  });

  describe('markAllNotificationsAsReadAction', () => {
    it('updates all unread notifications for the user to read: true', async () => {
      const { prisma } = await import('@/lib/db');
      await markAllNotificationsAsReadAction('user-1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
        data: { read: true }
      });
    });
  });
});
