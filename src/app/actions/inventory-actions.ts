"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { ParsedImportLine } from "@/lib/bulk-import-parser";
import { BULK_IMPORT_MAX_LINES } from "@/lib/bulk-import-parser";
import { fulfillStockNotifications } from "./notification-actions";

/**
 * Servicio de autocompletado utilizando la API de Scryfall.
 */
export async function fetchScryfallAutocompleteAction(query: string) {
  if (!query || query.length < 2) return { success: false, data: [] };
  try {
    const res = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`, {
      headers: {
         'User-Agent': 'MTGManager/1.0',
         'Accept': 'application/json'
      }
    });
    if (!res.ok) {
       const err = await res.json();
       return { success: false, message: err.details || "Search failed" };
    }
    const data = await res.json();
    return { success: true, data: data.data || [] };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Realiza búsquedas de cartas en tiempo real en la API de Scryfall.
 */
export async function searchScryfallLiveAction(query: string) {
  if (!query || query.length < 3) return { success: false, data: [] };
  
  try {
    const finalQuery = query.includes('game:paper') ? query : `${query} game:paper`;
    const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(finalQuery)}&unique=prints&order=released`, {
      headers: {
         'User-Agent': 'MTGManager/1.0',
         'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
       const err = await res.json();
       return { success: false, message: err.details || "Search failed" };
    }
    
    const data = await res.json();
    return { success: true, data: data.data || [] };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Garantiza la existencia de una carta en la base de datos local antes de modificar el inventario.
 * Si no está registrada, la crea utilizando los metadatos provistos por la API de Scryfall.
 */
export async function ensureScryfallCard(scryfallData: any) {
  const prices = scryfallData.prices || {};
  const legalities = scryfallData.legalities || {};
  const imageUris = scryfallData.image_uris || (scryfallData.card_faces && scryfallData.card_faces[0]?.image_uris) || {};
  
  const card = await prisma.scryfallCard.upsert({
    where: { id: scryfallData.id },
    update: {
      priceEur: prices.eur ? parseFloat(prices.eur) : null,
      priceEurFoil: prices.eur_foil ? parseFloat(prices.eur_foil) : null,
      pricesUpdatedAt: new Date(),
    },
    create: {
      id: scryfallData.id,
      oracleId: scryfallData.oracle_id || scryfallData.id,
      name: scryfallData.name,
      setCode: scryfallData.set,
      setName: scryfallData.set_name,
      collectorNumber: scryfallData.collector_number,
      rarity: scryfallData.rarity,
      typeLine: scryfallData.type_line || "",
      oracleText: scryfallData.oracle_text,
      manaCost: scryfallData.mana_cost,
      colors: JSON.stringify(scryfallData.colors || []),
      colorIdentity: JSON.stringify(scryfallData.color_identity || []),
      imageUris: JSON.stringify(imageUris),
      finishes: JSON.stringify(scryfallData.finishes || []),
      lang: scryfallData.lang,
      priceEur: prices.eur ? parseFloat(prices.eur) : null,
      priceEurFoil: prices.eur_foil ? parseFloat(prices.eur_foil) : null,
      priceUsd: prices.usd ? parseFloat(prices.usd) : null,
      priceUsdFoil: prices.usd_foil ? parseFloat(prices.usd_foil) : null,
      pricesUpdatedAt: new Date(),
      scryfallUri: scryfallData.scryfall_uri,
      legalities: JSON.stringify(legalities)
    }
  });

  // Registro del histórico de precios
  if (prices.eur || prices.eur_foil) {
    await prisma.priceHistory.create({
      data: {
        scryfallCardId: scryfallData.id,
        priceEur: prices.eur ? parseFloat(prices.eur) : null,
        priceEurFoil: prices.eur_foil ? parseFloat(prices.eur_foil) : null,
        recordedAt: new Date(),
      }
    });
  }

  return card;
}

/**
 * Agrega o actualiza las existencias (stock) de una variante de carta.
 */
export async function addStockItemAction(
  scryfallData: any, 
  condition: string, 
  finish: string, 
  language: string,
  quantity: number, 
  priceMode: string,
  salePrice: number | null,
  pricingRuleId: string | null
) {
  try {
    if (quantity < 0) {
      return { success: false, message: "Quantity cannot be negative" };
    }
    await ensureScryfallCard(scryfallData);


    let finalSalePrice = salePrice;
    if (priceMode === "MANUAL" && finalSalePrice === null) {
      const marketPrice = finish === 'foil' || finish === 'etched' 
        ? scryfallData.prices?.eur_foil 
        : scryfallData.prices?.eur;
      
      if (marketPrice) {
        finalSalePrice = parseFloat(marketPrice);
      }
    }

    const stockItem = await prisma.stockItem.upsert({
      where: {
        scryfallCardId_condition_finish_language: {
          scryfallCardId: scryfallData.id,
          condition,
          finish,
          language
        }
      },
      update: {
        quantity: { increment: quantity },
        priceMode,
        salePrice: priceMode === "MANUAL" ? finalSalePrice : null,
        pricingRuleId: priceMode === "AUTO_RULE" ? pricingRuleId : null
      },
      create: {
        scryfallCardId: scryfallData.id,
        condition,
        finish,
        language,
        quantity,
        priceMode,
        salePrice: priceMode === "MANUAL" ? finalSalePrice : null,
        pricingRuleId: priceMode === "AUTO_RULE" ? pricingRuleId : null
      }
    });

    if (stockItem.quantity > 0) {
      await fulfillStockNotifications(scryfallData.id, scryfallData.oracle_id || scryfallData.id);
    }

    revalidatePath("/admin/singles");
    revalidatePath("/player/singles");
    return { success: true, data: stockItem };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Actualiza los parámetros de una variante de stock existente en el inventario.
 */
export async function updateStockItemAction(
  id: string, 
  data: { 
    quantity?: number, 
    salePrice?: number | null, 
    priceMode?: string, 
    pricingRuleId?: string | null,
    condition?: string,
    finish?: string,
    language?: string,
    scryfallCardData?: any
  }
) {
  try {
    const currentItem = await prisma.stockItem.findUnique({ where: { id } });
    if (!currentItem) throw new Error("Variante no encontrada");

    let scryfallCardId = currentItem.scryfallCardId;
    
    if (data.scryfallCardData) {
      await ensureScryfallCard(data.scryfallCardData);
      scryfallCardId = data.scryfallCardData.id;
    }

    const newCondition = data.condition || currentItem.condition;
    const newFinish = data.finish || currentItem.finish;
    const newLanguage = data.language || currentItem.language;
    
    const isChangingVariant = 
      scryfallCardId !== currentItem.scryfallCardId || 
      newCondition !== currentItem.condition || 
      newFinish !== currentItem.finish || 
      newLanguage !== currentItem.language;

    let finalQuantity = data.quantity !== undefined ? data.quantity : currentItem.quantity;

    if (isChangingVariant) {
      // Verificación de la existencia de la combinación de atributos destino
      const existingTarget = await prisma.stockItem.findUnique({
        where: {
          scryfallCardId_condition_finish_language: {
            scryfallCardId,
            condition: newCondition,
            finish: newFinish,
            language: newLanguage
          }
        }
      });

      if (existingTarget) {
        // Unificación: se incrementa la cantidad en la variante destino, se actualiza opcionalmente el precio y se elimina el registro de origen
        const mergedItem = await prisma.stockItem.update({
          where: { id: existingTarget.id },
          data: {
            quantity: { increment: finalQuantity },
            salePrice: data.salePrice !== undefined ? data.salePrice : existingTarget.salePrice,
            priceMode: data.priceMode || existingTarget.priceMode,
          }
        });
        await prisma.stockItem.delete({ where: { id } });
        
        if (mergedItem.quantity > 0) {
          const card = await prisma.scryfallCard.findUnique({ where: { id: scryfallCardId } });
          if (card) {
            await fulfillStockNotifications(scryfallCardId, card.oracleId);
          }
        }

        revalidatePath("/admin/singles");
        revalidatePath("/player/singles");
        return { success: true, data: mergedItem };
      }
    }

    // Actualización convencional (cuando la combinación destino no existía previamente)
    const item = await prisma.stockItem.update({
      where: { id },
      data: {
        quantity: data.quantity,
        salePrice: data.salePrice,
        priceMode: data.priceMode,
        pricingRuleId: data.pricingRuleId,
        scryfallCardId,
        condition: newCondition,
        finish: newFinish,
        language: newLanguage
      }
    });

    if (item.quantity > 0) {
      const card = await prisma.scryfallCard.findUnique({ where: { id: scryfallCardId } });
      if (card) {
        await fulfillStockNotifications(scryfallCardId, card.oracleId);
      }
    }

    revalidatePath("/admin/singles");
    revalidatePath("/player/singles");
    return { success: true, data: item };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Elimina una variante de stock del inventario.
 */
export async function deleteStockItemAction(id: string) {
  try {
    await prisma.stockItem.delete({ where: { id } });
    revalidatePath("/admin/singles");
    revalidatePath("/player/singles");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Operaciones CRUD para la gestión de reglas de tarificación.
 */
export async function createPricingRuleAction(data: { name: string, type: string, valueA: number, valueB?: number, minPrice?: number, maxPrice?: number }) {
  try {
    const rule = await prisma.pricingRule.create({ data });
    revalidatePath("/admin/singles");
    return { success: true, data: rule };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deletePricingRuleAction(id: string) {
  try {
    // Si se elimina una regla de tarificación, las variantes asociadas vuelven al modo MANUAL preservando su último precio de venta directo
    await prisma.stockItem.updateMany({
      where: { pricingRuleId: id },
      data: { priceMode: "MANUAL", pricingRuleId: null }
    });

    await prisma.pricingRule.delete({ where: { id } });
    revalidatePath("/admin/singles");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ──────────────────────────────────────────────────────────
// Bulk Import
// ──────────────────────────────────────────────────────────

export interface BulkImportResult {
  imported: { name: string; setCode?: string; source: "LOCAL" | "EXTERNAL" }[];
  failed: { raw: string; reason: string }[];
}

/** Transforma una entidad ScryfallCard de la base de datos local al formato JSON original de la API de Scryfall. */
function dbCardToScryfallData(dbCard: any) {
  let colors: string[] = [];
  try { colors = JSON.parse(dbCard.colors); } catch(e) {}
  
  let colorIdentity: string[] = [];
  try { colorIdentity = JSON.parse(dbCard.colorIdentity); } catch(e) {}
  
  let imageUris = {};
  try { imageUris = JSON.parse(dbCard.imageUris); } catch(e) {}
  
  let finishes: string[] = [];
  try { finishes = JSON.parse(dbCard.finishes); } catch(e) {}
  
  let legalities = {};
  try { legalities = JSON.parse(dbCard.legalities); } catch(e) {}

  return {
    id: dbCard.id,
    oracle_id: dbCard.oracleId,
    name: dbCard.name,
    set: dbCard.setCode,
    set_name: dbCard.setName,
    collector_number: dbCard.collectorNumber,
    rarity: dbCard.rarity,
    type_line: dbCard.typeLine,
    oracle_text: dbCard.oracleText,
    mana_cost: dbCard.manaCost,
    colors,
    color_identity: colorIdentity,
    image_uris: imageUris,
    finishes,
    lang: dbCard.lang,
    prices: {
      eur: dbCard.priceEur ? String(dbCard.priceEur) : null,
      eur_foil: dbCard.priceEurFoil ? String(dbCard.priceEurFoil) : null,
      usd: dbCard.priceUsd ? String(dbCard.priceUsd) : null,
      usd_foil: dbCard.priceUsdFoil ? String(dbCard.priceUsdFoil) : null
    },
    scryfall_uri: dbCard.scryfallUri,
    legalities
  };
}

/** Resuelve una línea de importación masiva buscando en la base de datos local o recurriendo a la API de Scryfall, e inserta o actualiza el stock correspondiente. */
async function resolveAndUpsertLine(line: ParsedImportLine): Promise<{ ok: true; source: "LOCAL" | "EXTERNAL" } | { ok: false; reason: string }> {
  try {
    // 1. Consulta inicial en la base de datos local
    let localCard = null;
    if (line.setCode) {
      const results = await prisma.$queryRawUnsafe<any[]>(
        "SELECT * FROM ScryfallCard WHERE name = ? COLLATE NOCASE AND setCode = ? COLLATE NOCASE",
        line.name,
        line.setCode
      );
      localCard = results[0] || null;
    } else {
      const results = await prisma.$queryRawUnsafe<any[]>(
        "SELECT * FROM ScryfallCard WHERE name = ? COLLATE NOCASE",
        line.name
      );
      localCard = results[0] || null;
    }

    if (localCard) {
      const cardData = dbCardToScryfallData(localCard);
      
      let salePrice: number | null = line.price ?? null;
      if (salePrice === null) {
        const marketStr = line.finish === "foil" || line.finish === "etched"
          ? cardData.prices?.eur_foil
          : cardData.prices?.eur;
        if (marketStr) salePrice = parseFloat(marketStr);
      }

      await addStockItemAction(cardData, line.condition, line.finish, line.language, line.quantity, "MANUAL", salePrice, null);
      return { ok: true, source: "LOCAL" };
    }

    // 2. Recurso de contingencia: búsqueda en tiempo real en la API de Scryfall
    let q = `!"${line.name}" game:paper`;
    if (line.setCode) q += ` set:${line.setCode.toLowerCase()}`;

    const res = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=prints&order=released`,
      { headers: { "User-Agent": "MTGManager/1.0", Accept: "application/json" } }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, reason: err.details || `Scryfall error (${res.status})` };
    }

    const data = await res.json();
    const card = data.data?.[0];
    if (!card) {
      return { ok: false, reason: `No encontrada en Scryfall${line.setCode ? ` (set: ${line.setCode})` : ""}` };
    }

    let salePrice: number | null = line.price ?? null;
    if (salePrice === null) {
      const marketStr = line.finish === "foil" || line.finish === "etched"
        ? card.prices?.eur_foil
        : card.prices?.eur;
      if (marketStr) salePrice = parseFloat(marketStr);
    }

    await addStockItemAction(card, line.condition, line.finish, line.language, line.quantity, "MANUAL", salePrice, null);
    return { ok: true, source: "EXTERNAL" };
  } catch (err: any) {
    return { ok: false, reason: err.message || "Error desconocido" };
  }
}

/**
 * Importa por lotes un conjunto de líneas previamente analizadas al inventario general.
 * Procesa las solicitudes de forma secuencial. Si requiere resolución externa (API de Scryfall), introduce un retardo de 150 ms.
 * Límite máximo: BULK_IMPORT_MAX_LINES por llamada.
 */
export async function bulkImportAction(lines: ParsedImportLine[]): Promise<BulkImportResult> {
  const result: BulkImportResult = { imported: [], failed: [] };

  const capped = lines.slice(0, BULK_IMPORT_MAX_LINES);

  for (const line of capped) {
    const outcome = await resolveAndUpsertLine(line);

    if (outcome.ok) {
      result.imported.push({ 
        name: line.name, 
        setCode: line.setCode, 
        source: outcome.source 
      });
      
      // Se aplica retardo únicamente si la resolución fue externa para respetar las tasas límite de la API de Scryfall
      if (outcome.source === "EXTERNAL" && process.env.NODE_ENV !== "test") {
        await new Promise((r) => setTimeout(r, 150));
      }
    } else {
      result.failed.push({ raw: line.raw, reason: outcome.reason });
    }
  }

  if (result.imported.length > 0) {
    revalidatePath("/admin/singles");
    revalidatePath("/player/singles");
  }

  return result;
}
