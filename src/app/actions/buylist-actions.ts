'use server';

import { prisma } from "@/lib/db";
import { getMockUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ensureScryfallCard } from "./inventory-actions";
import { fulfillStockNotifications } from "./notification-actions";

export async function getPlayerBuylistRequestsAction() {
  try {
    const userId = await getMockUserId();
    const requests = await prisma.buylistRequest.findMany({
      where: { userId },
      include: {
        items: {
          include: { scryfallCard: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: requests };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getAdminBuylistRequestsAction() {
  try {
    const requests = await prisma.buylistRequest.findMany({
      include: {
        user: true,
        items: {
          include: { scryfallCard: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: requests };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getBuylistRequestDetailAction(id: string) {
  try {
    const request = await prisma.buylistRequest.findUnique({
      where: { id },
      include: {
        user: true,
        items: {
          include: { scryfallCard: true }
        }
      }
    });
    return { success: true, data: request };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

interface CreateBuylistItemInput {
  scryfallCardData: any;
  quantity: number;
  condition: string;
  finish: string;
  language: string;
  marketPrice: number;
  buyPrice: number;
}

export async function createBuylistRequestAction(items: CreateBuylistItemInput[], tradeType: string = "CASH") {
  try {
    if (items.length === 0) {
      return { success: false, message: "La lista de cartas está vacía." };
    }

    const userId = await getMockUserId();
    
    // Consulta de la configuración de la tienda para la tasa predeterminada
    const store = await prisma.store.findFirst();
    const defaultRate = tradeType === "STORE_CREDIT"
      ? (store?.buylistDefaultRateCredit ?? 75.0)
      : (store?.buylistDefaultRate ?? 70.0);

    // Consulta de los modificadores de condición en la base de datos
    const modsList = await prisma.conditionModifier.findMany();
    const modifiers: Record<string, number> = {};
    modsList.forEach(m => {
      modifiers[m.condition] = m.multiplier;
    });

    const getMod = (cond: string) => {
      if (modifiers[cond] !== undefined) return modifiers[cond];
      if (cond === "NM") return 1.0;
      if (cond === "LP") return 0.90;
      if (cond === "MP") return 0.75;
      if (cond === "HP") return 0.50;
      if (cond === "PO") return 0.25;
      return 1.0;
    };

    // Consulta de las bandas de precios del buylist
    const bands = await prisma.buylistPriceBand.findMany({
      orderBy: { minPrice: 'asc' }
    });

    const getRate = (marketPrice: number): number => {
      const matchingBand = bands.find(b => marketPrice >= b.minPrice && marketPrice <= b.maxPrice);
      if (matchingBand) {
        return tradeType === "STORE_CREDIT" ? matchingBand.rateCredit : matchingBand.rateCash;
      }
      return defaultRate;
    };

    // Garantizar inicialmente la existencia de todas las cartas en la base de datos
    const preparedItems = [];
    for (const item of items) {
      const card = await ensureScryfallCard(item.scryfallCardData);
      const appliedRate = getRate(item.marketPrice);
      const calculatedBuyPrice = parseFloat((item.marketPrice * (appliedRate / 100) * getMod(item.condition)).toFixed(2));
      preparedItems.push({
        scryfallCardId: card.id,
        quantity: item.quantity,
        condition: item.condition,
        finish: item.finish,
        language: item.language,
        marketPrice: item.marketPrice,
        buyPrice: calculatedBuyPrice
      });
    }

    const totalPrice = preparedItems.reduce((acc, item) => acc + (item.buyPrice * item.quantity), 0);

    const request = await prisma.buylistRequest.create({
      data: {
        userId,
        status: "PENDING",
        totalPrice,
        defaultRate,
        tradeType,
        items: {
          create: preparedItems
        }
      }
    });

    revalidatePath("/player/buylist");
    revalidatePath("/admin/buylist");
    return { success: true, data: request };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

interface UpdateBuylistItemInput {
  scryfallCardId: string;
  scryfallCardData?: any; // Datos de la carta en Scryfall (requeridos si se introduce una nueva carta)
  quantity: number;
  condition: string;
  finish: string;
  language: string;
  marketPrice: number;
  buyPrice: number;
}

export async function updateBuylistRequestAction(
  id: string,
  status: string,
  items: UpdateBuylistItemInput[],
  tradeType?: string
) {
  try {
    if (items.length === 0 && status === "APPROVED") {
      return { success: false, message: "No se puede aprobar una tasación vacía." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.buylistRequest.findUnique({
        where: { id },
        include: { items: true }
      });
      
      if (!request) throw new Error("No se encontró la tasación.");
      if (request.status !== "PENDING") throw new Error("Esta tasación ya ha sido procesada.");

      const finalTradeType = tradeType || request.tradeType;

      // Cálculo del precio total ponderando los elementos modificados
      const totalPrice = items.reduce((acc, item) => acc + (item.buyPrice * item.quantity), 0);

      // Regeneración de elementos (eliminación de registros previos e inserción de nuevos emparejamientos)
      // En primera instancia, se garantiza que todas las cartas de la lista existan en la base de datos local (pueden ser nuevas cartas añadidas por el administrador)
      const preparedItems = [];
      for (const item of items) {
        let cardId = item.scryfallCardId;
        if (item.scryfallCardData) {
          // En el ámbito de la transacción, resulta más seguro realizar la operación upsert directamente utilizando la base de datos local para evitar consultas externas innecesarias.
          const prices = item.scryfallCardData.prices || {};
          const legalities = item.scryfallCardData.legalities || {};
          const imageUris = item.scryfallCardData.image_uris || (item.scryfallCardData.card_faces && item.scryfallCardData.card_faces[0]?.image_uris) || {};
          
          const card = await tx.scryfallCard.upsert({
            where: { id: item.scryfallCardData.id },
            update: {
              priceEur: prices.eur ? parseFloat(prices.eur) : null,
              priceEurFoil: prices.eur_foil ? parseFloat(prices.eur_foil) : null,
              pricesUpdatedAt: new Date(),
            },
            create: {
              id: item.scryfallCardData.id,
              oracleId: item.scryfallCardData.oracle_id || item.scryfallCardData.id,
              name: item.scryfallCardData.name,
              setCode: item.scryfallCardData.set,
              setName: item.scryfallCardData.set_name,
              collectorNumber: item.scryfallCardData.collector_number,
              rarity: item.scryfallCardData.rarity,
              typeLine: item.scryfallCardData.type_line || "",
              oracleText: item.scryfallCardData.oracle_text,
              manaCost: item.scryfallCardData.mana_cost,
              colors: JSON.stringify(item.scryfallCardData.colors || []),
              colorIdentity: JSON.stringify(item.scryfallCardData.color_identity || []),
              imageUris: JSON.stringify(imageUris),
              finishes: JSON.stringify(item.scryfallCardData.finishes || []),
              lang: item.scryfallCardData.lang || "en",
              priceEur: prices.eur ? parseFloat(prices.eur) : null,
              priceEurFoil: prices.eur_foil ? parseFloat(prices.eur_foil) : null,
              priceUsd: prices.usd ? parseFloat(prices.usd) : null,
              priceUsdFoil: prices.usd_foil ? parseFloat(prices.usd_foil) : null,
              pricesUpdatedAt: new Date(),
              scryfallUri: item.scryfallCardData.scryfall_uri || "",
              legalities: JSON.stringify(legalities)
            }
          });
          cardId = card.id;
        }

        preparedItems.push({
          scryfallCardId: cardId,
          quantity: item.quantity,
          condition: item.condition,
          finish: item.finish,
          language: item.language,
          marketPrice: item.marketPrice,
          buyPrice: item.buyPrice
        });
      }

      const updatedRequest = await tx.buylistRequest.update({
        where: { id },
        data: {
          status,
          totalPrice,
          tradeType: finalTradeType,
          items: {
            deleteMany: {},
            create: preparedItems
          }
        },
        include: {
          items: {
            include: { scryfallCard: true }
          }
        }
      });

      // En caso de APROBACIÓN, se agregan los elementos al inventario de la tienda (StockItem)
      if (status === "APPROVED") {
        for (const item of updatedRequest.items) {
          await tx.stockItem.upsert({
            where: {
              scryfallCardId_condition_finish_language: {
                scryfallCardId: item.scryfallCardId,
                condition: item.condition,
                finish: item.finish,
                language: item.language
              }
            },
            update: {
              quantity: { increment: item.quantity }
            },
            create: {
              scryfallCardId: item.scryfallCardId,
              condition: item.condition,
              finish: item.finish,
              language: item.language,
              quantity: item.quantity,
              priceMode: "MANUAL",
              salePrice: item.marketPrice ?? 0.0 // Se establece el precio de venta inicial equivalente al precio de mercado
            }
          });
        }

        // Acreditación de saldo en la cartera virtual del usuario si el método de pago seleccionado es STORE_CREDIT
        if (finalTradeType === "STORE_CREDIT") {
          await tx.user.update({
            where: { id: request.userId },
            data: {
              storeCredit: { increment: totalPrice }
            }
          });
        }
      }

      // Creación de la notificación correspondiente para el usuario destinatario
      await tx.notification.create({
        data: {
          userId: request.userId,
          title: status === "APPROVED" ? "¡Tasación Aprobada!" : "Tasación Rechazada",
          message: status === "APPROVED"
            ? `Tu tasación de singles por valor de €${totalPrice.toFixed(2)} (${finalTradeType === "STORE_CREDIT" ? "Crédito de Tienda" : "Efectivo"}) ha sido aprobada por la tienda.`
            : `Tu tasación de singles ha sido rechazada por la tienda.`,
          type: "BUYLIST",
          linkUrl: `/player/buylist`
        }
      });

      return updatedRequest;
    });

    // Activación del disparador de notificaciones tras la consolidación exitosa de la transacción
    if (status === "APPROVED") {
      for (const item of result.items) {
        try {
          await fulfillStockNotifications(item.scryfallCardId, item.scryfallCard.oracleId);
        } catch (notifErr) {
          console.error("Error al disparar las notificaciones:", notifErr);
        }
      }
    }

    revalidatePath("/player/buylist");
    revalidatePath(`/player/buylist/${id}`);
    revalidatePath("/admin/buylist");
    revalidatePath(`/admin/buylist/${id}`);
    revalidatePath("/admin/singles");
    revalidatePath("/player/singles");

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
