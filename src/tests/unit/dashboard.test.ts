import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardMetrics } from '@/lib/actions/dashboard';

// Simulación (mock) de la base de datos
vi.mock('@/lib/db', () => {
  return {
    prisma: {
      order: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      stockItem: {
        findMany: vi.fn(),
      },
      tournament: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      buylistRequest: {
        findMany: vi.fn(),
      },
    },
  };
});

describe('Dashboard BI Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches metrics correctly for 30d range', async () => {
    const { prisma } = await import('@/lib/db');

    const mockOrders = [
      { totalPrice: 100.0, createdAt: new Date() },
      { totalPrice: 50.0, createdAt: new Date() },
    ];
    (prisma.order.findMany as any).mockResolvedValue(mockOrders);
    (prisma.order.count as any).mockResolvedValue(1); // 1 pedido pendiente
    
    (prisma.stockItem.findMany as any).mockResolvedValue([
      { quantity: 10, salePrice: 5.0 },
      { quantity: 2, salePrice: 15.0 },
    ]);

    (prisma.tournament.findMany as any).mockResolvedValue([
      {
        id: 't-1',
        _count: { registrations: 12 },
      },
    ]);
    (prisma.tournament.count as any).mockResolvedValue(3); // 3 torneos próximos

    (prisma.buylistRequest.findMany as any)
      .mockResolvedValueOnce([{ totalPrice: 40.0 }]) // buylist pendiente
      .mockResolvedValueOnce([{ totalPrice: 120.0 }]); // buylist aprobada

    const result = await getDashboardMetrics('30d');

    // Verificaciones (asserts)
    expect(result.sales.totalRevenue).toBe(150.0);
    expect(result.sales.aov).toBe(75.0);
    expect(result.sales.pendingOrdersCount).toBe(1);
    expect(result.inventory.totalValue).toBe(80.0); // (10*5) + (2*15) = 50 + 30 = 80
    expect(result.tournaments.avgAttendance).toBe(12.0);
    expect(result.tournaments.upcomingCount).toBe(3);
    expect(result.buylist.pendingValue).toBe(40.0);
    expect(result.buylist.approvedVolume).toBe(120.0);
  });

  it('handles custom ranges correctly', async () => {
    const { prisma } = await import('@/lib/db');

    (prisma.order.findMany as any).mockResolvedValue([]);
    (prisma.order.count as any).mockResolvedValue(0);
    (prisma.stockItem.findMany as any).mockResolvedValue([]);
    (prisma.tournament.findMany as any).mockResolvedValue([]);
    (prisma.tournament.count as any).mockResolvedValue(0);
    (prisma.buylistRequest.findMany as any).mockResolvedValue([]);

    await getDashboardMetrics('custom', '2026-06-01', '2026-06-10');

    // Verificar que se pasen las fechas correctas a la consulta de Prisma
    expect(prisma.order.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: new Date('2026-06-01T00:00:00'),
            lte: new Date('2026-06-10T23:59:59.999'),
          },
        }),
      })
    );
  });
});
