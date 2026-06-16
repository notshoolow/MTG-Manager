import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchScryfallLiveAction, addStockItemAction, fetchScryfallAutocompleteAction, updateStockItemAction, deletePricingRuleAction, bulkImportAction } from '@/app/actions/inventory-actions';

// Simulación (mock) de fetch para la API de Scryfall
global.fetch = vi.fn();

// Simulación (mock) de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    scryfallCard: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    stockItem: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    pricingRule: {
      delete: vi.fn(),
    },
    priceHistory: {
      create: vi.fn(),
    },
  },
}));

// Simulación (mock) de next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/app/actions/notification-actions', () => ({
  fulfillStockNotifications: vi.fn(),
}));

describe('Inventory Actions', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import('@/lib/db');
    (prisma.$queryRawUnsafe as any).mockResolvedValue([]);
  });

  describe('fetchScryfallAutocompleteAction', () => {
    it('returns array of strings', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: ['Black Lotus', 'Black Knight'] }),
      });
      const result = await fetchScryfallAutocompleteAction('black');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Black Lotus', 'Black Knight']);
    });
  });

  describe('searchScryfallLiveAction', () => {
    it('returns error for short queries', async () => {
      const result = await searchScryfallLiveAction('ab');
      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
    });

    it('returns success and data on successful search with game:paper', async () => {
      const mockData = { data: [{ id: '1', name: 'Black Lotus' }] };
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await searchScryfallLiveAction('black lotus');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData.data);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('game%3Apaper'), expect.any(Object));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('unique=prints'), expect.any(Object));
    });

    it('handles API errors', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        json: async () => ({ details: 'Not found' }),
      });

      const result = await searchScryfallLiveAction('nonexistentcard');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Not found');
    });
  });

  describe('addStockItemAction', () => {
    it('successfully adds a stock item with language', async () => {
      const scryfallData = { id: 'scry-1', name: 'Test Card', prices: { eur: '10.5' } };
      const { prisma } = await import('@/lib/db');
      
      (prisma.scryfallCard.upsert as any).mockResolvedValue({ id: 'scry-1' });
      (prisma.stockItem.upsert as any).mockResolvedValue({ id: 'stock-1', quantity: 1 });

      const result = await addStockItemAction(
        scryfallData,
        'NEAR_MINT',
        'NON_FOIL',
        'es',
        1,
        'MANUAL',
        12.0,
        null
      );

      expect(result.success).toBe(true);
      expect(prisma.scryfallCard.upsert).toHaveBeenCalled();
      expect(prisma.stockItem.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          scryfallCardId_condition_finish_language: {
            scryfallCardId: 'scry-1',
            condition: 'NEAR_MINT',
            finish: 'NON_FOIL',
            language: 'es'
          }
        }
      }));
    });

    it('returns error if quantity < 0 (I-2)', async () => {
      const result = await addStockItemAction({}, 'NM', 'nonfoil', 'en', -1, 'MANUAL', 10, null);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Quantity cannot be negative");
    });

    it('sets salePrice to null if priceMode is AUTO_RULE (I-5)', async () => {
      const scryfallData = { id: 'scry-1', prices: {} };
      const { prisma } = await import('@/lib/db');
      
      (prisma.scryfallCard.upsert as any).mockResolvedValue({ id: 'scry-1' });
      (prisma.stockItem.upsert as any).mockResolvedValue({ id: 'stock-1', quantity: 1 });

      await addStockItemAction(scryfallData, 'NM', 'nonfoil', 'en', 1, 'AUTO_RULE', 10, 'rule-1');

      expect(prisma.stockItem.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({ salePrice: null, pricingRuleId: 'rule-1' }),
        update: expect.objectContaining({ salePrice: null, pricingRuleId: 'rule-1' }),
      }));
    });
  });

  describe('updateStockItemAction', () => {
    it('calls fulfillStockNotifications after merging variants (I-3)', async () => {
      const { prisma } = await import('@/lib/db');
      const { fulfillStockNotifications } = await import('@/app/actions/notification-actions');
      
      (prisma.stockItem.findUnique as any)
        .mockResolvedValueOnce({ id: 'old-1', scryfallCardId: 'scry-1', condition: 'LP', finish: 'nonfoil', language: 'en', quantity: 1 })
        .mockResolvedValueOnce({ id: 'target-1', scryfallCardId: 'scry-1', condition: 'NM', finish: 'nonfoil', language: 'en', quantity: 2, salePrice: 10, priceMode: 'MANUAL' });
        
      (prisma.stockItem.update as any).mockResolvedValue({ id: 'target-1', quantity: 3 });
      (prisma.scryfallCard.findUnique as any).mockResolvedValue({ id: 'scry-1', oracleId: 'oracle-1' });

      const result = await updateStockItemAction('old-1', { condition: 'NM' });

      expect(result.success).toBe(true);
      expect(prisma.stockItem.delete).toHaveBeenCalledWith({ where: { id: 'old-1' } });
      expect(fulfillStockNotifications).toHaveBeenCalledWith('scry-1', 'oracle-1');
    });
  });

  describe('deletePricingRuleAction', () => {
    it('reverts affected items to MANUAL mode (I-4)', async () => {
      const { prisma } = await import('@/lib/db');
      
      await deletePricingRuleAction('rule-1');
      
      expect(prisma.stockItem.updateMany).toHaveBeenCalledWith({
        where: { pricingRuleId: 'rule-1' },
        data: { priceMode: 'MANUAL', pricingRuleId: null }
      });
      expect(prisma.pricingRule.delete).toHaveBeenCalledWith({ where: { id: 'rule-1' } });
    });
  });

  describe('bulkImportAction', () => {
    it('stops processing after BULK_IMPORT_MAX_LINES (I-6)', async () => {
      // Simulación de searchScryfallLiveAction empleando implícitamente fetch en bulkImportAction
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: 'scry-1' }] })
      });
      
      const { prisma } = await import('@/lib/db');
      (prisma.scryfallCard.upsert as any).mockResolvedValue({ id: 'scry-1' });
      (prisma.stockItem.upsert as any).mockResolvedValue({ id: 'stock-1', quantity: 1 });

      const lines = Array.from({ length: 1500 }, (_, i) => ({
        raw: `1 Card ${i}`, quantity: 1, name: `Card ${i}`, condition: "NM" as const, finish: "nonfoil" as const, language: "en" as const
      }));

      const result = await bulkImportAction(lines);

      expect(result.imported.length).toBe(1000);
      expect(result.failed.length).toBe(0);
      expect(fetch).toHaveBeenCalledTimes(1000);
    });
  });
});
