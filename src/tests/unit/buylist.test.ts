import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getPlayerBuylistRequestsAction, 
  getAdminBuylistRequestsAction, 
  getBuylistRequestDetailAction, 
  createBuylistRequestAction, 
  updateBuylistRequestAction 
} from '@/app/actions/buylist-actions';

// Simulación (mock) de la base de datos
vi.mock('@/lib/db', () => {
  const mockTx = {
    buylistRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    scryfallCard: {
      upsert: vi.fn(),
    },
    stockItem: {
      upsert: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    user: {
      update: vi.fn(),
    }
  };

  return {
    prisma: {
      $transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockTx);
      }),
      store: {
        findFirst: vi.fn(),
      },
      conditionModifier: {
        findMany: vi.fn().mockResolvedValue([
          { condition: "NM", multiplier: 1.0 },
          { condition: "LP", multiplier: 0.90 },
          { condition: "MP", multiplier: 0.75 },
          { condition: "HP", multiplier: 0.50 },
          { condition: "PO", multiplier: 0.25 }
        ]),
        upsert: vi.fn(),
        createMany: vi.fn(),
      },
      buylistPriceBand: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      buylistRequest: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      buylistItem: {
        create: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      notification: {
        create: vi.fn(),
      }
    },
  };
});

vi.mock('@/lib/auth', () => ({
  getMockUserId: vi.fn().mockResolvedValue('user-1'),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/app/actions/inventory-actions', () => ({
  ensureScryfallCard: vi.fn().mockResolvedValue({ id: 'card-1' }),
}));

vi.mock('@/app/actions/notification-actions', () => ({
  fulfillStockNotifications: vi.fn(),
}));

