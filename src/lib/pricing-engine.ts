export interface PricingRule {
  id: string;
  type: string; // FLAT_MARKUP | PERCENT_MARKUP | PERCENT_OF_MARKET
  valueA: number;
  valueB?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
}

export interface RoundingBand {
  minPrice: number;
  maxPrice: number;
  roundTo: number;
  priority: number;
}

export interface FlashSale {
  discount: number;
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface PricingContext {
  marketPrice: number | null;
  manualPrice: number | null;
  condition: string;
  conditionModifiers: Record<string, number>; // Ejemplo: { NM: 1.0, EX: 0.9, LP: 0.75 }
  pricingRule: PricingRule | null;
  activeFlashSale: FlashSale | null;
  roundingBands: RoundingBand[];
}

export function computeFinalPrice(ctx: PricingContext): number | null {
  const {
    marketPrice,
    manualPrice,
    condition,
    conditionModifiers,
    pricingRule,
    activeFlashSale,
    roundingBands,
  } = ctx;

  // Paso 1: Determinación del precio base
  // El precio establecido manualmente tiene prioridad absoluta sobre cualquier otra regla. En su defecto, se utilizará el precio de mercado.
  let currentPrice = manualPrice !== null ? manualPrice : marketPrice;

  if (currentPrice === null || currentPrice === undefined) {
    return null;
  }

  // Paso 2: Aplicación del modificador por estado/condición
  // Si el estado no está registrado, se establece un valor predeterminado de 1.0. El estado Mint (M) se asocia por defecto a 1.0 (o al valor correspondiente registrado en el mapa).
  let conditionMod = 1.0;
  if (conditionModifiers[condition] !== undefined) {
    conditionMod = conditionModifiers[condition];
  } else if (condition === "M" && conditionModifiers["NM"] !== undefined && conditionModifiers["M"] === undefined) {
      // Si el estado Mint (M) no está explícitamente definido pero Near Mint (NM) sí lo está, se asume NM como valor de contingencia
      conditionMod = conditionModifiers["NM"];
  }

  currentPrice = currentPrice * conditionMod;

  // Paso 3: Aplicación de la regla de tarificación
  if (pricingRule) {
      let applyRule = true;
      if (pricingRule.minPrice !== null && pricingRule.minPrice !== undefined && currentPrice < pricingRule.minPrice) {
          applyRule = false;
      }
      if (pricingRule.maxPrice !== null && pricingRule.maxPrice !== undefined && currentPrice > pricingRule.maxPrice) {
          applyRule = false;
      }

      if (applyRule) {
          switch (pricingRule.type) {
              case "FLAT_MARKUP":
                  currentPrice += pricingRule.valueA;
                  break;
              case "PERCENT_MARKUP":
                  // Ejemplo: un valor de valueA = 10 representa un incremento porcentual del 10%
                  currentPrice = currentPrice * (1 + pricingRule.valueA / 100);
                  break;
              case "PERCENT_OF_MARKET":
                   // Sobrescribe el valor calculado en función del precio actual y el porcentaje estipulado sobre el mercado
                   // Si el tipo es PERCENT_OF_MARKET, se asume como valor relativo del precio actual
                   currentPrice = currentPrice * (pricingRule.valueA / 100);
                  break;
          }
      }
  }

  // Paso 4: Redondeo por intervalos de precios (rounding bands)
  if (roundingBands && roundingBands.length > 0) {
      // Se ordenan los intervalos por prioridad (un valor numérico menor denota mayor prioridad de aplicación)
      const sortedBands = [...roundingBands].sort((a, b) => a.priority - b.priority);
      
      for (const band of sortedBands) {
          if (currentPrice >= band.minPrice && currentPrice <= band.maxPrice) {
              // Aplicación de la regla de redondeo
              // Ejemplo: un parámetro roundTo = 0.50
              // Un precio actual de 1.30 se redondea al intervalo de 0.50 más cercano, resultando en 1.50
              
              if (band.roundTo > 0) {
                  const inv = 1.0 / band.roundTo;
                  currentPrice = Math.round(currentPrice * inv) / inv;
              }
              break; // Se finaliza la iteración tras la primera coincidencia del intervalo
          }
      }
  }

  // Paso 5: Aplicación del descuento por oferta relámpago (flash sale)
  if (activeFlashSale && activeFlashSale.isActive) {
      const now = new Date();
      if (now >= activeFlashSale.startsAt && now <= activeFlashSale.expiresAt) {
          // El descuento se expresa en tanto por uno (ejemplo: 0.20 equivale a una reducción del 20%)
          currentPrice = currentPrice * (1 - activeFlashSale.discount);
      }
  }

  // Paso 6: Acotación de seguridad y retorno del valor calculado (no inferior a cero)
  return Math.max(0, currentPrice);
}

// Función auxiliar para calcular y asociar los precios a un conjunto de elementos (ejecutada en el lado del servidor)
export async function populatePrices(items: any[]) {
  if (!items || items.length === 0) return items;
  
  const { prisma } = await import("./db");
  const now = new Date();

  const [conds, rules, bands, sales] = await Promise.all([
    prisma.conditionModifier.findMany(),
    prisma.pricingRule.findMany(),
    prisma.roundingBand.findMany({ orderBy: { priority: "asc" } }),
    prisma.flashSale.findMany({
      where: { isActive: true, expiresAt: { gt: now } },
      include: { items: true }
    })
  ]);

  const condModMap: Record<string, number> = {};
  conds.forEach((c: any) => condModMap[c.condition] = c.multiplier);

  return items.map(item => {
    const isFoilish = item.finish === 'foil' || item.finish === 'etched';
    let marketPrice: number | null = null;
    const dbPriceEur = isFoilish ? item.scryfallCard?.priceEurFoil : item.scryfallCard?.priceEur;
    if (dbPriceEur !== null && dbPriceEur !== undefined) {
      marketPrice = typeof dbPriceEur === 'string' ? parseFloat(dbPriceEur) : dbPriceEur;
    } else {
      const dbPriceUsd = isFoilish ? item.scryfallCard?.priceUsdFoil : item.scryfallCard?.priceUsd;
      if (dbPriceUsd !== null && dbPriceUsd !== undefined) {
        const usdVal = typeof dbPriceUsd === 'string' ? parseFloat(dbPriceUsd) : dbPriceUsd;
        marketPrice = parseFloat((usdVal * 0.92).toFixed(2));
      }
    }
    const manualPrice = item.priceMode === "MANUAL" && item.salePrice !== null ? item.salePrice : null;
    
    let pricingRule = null;
    if (item.pricingRuleId) {
      pricingRule = rules.find((r: any) => r.id === item.pricingRuleId) || null;
    }

    let activeFlashSale = null;
    for (const sale of sales) {
      if (sale.items.some((si: any) => si.stockItemId === item.id)) {
        activeFlashSale = sale;
        break;
      }
    }

    const ctx: PricingContext = {
      marketPrice,
      manualPrice,
      condition: item.condition,
      conditionModifiers: condModMap,
      pricingRule,
      activeFlashSale,
      roundingBands: bands,
    };

    const finalPrice = computeFinalPrice(ctx);
    
    // El cálculo del precio original representa el valor bruto antes de la aplicación del descuento de la oferta relámpago
    const ctxNoFlash = { ...ctx, activeFlashSale: null };
    const originalPrice = computeFinalPrice(ctxNoFlash);

    return {
      ...item,
      computedPrice: {
        finalPrice,
        originalPrice,
        conditionMultiplier: condModMap[item.condition] !== undefined ? condModMap[item.condition] : (item.condition === "M" ? (condModMap["NM"] || 1.0) : 1.0),
        pricingRule,
        flashSale: activeFlashSale,
      }
    };
  });
}
