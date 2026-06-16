import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addToCartAction, checkoutAction } from '@/app/actions/cart-actions';

// Simulación (mock) de la base de datos
vi.mock('@/lib/db', () => {
  const mockTx = {
    stockItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    order: {
      create: vi.fn().mockResolvedValue({ id: 'order-1', totalPrice: 100 }),
    },
    cartItem: {
      deleteMany: vi.fn(),
    }
  };

  return {
    prisma: {
      $transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockTx);
      }),
      cart: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      stockItem: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      cartItem: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
        create: vi.fn(),
      }
    },
  };
});

vi.mock('@/lib/pricing-engine', () => ({
  populatePrices: vi.fn().mockResolvedValue([{ computedPrice: { finalPrice: 15.0 } }]),
}));

vi.mock('@/lib/auth', () => ({
  getMockUserId: vi.fn().mockResolvedValue('user-1'),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Cart Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addToCartAction', () => {
    it('rejects if requested qty > available stock (C-1)', async () => {
      const { prisma } = await import('@/lib/db');
      (prisma.cart.findUnique as any).mockResolvedValue({ id: 'cart-1', items: [] });
      (prisma.stockItem.findUnique as any).mockResolvedValue({ id: 'stock-1', quantity: 2, scryfallCard: {} });

      const result = await addToCartAction('stock-1', 3);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Not enough stock");
    });

    it('increments existing cart item quantity and updates priceAtAdd (C-2)', async () => {
      const { prisma } = await import('@/lib/db');
      (prisma.cart.findUnique as any).mockResolvedValue({ 
        id: 'cart-1', 
        items: [{ id: 'cartItem-1', stockItemId: 'stock-1', quantity: 1 }] 
      });
      (prisma.stockItem.findUnique as any).mockResolvedValue({ id: 'stock-1', quantity: 5, salePrice: 12.50, scryfallCard: {} });

      const result = await addToCartAction('stock-1', 2);
      expect(result.success).toBe(true);
      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'cartItem-1' },
        data: { quantity: 3, priceAtAdd: 12.50 }
      });
    });
  });

  describe('checkoutAction', () => {
    it('returns error on empty cart (C-3)', async () => {
      const { prisma } = await import('@/lib/db');
      (prisma.cart.findUnique as any).mockResolvedValue({ id: 'cart-1', items: [] });

      const result = await checkoutAction();
      expect(result.success).toBe(false);
      expect(result.message).toBe("Cart is empty");
    });

    it('decrements stock quantity and clears cart (C-4, C-5)', async () => {
      const { prisma } = await import('@/lib/db');
      (prisma.cart.findUnique as any).mockResolvedValue({ 
        id: 'cart-1', 
        items: [{ stockItemId: 'stock-1', quantity: 2, priceAtAdd: 10.0, stockItem: { scryfallCard: { name: 'Lotus' } } }] 
      });

      // Simulación del comportamiento interno de la transacción (tx)
      const txMock = {
        stockItem: {
          findUnique: vi.fn().mockResolvedValue({ id: 'stock-1', quantity: 5 }),
          update: vi.fn(),
        },
        order: { create: vi.fn().mockResolvedValue({ id: 'order-1' }) },
        cartItem: { deleteMany: vi.fn() }
      };

      (prisma.$transaction as any).mockImplementationOnce(async (cb: any) => cb(txMock));

      const result = await checkoutAction();
      
      expect(result.success).toBe(true);
      expect(txMock.stockItem.update).toHaveBeenCalledWith({
        where: { id: 'stock-1' },
        data: { quantity: { decrement: 2 } }
      });
      expect(txMock.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
      expect(txMock.order.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ totalPrice: 20.0 }) // 2 * 10.0
      }));
    });

    it('returns error if stock depleted between add and checkout (TOCTOU guard) (C-6)', async () => {
      const { prisma } = await import('@/lib/db');
      (prisma.cart.findUnique as any).mockResolvedValue({ 
        id: 'cart-1', 
        items: [{ stockItemId: 'stock-1', quantity: 2, priceAtAdd: 10.0, stockItem: { scryfallCard: { name: 'Lotus' } } }] 
      });

      const txMock = {
        stockItem: {
          findUnique: vi.fn().mockResolvedValue({ id: 'stock-1', quantity: 1 }), // Only 1 left!
          update: vi.fn(),
        },
        order: { create: vi.fn() },
        cartItem: { deleteMany: vi.fn() }
      };

      (prisma.$transaction as any).mockImplementationOnce(async (cb: any) => cb(txMock));

      const result = await checkoutAction();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("No hay suficiente stock");
      expect(txMock.order.create).not.toHaveBeenCalled();
    });
  });
});