describe('Buylist Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPlayerBuylistRequestsAction', () => {
    it('fetches requests for current mock user', async () => {
      const { prisma } = await import('@/lib/db');
      (prisma.buylistRequest.findMany as any).mockResolvedValue([{ id: 'req-1', userId: 'user-1', totalPrice: 10 }]);

      const result = await getPlayerBuylistRequestsAction();
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 'req-1', userId: 'user-1', totalPrice: 10 }]);
      expect(prisma.buylistRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' }
        })
      );
    });
  });

  describe('createBuylistRequestAction', () => {
    it('returns error if items is empty', async () => {
      const result = await createBuylistRequestAction([]);
      expect(result.success).toBe(false);
      expect(result.message).toBe("La lista de cartas está vacía.");
    });

    it('creates a request with calculated prices based on default rate', async () => {
      const { prisma } = await import('@/lib/db');
      (prisma.store.findFirst as any).mockResolvedValue({ buylistDefaultRate: 70, buylistDefaultRateCredit: 75 });
      (prisma.buylistRequest.create as any).mockResolvedValue({ id: 'req-1', totalPrice: 7.0 });

      const items = [{
        scryfallCardData: { id: 'card-1', name: 'Lightning Bolt', prices: { eur: '10.0' } },
        quantity: 1,
        condition: 'NM',
        finish: 'nonfoil',
        language: 'en',
        marketPrice: 10.0,
        buyPrice: 7.0
      }];

      const result = await createBuylistRequestAction(items, 'CASH');
      expect(result.success).toBe(true);
      expect(prisma.buylistRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            status: 'PENDING',
            defaultRate: 70,
            tradeType: 'CASH',
            totalPrice: 7.0,
          })
        })
      );
    });

    it('creates a request with defaultRateCredit for STORE_CREDIT trade type', async () => {
      const { prisma } = await import('@/lib/db');
      (prisma.store.findFirst as any).mockResolvedValue({ buylistDefaultRate: 70, buylistDefaultRateCredit: 75 });
      (prisma.buylistRequest.create as any).mockResolvedValue({ id: 'req-1', totalPrice: 7.5 });

      const items = [{
        scryfallCardData: { id: 'card-1', name: 'Lightning Bolt', prices: { eur: '10.0' } },
        quantity: 1,
        condition: 'NM',
        finish: 'nonfoil',
        language: 'en',
        marketPrice: 10.0,
        buyPrice: 7.5
      }];

      const result = await createBuylistRequestAction(items, 'STORE_CREDIT');
      expect(result.success).toBe(true);
      expect(prisma.buylistRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            status: 'PENDING',
            defaultRate: 75,
            tradeType: 'STORE_CREDIT',
            totalPrice: 7.5,
          })
        })
      );
    });

    it('applies condition multipliers in buy price calculations', async () => {
      const { prisma } = await import('@/lib/db');
      (prisma.store.findFirst as any).mockResolvedValue({ buylistDefaultRate: 70, buylistDefaultRateCredit: 75 });
      (prisma.conditionModifier.findMany as any).mockResolvedValue([
        { condition: "NM", multiplier: 1.0 },
        { condition: "LP", multiplier: 0.80 },
        { condition: "MP", multiplier: 0.50 }
      ]);
      (prisma.buylistRequest.create as any).mockResolvedValue({ id: 'req-1', totalPrice: 12.60 });

      const items = [
        {
          scryfallCardData: { id: 'card-1', name: 'Lightning Bolt', prices: { eur: '10.0' } },
          quantity: 1,
          condition: 'LP',
          finish: 'nonfoil',
          language: 'en',
          marketPrice: 10.0,
          buyPrice: 5.60
        },
        {
          scryfallCardData: { id: 'card-2', name: 'Brainstorm', prices: { eur: '20.0' } },
          quantity: 1,
          condition: 'MP',
          finish: 'nonfoil',
          language: 'en',
          marketPrice: 20.0,
          buyPrice: 7.0
        }
      ];

      const result = await createBuylistRequestAction(items, 'CASH');
      expect(result.success).toBe(true);
      expect(prisma.buylistRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalPrice: 12.60
          })
        })
      );
    });

    it('applies matching price bands instead of fallback default rates when available', async () => {
      const { prisma } = await import('@/lib/db');
      (prisma.store.findFirst as any).mockResolvedValue({ buylistDefaultRate: 70, buylistDefaultRateCredit: 75 });
      (prisma.conditionModifier.findMany as any).mockResolvedValue([
        { condition: "NM", multiplier: 1.0 }
      ]);
      (prisma.buylistPriceBand.findMany as any).mockResolvedValue([
        { minPrice: 0, maxPrice: 10, rateCash: 50, rateCredit: 55 }
      ]);
      (prisma.buylistRequest.create as any).mockResolvedValue({ id: 'req-1', totalPrice: 18.0 });

      const items = [
        {
          scryfallCardData: { id: 'card-1', name: 'Cheap Card', prices: { eur: '8.0' } },
          quantity: 1,
          condition: 'NM',
          finish: 'nonfoil',
          language: 'en',
          marketPrice: 8.0,
          buyPrice: 4.0 // 8 * 50% = 4.0
        },
        {
          scryfallCardData: { id: 'card-2', name: 'Expensive Card', prices: { eur: '20.0' } },
          quantity: 1,
          condition: 'NM',
          finish: 'nonfoil',
          language: 'en',
          marketPrice: 20.0,
          buyPrice: 14.0 // 20 * 70% = 14.0
        }
      ];

      const result = await createBuylistRequestAction(items, 'CASH');
      expect(result.success).toBe(true);
      expect(prisma.buylistRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalPrice: 18.0
          })
        })
      );
    });
  });

  describe('updateBuylistRequestAction', () => {
    it('processes transaction, updates status and inserts stock items on APPROVE', async () => {
      const { prisma } = await import('@/lib/db');
      const { fulfillStockNotifications } = await import('@/app/actions/notification-actions');
      
      const initialRequest = {
        id: 'req-1',
        userId: 'user-1',
        status: 'PENDING',
        totalPrice: 7.0,
        defaultRate: 70,
        tradeType: 'CASH',
        items: [{ id: 'item-1', scryfallCardId: 'card-1', quantity: 2, condition: 'NM', finish: 'nonfoil', language: 'en', marketPrice: 10, buyPrice: 7 }]
      };

      const updatedRequest = {
        ...initialRequest,
        status: 'APPROVED',
        items: [{ id: 'item-1', scryfallCardId: 'card-1', quantity: 2, condition: 'NM', finish: 'nonfoil', language: 'en', marketPrice: 10, buyPrice: 7, scryfallCard: { id: 'card-1', oracleId: 'oracle-1' } }]
      };

      const txMock = {
        buylistRequest: {
          findUnique: vi.fn().mockResolvedValue(initialRequest),
          update: vi.fn().mockResolvedValue(updatedRequest),
        },
        stockItem: {
          upsert: vi.fn().mockResolvedValue({ id: 'stock-1' }),
        },
        notification: {
          create: vi.fn(),
        },
        user: {
          update: vi.fn(),
        }
      };

      (prisma.$transaction as any).mockImplementationOnce(async (cb: any) => cb(txMock));

      const itemsInput = [{
        scryfallCardId: 'card-1',
        quantity: 2,
        condition: 'NM',
        finish: 'nonfoil',
        language: 'en',
        marketPrice: 10.0,
        buyPrice: 7.0
      }];

      const result = await updateBuylistRequestAction('req-1', 'APPROVED', itemsInput, 'CASH');
      
      expect(result.success).toBe(true);
      expect(txMock.buylistRequest.findUnique).toHaveBeenCalledWith({ where: { id: 'req-1' }, include: { items: true } });
      expect(txMock.buylistRequest.update).toHaveBeenCalled();
      expect(txMock.stockItem.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          scryfallCardId_condition_finish_language: {
            scryfallCardId: 'card-1',
            condition: 'NM',
            finish: 'nonfoil',
            language: 'en'
          }
        },
        create: expect.objectContaining({
          quantity: 2,
          priceMode: 'MANUAL',
          salePrice: 10.0
        })
      }));
      expect(txMock.user.update).not.toHaveBeenCalled(); // El pago en efectivo no incrementa el saldo en la cartera
      expect(txMock.notification.create).toHaveBeenCalled();
      expect(fulfillStockNotifications).toHaveBeenCalledWith('card-1', 'oracle-1');
    });

    it('increments player storeCredit wallet when approved trade type is STORE_CREDIT', async () => {
      const { prisma } = await import('@/lib/db');
      
      const initialRequest = {
        id: 'req-1',
        userId: 'user-1',
        status: 'PENDING',
        totalPrice: 15.0,
        defaultRate: 75,
        tradeType: 'STORE_CREDIT',
        items: [{ id: 'item-1', scryfallCardId: 'card-1', quantity: 2, condition: 'NM', finish: 'nonfoil', language: 'en', marketPrice: 10, buyPrice: 7.5 }]
      };

      const updatedRequest = {
        ...initialRequest,
        status: 'APPROVED',
        items: [{ id: 'item-1', scryfallCardId: 'card-1', quantity: 2, condition: 'NM', finish: 'nonfoil', language: 'en', marketPrice: 10, buyPrice: 7.5, scryfallCard: { id: 'card-1', oracleId: 'oracle-1' } }]
      };

      const txMock = {
        buylistRequest: {
          findUnique: vi.fn().mockResolvedValue(initialRequest),
          update: vi.fn().mockResolvedValue(updatedRequest),
        },
        stockItem: {
          upsert: vi.fn().mockResolvedValue({ id: 'stock-1' }),
        },
        notification: {
          create: vi.fn(),
        },
        user: {
          update: vi.fn().mockResolvedValue({ id: 'user-1', storeCredit: 15.0 }),
        }
      };

      (prisma.$transaction as any).mockImplementationOnce(async (cb: any) => cb(txMock));

      const itemsInput = [{
        scryfallCardId: 'card-1',
        quantity: 2,
        condition: 'NM',
        finish: 'nonfoil',
        language: 'en',
        marketPrice: 10.0,
        buyPrice: 7.5
      }];

      const result = await updateBuylistRequestAction('req-1', 'APPROVED', itemsInput, 'STORE_CREDIT');
      
      expect(result.success).toBe(true);
      expect(txMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          storeCredit: { increment: 15.0 }
        }
      });
    });

    it('rejects update if status is not PENDING', async () => {
      const { prisma } = await import('@/lib/db');
      const txMock = {
        buylistRequest: {
          findUnique: vi.fn().mockResolvedValue({ id: 'req-1', status: 'APPROVED' }),
        }
      };

      (prisma.$transaction as any).mockImplementationOnce(async (cb: any) => cb(txMock));

      const result = await updateBuylistRequestAction('req-1', 'APPROVED', [{
        scryfallCardId: 'card-1',
        quantity: 2,
        condition: 'NM',
        finish: 'nonfoil',
        language: 'en',
        marketPrice: 10.0,
        buyPrice: 7.0
      }]);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Esta tasación ya ha sido procesada.");
    });
  });
});
