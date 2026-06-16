"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// --- Modificadores de Condición ---

export async function getConditionModifiersAction() {
  try {
    const modifiers = await prisma.conditionModifier.findMany();
    return { success: true, data: modifiers };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function upsertConditionModifierAction(condition: string, multiplier: number) {
  try {
    const modifier = await prisma.conditionModifier.upsert({
      where: { condition },
      update: { multiplier },
      create: { condition, multiplier }
    });
    revalidatePath("/admin/pricing");
    return { success: true, data: modifier };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// --- Reglas de Tarificación ---
export async function getPricingRulesAction() {
    try {
        const rules = await prisma.pricingRule.findMany();
        return { success: true, data: rules };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}


// --- Bandas de Redondeo (Rounding Bands) ---

export async function getRoundingBandsAction() {
  try {
    const bands = await prisma.roundingBand.findMany({
      orderBy: { priority: "asc" }
    });
    return { success: true, data: bands };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function upsertRoundingBandAction(
  id: string | null,
  minPrice: number,
  maxPrice: number,
  roundTo: number,
  priority: number
) {
  try {
    let band;
    if (id) {
      band = await prisma.roundingBand.update({
        where: { id },
        data: { minPrice, maxPrice, roundTo, priority }
      });
    } else {
      band = await prisma.roundingBand.create({
        data: { minPrice, maxPrice, roundTo, priority }
      });
    }
    revalidatePath("/admin/pricing");
    return { success: true, data: band };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteRoundingBandAction(id: string) {
  try {
    await prisma.roundingBand.delete({ where: { id } });
    revalidatePath("/admin/pricing");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// --- Ofertas Relámpago (Flash Sales) ---

export async function getFlashSalesAction() {
  try {
    const sales = await prisma.flashSale.findMany({
      include: {
        items: {
            include: {
                stockItem: {
                    include: {
                        scryfallCard: true
                    }
                }
            }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return { success: true, data: sales };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function createFlashSaleAction(
  name: string,
  discount: number,
  startsAt: Date,
  expiresAt: Date,
  stockItemIds: string[]
) {
  try {
    const sale = await prisma.flashSale.create({
      data: {
        name,
        discount,
        startsAt,
        expiresAt,
        isActive: true,
        items: {
          create: stockItemIds.map(id => ({ stockItemId: id }))
        }
      }
    });
    revalidatePath("/admin/pricing");
    return { success: true, data: sale };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteFlashSaleAction(id: string) {
  try {
    await prisma.flashSaleItem.deleteMany({ where: { flashSaleId: id } });
    await prisma.flashSale.delete({ where: { id } });
    revalidatePath("/admin/pricing");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function expireStaleFlashSalesAction() {
  try {
    const now = new Date();
    await prisma.flashSale.updateMany({
      where: {
        isActive: true,
        expiresAt: { lt: now }
      },
      data: { isActive: false }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function bulkDeleteStockItemsAction(ids: string[]) {
  try {
    await prisma.stockItem.deleteMany({
      where: { id: { in: ids } }
    });
    revalidatePath("/admin/singles");
    revalidatePath("/player/singles");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function syncPricesAction() {
  const log = await prisma.syncLog.create({
    data: {
      type: "SCRYFALL_PRICES",
      status: "RUNNING",
    }
  });

  try {
    const { analyzePriceChanges } = await import("./price-alert-actions");
    const cards = await prisma.scryfallCard.findMany();
    let upsertedCount = 0;

    for (const card of cards) {
      try {
        const res = await fetch(`https://api.scryfall.com/cards/${card.id}`, {
          headers: {
            "User-Agent": "MTGManager/1.0",
            "Accept": "application/json"
          }
        });
        
        if (!res.ok) continue;
        const scryfallData = await res.json();
        const prices = scryfallData.prices || {};

        await prisma.scryfallCard.update({
          where: { id: card.id },
          data: {
            priceEur: prices.eur ? parseFloat(prices.eur) : null,
            priceEurFoil: prices.eur_foil ? parseFloat(prices.eur_foil) : null,
            pricesUpdatedAt: new Date(),
          }
        });

        if (prices.eur || prices.eur_foil) {
          await prisma.priceHistory.create({
            data: {
              scryfallCardId: card.id,
              priceEur: prices.eur ? parseFloat(prices.eur) : null,
              priceEurFoil: prices.eur_foil ? parseFloat(prices.eur_foil) : null,
              recordedAt: new Date(),
            }
          });
        }

        upsertedCount++;
        await prisma.syncLog.update({
          where: { id: log.id },
          data: { cardsUpserted: upsertedCount }
        });
      } catch (e) {
        console.error(`Failed to sync card ${card.id}:`, e);
      }

      await new Promise(r => setTimeout(r, 150));
    }

    const store = await prisma.store.findFirst();
    if (store) {
      await analyzePriceChanges(store.id);
    }

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: "SUCCESS",
        cardsUpserted: upsertedCount,
        finishedAt: new Date(),
      }
    });

    revalidatePath("/admin/pricing");
    return { success: true, count: upsertedCount };
  } catch (error: any) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        error: error.message,
        finishedAt: new Date(),
      }
    });
    revalidatePath("/admin/pricing");
    return { success: false, message: error.message };
  }
}

export async function getSyncLogsAction() {
  try {
    const logs = await prisma.syncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 20
    });
    return { success: true, data: logs };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
