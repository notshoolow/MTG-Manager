'use server';

import { prisma } from '@/lib/db';

export async function getCardPriceHistory(scryfallCardId: string) {
  try {
    const history = await prisma.priceHistory.findMany({
      where: { scryfallCardId },
      orderBy: { recordedAt: 'asc' },
    });

    return {
      success: true,
      data: history.map((record) => ({
        date: record.recordedAt.toISOString().split('T')[0],
        priceEur: record.priceEur,
        priceEurFoil: record.priceEurFoil,
      })),
    };
  } catch (error) {
    console.error('Error fetching price history:', error);
    return { success: false, error: 'Failed to fetch price history' };
  }
}
