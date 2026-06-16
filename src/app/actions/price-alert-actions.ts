'use server';

import { prisma } from '@/lib/db';

export async function analyzePriceChanges(storeId: string) {
  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { owner: true },
    });

    if (!store) return { success: false, error: 'Store not found' };

    const dailyThreshold = store.priceAlertDailyThreshold;
    const weeklyThreshold = store.priceAlertWeeklyThreshold;

    // Obtención de los identificadores unívocos scryfallCardId a partir de las variantes en stock (MVP con tienda única: todo el stock pertenece a dicha tienda)
    const stockItems = await prisma.stockItem.findMany({
      select: { scryfallCardId: true },
      distinct: ['scryfallCardId'],
    });

    const cardIds = stockItems.map((s) => s.scryfallCardId);

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Recuperación de todo el histórico relevante en una única consulta para prevenir problemas de rendimiento N+1
    const allHistory = await prisma.priceHistory.findMany({
      where: { 
        scryfallCardId: { in: cardIds },
        recordedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } // límite retrospectivo de 30 días
      },
      orderBy: { recordedAt: 'desc' },
    });

    // Agrupación de registros históricos indexados por identificador de carta (cardId)
    const historyByCard: Record<string, typeof allHistory> = {};
    for (const h of allHistory) {
      if (!historyByCard[h.scryfallCardId]) {
        historyByCard[h.scryfallCardId] = [];
      }
      historyByCard[h.scryfallCardId].push(h);
    }

    for (const cardId of cardIds) {
      const history = historyByCard[cardId] || [];

      if (history.length < 2) continue;

      const currentPrice = history[0].priceEur || 0;
      if (currentPrice === 0) continue;

      // Búsqueda del precio histórico aproximado de hace 1 día
      const dailyPriceRecord = history.find(h => h.recordedAt <= oneDayAgo);
      // Búsqueda del precio histórico aproximado de hace 7 días
      const weeklyPriceRecord = history.find(h => h.recordedAt <= sevenDaysAgo);

      let alertCreated = false;

      // Evaluación de variaciones en la ventana diaria
      if (dailyPriceRecord && dailyPriceRecord.priceEur) {
        const oldPrice = dailyPriceRecord.priceEur;
        const change = ((currentPrice - oldPrice) / oldPrice) * 100;
        
        if (Math.abs(change) >= dailyThreshold) {
          await createAlert(storeId, store.ownerId, cardId, oldPrice, currentPrice, change, 'DAILY');
          alertCreated = true;
        }
      }

      // Evaluación en la ventana semanal únicamente si no se activó la alerta diaria, mitigando notificaciones redundantes
      if (!alertCreated && weeklyPriceRecord && weeklyPriceRecord.priceEur) {
        const oldPrice = weeklyPriceRecord.priceEur;
        const change = ((currentPrice - oldPrice) / oldPrice) * 100;

        if (Math.abs(change) >= weeklyThreshold) {
          await createAlert(storeId, store.ownerId, cardId, oldPrice, currentPrice, change, 'WEEKLY');
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error analyzing prices:', error);
    return { success: false, error: 'Failed to analyze prices' };
  }
}

async function createAlert(
  storeId: string, 
  ownerId: string, 
  scryfallCardId: string, 
  oldPrice: number, 
  newPrice: number, 
  change: number, 
  timeframe: string
) {
  // Prevención de alertas duplicadas dentro de un intervalo temporal reducido
  const recentAlert = await prisma.priceAlert.findFirst({
    where: {
      storeId,
      scryfallCardId,
      timeframe,
      createdAt: {
        gte: new Date(Date.now() - 12 * 60 * 60 * 1000) // ventana de 12 horas
      }
    }
  });

  if (recentAlert) return;

  await prisma.priceAlert.create({
    data: {
      storeId,
      scryfallCardId,
      oldPrice,
      newPrice,
      percentageChange: change,
      timeframe,
    }
  });

  const direction = change > 0 ? 'subido' : 'bajado';
  await prisma.notification.create({
    data: {
      userId: ownerId,
      title: `Alerta de Precio (${timeframe})`,
      message: `Una carta en tu inventario ha ${direction} un ${Math.abs(change).toFixed(2)}% de precio. Nuevo precio: €${newPrice.toFixed(2)}`,
      type: 'PRICE_ALERT',
      linkUrl: `/admin/singles`
    }
  });
}
