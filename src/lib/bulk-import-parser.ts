/**
 * Representa una única línea procesada de un texto de importación masiva.
 */
export interface ParsedImportLine {
  raw: string;
  quantity: number;
  name: string;
  setCode?: string;
  condition: "M" | "NM" | "EX" | "GD" | "LP" | "PL" | "PO";
  finish: "nonfoil" | "foil" | "etched";
  language: "en" | "es" | "ja";
  price?: number;
}

const VALID_CONDITIONS = new Set(["M", "NM", "EX", "GD", "LP", "PL", "PO"]);
const VALID_FINISHES = new Set(["nonfoil", "foil", "etched"]);
const VALID_LANGUAGES = new Set(["en", "es", "ja"]);

/**
 * Analiza sintácticamente una única línea de una lista de importación masiva.
 *
 * Formato: <cantidad> <nombre> [<códigoDeSet>] [<condición>] [<acabado>] [<idioma>] [<precio>]
 *
 * Ejemplos:
 *   4 Lightning Bolt
 *   2 Black Lotus [LEA] NM foil en 5.50
 *   1 Counterspell [ICE] SP nonfoil es
 */
export function parseImportLine(line: string): ParsedImportLine | null {
  const trimmed = line.trim();
  // Se omiten las líneas vacías y los comentarios
  if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) return null;

  // Extracción de la cantidad (entero inicial)
  const qtyMatch = trimmed.match(/^(\d+)\s+/);
  if (!qtyMatch) return null;

  const quantity = parseInt(qtyMatch[1], 10);
  if (quantity < 1) return null;

  let rest = trimmed.slice(qtyMatch[0].length);

  // Extracción del código de set opcional [XXX]
  let setCode: string | undefined;
  const setMatch = rest.match(/\[([A-Za-z0-9_]+)\]/);
  if (setMatch) {
    setCode = setMatch[1].toUpperCase();
    rest = rest.replace(setMatch[0], "").trim();
  }

  // Segmentación de los tokens restantes (separados por espacios, después del nombre)
  // El nombre finaliza antes del primer token reconocido o al terminar la cadena
  const tokens = rest.split(/\s+/);
  
  let condition: ParsedImportLine["condition"] = "NM";
  let finish: ParsedImportLine["finish"] = "nonfoil";
  let language: ParsedImportLine["language"] = "en";
  let price: number | undefined;
  
  // Recorrido de los tokens en orden inverso para buscar campos reconocidos
  const nameTokens: string[] = [];
  let i = 0;

  // Primera pasada: procesamiento de los tokens conocidos desde el final
  const reversedTokens = [...tokens].reverse();
  const consumed = new Set<number>();

  reversedTokens.forEach((token, ri) => {
    const idx = tokens.length - 1 - ri;
    const upper = token.toUpperCase();
    const priceNum = parseFloat(token);

    if (ri === 0 && !isNaN(priceNum) && /^\d+(\.\d+)?$/.test(token) && price === undefined) {
      price = priceNum;
      consumed.add(idx);
    } else if (VALID_CONDITIONS.has(upper) && !consumed.has(idx)) {
      condition = upper as ParsedImportLine["condition"];
      consumed.add(idx);
    } else if (VALID_FINISHES.has(token.toLowerCase()) && !consumed.has(idx)) {
      finish = token.toLowerCase() as ParsedImportLine["finish"];
      consumed.add(idx);
    } else if (VALID_LANGUAGES.has(token.toLowerCase()) && !consumed.has(idx)) {
      language = token.toLowerCase() as ParsedImportLine["language"];
      consumed.add(idx);
    }
  });

  const name = tokens
    .filter((_, idx) => !consumed.has(idx))
    .join(" ")
    .trim();

  if (!name) return null;

  return {
    raw: line.trim(),
    quantity,
    name,
    setCode,
    condition,
    finish,
    language,
    price,
  };
}

/**
 * Analiza la totalidad del texto de importación masiva, retornando las líneas válidas y el recuento de líneas omitidas.
 */
export function parseBulkImportText(text: string): {
  lines: ParsedImportLine[];
  skipped: number;
} {
  const rawLines = text.split("\n");
  const lines: ParsedImportLine[] = [];
  let skipped = 0;

  for (const raw of rawLines) {
    const parsed = parseImportLine(raw);
    if (parsed) {
      lines.push(parsed);
    } else if (raw.trim() && !raw.trim().startsWith("//") && !raw.trim().startsWith("#")) {
      skipped++;
    }
  }

  return { lines, skipped };
}

export const BULK_IMPORT_MAX_LINES = 1000;
