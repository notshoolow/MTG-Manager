import { describe, it, expect } from "vitest";
import { computeFinalPrice, PricingContext } from "../lib/pricing-engine";

describe("pricing-engine", () => {
  it("should return base price when no modifiers apply", () => {
    const ctx: PricingContext = {
      marketPrice: 2.0,
      manualPrice: null,
      condition: "NM",
      conditionModifiers: {},
      pricingRule: null,
      activeFlashSale: null,
      roundingBands: [],
    };
    expect(computeFinalPrice(ctx)).toBe(2.0);
  });

  it("should prefer manual price over market price", () => {
    const ctx: PricingContext = {
      marketPrice: 2.0,
      manualPrice: 5.0,
      condition: "NM",
      conditionModifiers: {},
      pricingRule: null,
      activeFlashSale: null,
      roundingBands: [],
    };
    expect(computeFinalPrice(ctx)).toBe(5.0);
  });

  it("should return null if no prices available", () => {
    const ctx: PricingContext = {
      marketPrice: null,
      manualPrice: null,
      condition: "NM",
      conditionModifiers: {},
      pricingRule: null,
      activeFlashSale: null,
      roundingBands: [],
    };
    expect(computeFinalPrice(ctx)).toBeNull();
  });

  it("should apply condition modifiers correctly", () => {
    const ctx: PricingContext = {
      marketPrice: 10.0,
      manualPrice: null,
      condition: "LP",
      conditionModifiers: { NM: 1.0, LP: 0.75, PO: 0.5 },
      pricingRule: null,
      activeFlashSale: null,
      roundingBands: [],
    };
    expect(computeFinalPrice(ctx)).toBe(7.5); // 10 * 0.75
  });

  it("should treat M the same as NM if M is missing", () => {
    const ctx: PricingContext = {
      marketPrice: 10.0,
      manualPrice: null,
      condition: "M",
      conditionModifiers: { NM: 1.05 },
      pricingRule: null,
      activeFlashSale: null,
      roundingBands: [],
    };
    expect(computeFinalPrice(ctx)).toBe(10.5); // 10 * 1.05
  });

  it("should apply pricing rule FLAT_MARKUP", () => {
    const ctx: PricingContext = {
      marketPrice: 2.0,
      manualPrice: null,
      condition: "NM",
      conditionModifiers: {},
      pricingRule: { id: "1", type: "FLAT_MARKUP", valueA: 0.5 },
      activeFlashSale: null,
      roundingBands: [],
    };
    expect(computeFinalPrice(ctx)).toBe(2.5);
  });

  it("should apply rounding band", () => {
    const ctx: PricingContext = {
      marketPrice: 1.25, // Antes de aplicar redondeo
      manualPrice: null,
      condition: "NM",
      conditionModifiers: {},
      pricingRule: null,
      activeFlashSale: null,
      roundingBands: [
        { minPrice: 0.01, maxPrice: 5.0, roundTo: 0.5, priority: 0 }
      ],
    };
    // 1.25 -> el valor de 0.5 más cercano es 1.5 (1.25 -> 2.5/2 -> 1.5) o 1.0. Math.round(1.25 / 0.5) * 0.5 = Math.round(2.5) * 0.5 = 3 * 0.5 = 1.5
    expect(computeFinalPrice(ctx)).toBe(1.5);
  });

  it("should apply flash sale AFTER rounding", () => {
    const ctx: PricingContext = {
      marketPrice: 1.25,
      manualPrice: null,
      condition: "NM",
      conditionModifiers: {},
      pricingRule: null,
      activeFlashSale: {
        discount: 0.2, // 20% de descuento
        startsAt: new Date(Date.now() - 1000),
        expiresAt: new Date(Date.now() + 10000),
        isActive: true,
      },
      roundingBands: [
        { minPrice: 0.01, maxPrice: 5.0, roundTo: 0.5, priority: 0 }
      ],
    };
    // 1.25 se redondea a 1.5. Luego, aplicando el 20% de descuento sobre 1.5 = 1.2
    expect(computeFinalPrice(ctx)).toBeCloseTo(1.2, 2);
  });

  it("should apply the full pipeline correctly", () => {
    const ctx: PricingContext = {
      marketPrice: 10.0,
      manualPrice: null,
      condition: "LP",
      conditionModifiers: { LP: 0.8 }, // Precio base = 8.0
      pricingRule: { id: "1", type: "PERCENT_MARKUP", valueA: 10 }, // 8.0 * 1.1 = 8.8
      activeFlashSale: {
        discount: 0.5, // 50% de descuento
        startsAt: new Date(Date.now() - 1000),
        expiresAt: new Date(Date.now() + 10000),
        isActive: true,
      },
      roundingBands: [
        { minPrice: 5.0, maxPrice: 20.0, roundTo: 1.0, priority: 0 } // 8.8 se redondea a 9.0
      ],
    };
    // Flujo de cálculo completo:
    // Precio de mercado: 10.0
    // Modificador por estado (LP): 10 * 0.8 = 8.0
    // Regla de ajuste (+10%): 8.0 * 1.1 = 8.8
    // Redondeo (roundTo 1.0): 8.8 -> 9.0
    // Venta flash (50% de descuento): 9.0 * 0.5 = 4.5
    expect(computeFinalPrice(ctx)).toBe(4.5);
  });

  // Pruebas de casos límite
  it("should apply PERCENT_OF_MARKET rule (P-1)", () => {
    const ctx: PricingContext = {
      marketPrice: 10.0,
      manualPrice: null,
      condition: "NM",
      conditionModifiers: {},
      pricingRule: { id: "1", type: "PERCENT_OF_MARKET", valueA: 80 },
      activeFlashSale: null,
      roundingBands: [],
    };
    expect(computeFinalPrice(ctx)).toBe(8.0); // 10 * 0.8
  });

  it("should skip rule if currentPrice < minPrice (P-2)", () => {
    const ctx: PricingContext = {
      marketPrice: 5.0,
      manualPrice: null,
      condition: "NM",
      conditionModifiers: {},
      pricingRule: { id: "1", type: "FLAT_MARKUP", valueA: 2.0, minPrice: 10.0 },
      activeFlashSale: null,
      roundingBands: [],
    };
    expect(computeFinalPrice(ctx)).toBe(5.0); // Regla omitida
  });

  it("should skip rule if currentPrice > maxPrice (P-3)", () => {
    const ctx: PricingContext = {
      marketPrice: 15.0,
      manualPrice: null,
      condition: "NM",
      conditionModifiers: {},
      pricingRule: { id: "1", type: "FLAT_MARKUP", valueA: 2.0, maxPrice: 10.0 },
      activeFlashSale: null,
      roundingBands: [],
    };
    expect(computeFinalPrice(ctx)).toBe(15.0); // Regla omitida
  });

  it("should not apply flash sale if isActive = false (P-4)", () => {
    const ctx: PricingContext = {
      marketPrice: 10.0,
      manualPrice: null,
      condition: "NM",
      conditionModifiers: {},
      pricingRule: null,
      activeFlashSale: { discount: 0.5, startsAt: new Date(0), expiresAt: new Date(Date.now() + 100000), isActive: false },
      roundingBands: [],
    };
    expect(computeFinalPrice(ctx)).toBe(10.0);
  });

  it("should not apply flash sale if expired (P-5)", () => {
    const ctx: PricingContext = {
      marketPrice: 10.0,
      manualPrice: null,
      condition: "NM",
      conditionModifiers: {},
      pricingRule: null,
      activeFlashSale: { discount: 0.5, startsAt: new Date(0), expiresAt: new Date(Date.now() - 1000), isActive: true },
      roundingBands: [],
    };
    expect(computeFinalPrice(ctx)).toBe(10.0);
  });

  it("should not apply flash sale if startsAt is in the future (P-6)", () => {
    const ctx: PricingContext = {
      marketPrice: 10.0,
      manualPrice: null,
      condition: "NM",
      conditionModifiers: {},
      pricingRule: null,
      activeFlashSale: { discount: 0.5, startsAt: new Date(Date.now() + 10000), expiresAt: new Date(Date.now() + 100000), isActive: true },
      roundingBands: [],
    };
    expect(computeFinalPrice(ctx)).toBe(10.0);
  });

  it("should not crash or round if roundTo = 0 (P-7)", () => {
    const ctx: PricingContext = {
      marketPrice: 1.23,
      manualPrice: null,
      condition: "NM",
      conditionModifiers: {},
      pricingRule: null,
      activeFlashSale: null,
      roundingBands: [{ minPrice: 0, maxPrice: 10, roundTo: 0, priority: 1 }],
    };
    expect(computeFinalPrice(ctx)).toBe(1.23);
  });

  it("should clamp final price to 0 if negative (P-8)", () => {
    const ctx: PricingContext = {
      marketPrice: 1.0,
      manualPrice: null,
      condition: "NM",
      conditionModifiers: {},
      pricingRule: { id: "1", type: "FLAT_MARKUP", valueA: -5.0 }, // el resultado sería -4.0
      activeFlashSale: null,
      roundingBands: [],
    };
    expect(computeFinalPrice(ctx)).toBe(0);
  });

  it("should only apply the first matched rounding band by priority (P-9)", () => {
    const ctx: PricingContext = {
      marketPrice: 2.3,
      manualPrice: null,
      condition: "NM",
      conditionModifiers: {},
      pricingRule: null,
      activeFlashSale: null,
      roundingBands: [
        { minPrice: 0, maxPrice: 10, roundTo: 1.0, priority: 2 }, // coincide, pero con menor prioridad
        { minPrice: 0, maxPrice: 10, roundTo: 0.5, priority: 1 }, // coincide, con mayor prioridad (se debe usar esta -> 2.5)
      ],
    };
    expect(computeFinalPrice(ctx)).toBe(2.5);
  });
});
