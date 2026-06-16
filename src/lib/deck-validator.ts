import { prisma } from "@/lib/db";

export function extractMoxfieldDeckId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes("moxfield.com")) {
      const parts = parsedUrl.pathname.split("/").filter(Boolean);
      if (parts.length > 0 && parts[0] === "decks") {
        return parts[1];
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function fetchMoxfieldDeck(deckId: string, formatId: string = "commander") {
  const response = await fetch(`https://api.moxfield.com/v2/decks/all/${deckId}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    if (response.status === 403) {
      console.warn("Moxfield returned 403 Forbidden. Using mock deck payload for demo.");
      const isCommander = formatId.toLowerCase() === "commander";
      return {
        name: `Mazo Demo (${formatId.toUpperCase()})`,
        mainboard: isCommander 
          ? {
              "Forest": {
                card: {
                  legalities: { commander: "legal", standard: "legal", modern: "legal", pioneer: "legal", pauper: "legal", legacy: "legal", vintage: "legal" },
                  prices: { eur: 0.05 },
                  colorIdentity: ["G"]
                },
                quantity: 99
              }
            }
          : {
              "Colossal Dreadmaw": {
                card: {
                  legalities: { commander: "legal", standard: "legal", modern: "legal", pioneer: "legal", pauper: "legal", legacy: "legal", vintage: "legal" },
                  prices: { eur: 0.15 },
                  colorIdentity: ["G"]
                },
                quantity: 60
              }
            },
        sideboard: {},
        commanders: isCommander
          ? { 
              "Demo Commander": { 
                card: { 
                  legalities: { commander: "legal", standard: "legal", modern: "legal", pioneer: "legal", pauper: "legal", legacy: "legal", vintage: "legal" }, 
                  prices: { eur: 23.0 },
                  colorIdentity: ["G"]
                }, 
                quantity: 1, 
                isCommander: true 
              } 
            }
          : {},
        _isMocked: true
      };
    }
    throw new Error(`Failed to fetch deck ${deckId} from Moxfield (Status: ${response.status})`);
  }
  
  return response.json();
}

/** Función auxiliar para recuperar los detalles de la carta localmente en primera instancia, recurriendo a la API de Scryfall en caso de ausencia */
async function fetchCardDetails(cardName: string) {
  // 1. Consulta en la base de datos local
  const results = await prisma.$queryRawUnsafe<any[]>(
    "SELECT * FROM ScryfallCard WHERE name = ? COLLATE NOCASE",
    cardName
  );
  const localCard = results[0] || null;

  if (localCard) {
    let colorId: string[] = [];
    try {
      colorId = JSON.parse(localCard.colorIdentity);
    } catch (e) {}
    
    let leg: Record<string, string> = {};
    try {
      leg = JSON.parse(localCard.legalities);
    } catch (e) {}

    return {
      name: localCard.name,
      legalities: leg,
      priceEur: localCard.priceEur,
      priceEurFoil: localCard.priceEurFoil,
      priceUsd: localCard.priceUsd,
      priceUsdFoil: localCard.priceUsdFoil,
      colorIdentity: colorId
    };
  }

  // 2. Consulta en tiempo real a la API de Scryfall
  try {
    const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`, {
      headers: {
        "User-Agent": "MTGManager/1.0",
        "Accept": "application/json"
      }
    });

    if (res.ok) {
      const data = await res.json();
      const prices = data.prices || {};
      const legalities = data.legalities || {};
      const imageUris = data.image_uris || (data.card_faces && data.card_faces[0]?.image_uris) || {};
      
      // Inserción o actualización en la caché local (Upsert)
      await prisma.scryfallCard.upsert({
        where: { id: data.id },
        update: {
          priceEur: prices.eur ? parseFloat(prices.eur) : null,
          priceEurFoil: prices.eur_foil ? parseFloat(prices.eur_foil) : null,
          priceUsd: prices.usd ? parseFloat(prices.usd) : null,
          priceUsdFoil: prices.usd_foil ? parseFloat(prices.usd_foil) : null,
          pricesUpdatedAt: new Date(),
        },
        create: {
          id: data.id,
          oracleId: data.oracle_id || data.id,
          name: data.name,
          setCode: data.set,
          setName: data.set_name,
          collectorNumber: data.collector_number,
          rarity: data.rarity,
          typeLine: data.type_line || "",
          oracleText: data.oracle_text,
          manaCost: data.mana_cost,
          colors: JSON.stringify(data.colors || []),
          colorIdentity: JSON.stringify(data.color_identity || []),
          imageUris: JSON.stringify(imageUris),
          finishes: JSON.stringify(data.finishes || []),
          lang: data.lang,
          priceEur: prices.eur ? parseFloat(prices.eur) : null,
          priceEurFoil: prices.eur_foil ? parseFloat(prices.eur_foil) : null,
          priceUsd: prices.usd ? parseFloat(prices.usd) : null,
          priceUsdFoil: prices.usd_foil ? parseFloat(prices.usd_foil) : null,
          pricesUpdatedAt: new Date(),
          scryfallUri: data.scryfall_uri,
          legalities: JSON.stringify(legalities)
        }
      });

      return {
        name: data.name,
        legalities,
        priceEur: prices.eur ? parseFloat(prices.eur) : null,
        priceEurFoil: prices.eur_foil ? parseFloat(prices.eur_foil) : null,
        priceUsd: prices.usd ? parseFloat(prices.usd) : null,
        priceUsdFoil: prices.usd_foil ? parseFloat(prices.usd_foil) : null,
        colorIdentity: data.color_identity || []
      };
    }
  } catch (err) {
    console.error(`Error searching card ${cardName} on Scryfall:`, err);
  }

  return null;
}

/** Procesa una lista de mazo en texto plano para estructurarla en un formato estándar compatible con Moxfield */
export function parseTextDeck(text: string) {
  const lines = text.split(/\r?\n/);
  const mainboard: Record<string, any> = {};
  const sideboard: Record<string, any> = {};
  const commanders: Record<string, any> = {};
  
  let currentBoard: 'main' | 'side' | 'commander' = 'main';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Cabeceras de sección
    if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
      const lower = trimmed.toLowerCase();
      if (lower.includes("commander")) {
        currentBoard = 'commander';
      } else if (lower.includes("side")) {
        currentBoard = 'side';
      } else {
        currentBoard = 'main';
      }
      continue;
    }

    // Coincidencia con cantidad y nombre de carta (ej. "1 Lightning Bolt" o "4 Lightning Bolt (M10)")
    const match = trimmed.match(/^(\d+)\x20+(.+)$/);
    if (!match) continue;

    const qty = parseInt(match[1], 10);
    let cardName = match[2].trim();

    // Detección de etiquetas en línea para el comandante
    let isCommanderLine = currentBoard === 'commander';
    if (cardName.toLowerCase().includes("*cmdr*")) {
      isCommanderLine = true;
      cardName = cardName.replace(/\*cmdr\*/gi, "").trim();
    } else if (cardName.toLowerCase().includes("*commander*")) {
      isCommanderLine = true;
      cardName = cardName.replace(/\*commander\*/gi, "").trim();
    }

    // Eliminación de la información de edición/set (ej. "(M10) 12")
    cardName = cardName.replace(/\s*\([^)]+\)(?:\s+\d+)?\s*$/, "").trim();

    const entry = { quantity: qty, rawName: cardName };
    if (isCommanderLine) {
      commanders[cardName] = entry;
    } else if (currentBoard === 'side') {
      sideboard[cardName] = entry;
    } else {
      mainboard[cardName] = entry;
    }
  }

  return {
    name: "Mazo de Lista de Texto",
    mainboard,
    sideboard,
    commanders
  };
}

