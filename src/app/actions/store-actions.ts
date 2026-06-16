'use server';

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getStoreId() {
  const store = await prisma.store.findFirst();
  return store?.id;
}

export async function getStoreSettingsAction() {
  const store = await prisma.store.findFirst();
  return store;
}

export async function updateStoreSettingsAction(data: { 
  priceAlertDailyThreshold?: number, 
  priceAlertWeeklyThreshold?: number,
  buylistDefaultRate?: number,
  buylistDefaultRateCredit?: number
}) {
  try {
    const storeId = await getStoreId();
    if (!storeId) throw new Error("No se encontró la tienda");

    await prisma.store.update({
      where: { id: storeId },
      data
    });

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getConditionModifiersAction() {
  try {
    let modifiers = await prisma.conditionModifier.findMany();
    if (modifiers.length === 0) {
      await prisma.conditionModifier.createMany({
        data: [
          { condition: "NM", multiplier: 1.0 },
          { condition: "LP", multiplier: 0.90 },
          { condition: "MP", multiplier: 0.75 },
          { condition: "HP", multiplier: 0.50 },
          { condition: "PO", multiplier: 0.25 }
        ]
      });
      modifiers = await prisma.conditionModifier.findMany();
    }
    return modifiers;
  } catch (error: any) {
    console.error("Error getting condition modifiers:", error);
    return [];
  }
}

export async function updateConditionModifiersAction(modifiers: Record<string, number>) {
  try {
    for (const [condition, multiplier] of Object.entries(modifiers)) {
      await prisma.conditionModifier.upsert({
        where: { condition },
        update: { multiplier },
        create: { condition, multiplier }
      });
    }
    revalidatePath("/admin/settings");
    revalidatePath("/player/buylist/new");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

