import { describe, it, expect } from "vitest";
import { parseImportLine, parseBulkImportText } from "@/lib/bulk-import-parser";

describe("parseImportLine", () => {
  it("parses minimal line (qty + name)", () => {
    const result = parseImportLine("4 Lightning Bolt");
    expect(result).toMatchObject({
      quantity: 4,
      name: "Lightning Bolt",
      condition: "NM",
      finish: "nonfoil",
      language: "en",
    });
    expect(result?.setCode).toBeUndefined();
    expect(result?.price).toBeUndefined();
  });

  it("parses full line with all optional fields", () => {
    const result = parseImportLine("2 Black Lotus [LEA] NM foil en 5.50");
    expect(result).toMatchObject({
      quantity: 2,
      name: "Black Lotus",
      setCode: "LEA",
      condition: "NM",
      finish: "foil",
      language: "en",
      price: 5.5,
    });
  });

  it("parses line with setCode and condition only", () => {
    const result = parseImportLine("1 Counterspell [ICE] LP");
    expect(result).toMatchObject({
      quantity: 1,
      name: "Counterspell",
      setCode: "ICE",
      condition: "LP",
      finish: "nonfoil",
      language: "en",
    });
  });

  it("parses multi-word card names", () => {
    const result = parseImportLine("3 Ragavan, Nimble Pilferer [MH2] NM foil ja");
    expect(result).toMatchObject({
      quantity: 3,
      name: "Ragavan, Nimble Pilferer",
      setCode: "MH2",
      condition: "NM",
      finish: "foil",
      language: "ja",
    });
  });

  it("parses Spanish language with price, no setCode", () => {
    const result = parseImportLine("1 Sol Ring LP nonfoil es 2.00");
    expect(result).toMatchObject({
      quantity: 1,
      name: "Sol Ring",
      condition: "LP",
      finish: "nonfoil",
      language: "es",
      price: 2.0,
    });
  });

  it("returns null for empty lines", () => {
    expect(parseImportLine("")).toBeNull();
    expect(parseImportLine("   ")).toBeNull();
  });

  it("returns null for comment lines", () => {
    expect(parseImportLine("// This is a comment")).toBeNull();
    expect(parseImportLine("# Another comment")).toBeNull();
  });

  it("returns null for lines without a leading quantity", () => {
    expect(parseImportLine("Lightning Bolt")).toBeNull();
  });

  it("defaults condition to NM, finish to nonfoil, language to en", () => {
    const result = parseImportLine("1 Island");
    expect(result?.condition).toBe("NM");
    expect(result?.finish).toBe("nonfoil");
    expect(result?.language).toBe("en");
  });

  // Casos límite (edge cases)
  it("returns null for quantity 0 (B-1)", () => {
    expect(parseImportLine("0 Lightning Bolt")).toBeNull();
  });

  it("parses card name that contains a number (B-2)", () => {
    const result = parseImportLine("2 Rat Colony 2 [DOM] NM");
    expect(result?.name).toBe("Rat Colony 2");
  });

  it("normalizes mixed case set codes to uppercase (B-3)", () => {
    const result = parseImportLine("1 Ragavan [mh2] NM");
    expect(result?.setCode).toBe("MH2");
  });

  it("ignores prices with commas, treating them as part of the name if not matched (B-4)", () => {
    const result = parseImportLine("1 Card Name 1,50 NM");
    expect(result?.price).toBeUndefined();
    expect(result?.name).toBe("Card Name 1,50");
  });

  it("parses etched finish (B-6)", () => {
    const result = parseImportLine("1 Card etched");
    expect(result?.finish).toBe("etched");
  });
});

describe("parseBulkImportText", () => {
  it("parses multiple lines and skips blanks/comments", () => {
    const text = `
# My inventory
4 Lightning Bolt
2 Black Lotus [LEA] NM foil en 5.50

// note
1 Island
invalid line without qty
    `.trim();

    const { lines, skipped } = parseBulkImportText(text);
    expect(lines).toHaveLength(3);
    expect(skipped).toBe(1); // "invalid line without qty"
  });

  it("returns empty lines array for empty text", () => {
    const { lines, skipped } = parseBulkImportText("");
    expect(lines).toHaveLength(0);
    expect(skipped).toBe(0);
  });

  it("parses >1000 lines without capping (cap is in action) (B-5)", () => {
    const text = Array(1500).fill("1 Island").join("\n");
    const { lines, skipped } = parseBulkImportText(text);
    expect(lines).toHaveLength(1500);
    expect(skipped).toBe(0);
  });
});