export async function validateDeck(input: string, formatId: string = "commander") {
  const isUrl = input.trim().startsWith("http");
  let deckData: any;

  if (isUrl) {
    const deckId = extractMoxfieldDeckId(input);
    if (!deckId) {
      return {
        isValid: false,
        message: "Actualmente solo se soportan URLs de Moxfield o listas de texto plano.",
        cost: 0,
      };
    }
    try {
      deckData = await fetchMoxfieldDeck(deckId, formatId);
    } catch (error: any) {
      return {
        isValid: false,
        message: error.message || "Error al obtener mazo desde Moxfield.",
        cost: 0,
      };
    }
  } else {
    // Análisis sintáctico del mazo provisto en texto plano
    deckData = parseTextDeck(input);
  }



  try {
    let totalCostEur = 0;
    let isLegal = true;
    let cardCount = 0;
    const illegalCards: string[] = [];
    const missingCards: string[] = [];

    // Función auxiliar para resolver los detalles de la carta y calcular la legalidad y coste total
    const processBoard = async (board: Record<string, any>, isCommanderBoard = false) => {
      for (const [cardName, cardData] of Object.entries(board)) {
        let cardInfo: any = null;
        let qty = 1;

        if (isUrl) {
          cardInfo = {
            name: cardName,
            legalities: cardData.card?.legalities || {},
            priceEur: cardData.card?.prices?.eur,
            priceEurFoil: cardData.card?.prices?.eur_foil,
            priceUsd: cardData.card?.prices?.usd,
            priceUsdFoil: cardData.card?.prices?.usd_foil,
            colorIdentity: cardData.card?.colorIdentity || []
          };
          qty = cardData.quantity || 1;
        } else {
          // Resolución de metadatos desde la base de datos local o la API de Scryfall
          const details = await fetchCardDetails(cardName);
          if (details) {
            cardInfo = details;
          } else {
            missingCards.push(cardName);
            isLegal = false;
            continue;
          }
          qty = cardData.quantity || 1;
          // Se asocia la información resuelta en el tablero para realizar la validación de identidad de color del comandante a posteriori
          board[cardName].card = cardInfo;
        }

        cardCount += qty;

        // Cálculo del coste acumulado en Euros (EUR)
        let price = parseFloat(cardInfo.priceEur) || parseFloat(cardInfo.priceEurFoil) || 0;
        if (price === 0) {
          // Conversión de USD a EUR como contingencia basada en una tasa estática
          const usdPrice = parseFloat(cardInfo.priceUsd) || parseFloat(cardInfo.priceUsdFoil) || 0;
          price = usdPrice * 0.92;
        }
        totalCostEur += price * qty;

        // Validación de la legalidad de la carta según el formato del torneo
        const validFormats = ["standard", "modern", "pioneer", "legacy", "vintage", "pauper", "commander"];
        const normalizedFormat = validFormats.includes(formatId.toLowerCase()) ? formatId.toLowerCase() : "vintage";

        const legality = cardInfo.legalities?.[normalizedFormat];
        if (legality !== "legal" && legality !== "restricted") { 
          isLegal = false;
          illegalCards.push(`${cardInfo.name} (${legality || "no legal"})`);
        }
      }
    };

    await processBoard(deckData.mainboard || {});
    await processBoard(deckData.sideboard || {});
    await processBoard(deckData.commanders || {}, true);

    if (missingCards.length > 0) {
      return {
        isValid: false,
        message: `Cartas no encontradas en el catálogo ni en Scryfall: ${missingCards.join(", ")}`,
        cost: 0
      };
    }

    // Validaciones específicas para el formato Commander (número de cartas e identidad de color)
    const isCommanderFormat = formatId.toLowerCase() === "commander";
    if (isCommanderFormat) {
      if (cardCount < 100 || cardCount > 105) {
        isLegal = false;
        illegalCards.push(`El mazo de Commander debe tener entre 100 y 105 cartas (total actual: ${cardCount})`);
      }
      if (!deckData.commanders || Object.keys(deckData.commanders).length === 0) {
        isLegal = false;
        illegalCards.push("El formato Commander requiere seleccionar al menos un comandante");
      } else {
        // Validación de la identidad de color
        const cmdColors = new Set<string>();
        for (const [cmdName, cmdInfo] of Object.entries(deckData.commanders)) {
          const cmdCard = (cmdInfo as any).card;
          if (cmdCard && cmdCard.colorIdentity) {
            cmdCard.colorIdentity.forEach((c: string) => cmdColors.add(c));
          }
        }

        const checkColorMatches = (board: Record<string, any>, boardName: string) => {
          for (const [cardName, cardInfo] of Object.entries(board)) {
            const cardObj = cardInfo.card;
            if (cardObj && cardObj.colorIdentity) {
              const invalidColors = cardObj.colorIdentity.filter((c: string) => !cmdColors.has(c));
              if (invalidColors.length > 0) {
                isLegal = false;
                illegalCards.push(
                  `${cardObj.name} en ${boardName} contiene colores [${invalidColors.join(", ")}] fuera de la identidad del comandante [${Array.from(cmdColors).join(", ") || "Incoloro"}]`
                );
              }
            }
          }
        };

        checkColorMatches(deckData.mainboard || {}, "Mazo Principal");
        checkColorMatches(deckData.sideboard || {}, "Sideboard");
      }
    } else {
      // Validaciones específicas para formatos construidos
      if (cardCount < 60) {
        isLegal = false;
        illegalCards.push(`El mazo construido debe tener al menos 60 cartas (total actual: ${cardCount})`);
      }
      if (deckData.commanders && Object.keys(deckData.commanders).length > 0) {
        isLegal = false;
        illegalCards.push("Los formatos que no son Commander no deben designar comandantes");
      }
    }
    
    return {
      isValid: isLegal,
      message: isLegal 
        ? (deckData._isMocked 
            ? `El mazo es válido (modo demo - API Moxfield bloqueada. Se validó una plantilla demo de ${formatId.toUpperCase()}).`
            : "El mazo es válido.")
        : `Cartas o formato no válidos: ${illegalCards.join(". ")}`,
      cost: Math.round(totalCostEur * 100) / 100, // Redondeo de precisión a dos decimales
      deckName: deckData.name,
    };

  } catch (error: any) {
    return {
      isValid: false,
      message: error.message || "Error desconocido validando mazo",
      cost: 0,
    };
  }
}
