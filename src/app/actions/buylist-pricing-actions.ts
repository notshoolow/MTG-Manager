'use server';

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getBuylistPriceBandsAction() {
  try {
    const bands = await prisma.buylistPriceBand.findMany({
      orderBy: { minPrice: 'asc' }
    });
    return { success: true, data: bands };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function upsertBuylistPriceBandAction(
  id: string | null,
  minPrice: number,
  maxPrice: number,
  rateCash: number,
  rateCredit: number
) {
  try {
    if (minPrice < 0 || maxPrice < 0 || rateCash < 0 || rateCredit < 0) {
      throw new Error("Los valores no pueden ser negativos.");
    }
    if (minPrice > maxPrice) {
      throw new Error("El precio mínimo no puede ser mayor que el precio máximo.");
    }

    if (id) {
      const band = await prisma.buylistPriceBand.update({
        where: { id },
        data: { minPrice, maxPrice, rateCash, rateCredit }
      });
      revalidatePath("/admin/pricing");
      revalidatePath("/player/buylist/new");
      return { success: true, data: band };
    } else {
      const band = await prisma.buylistPriceBand.create({
        data: { minPrice, maxPrice, rateCash, rateCredit }
      });
      revalidatePath("/admin/pricing");
      revalidatePath("/player/buylist/new");
      return { success: true, data: band };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteBuylistPriceBandAction(id: string) {
  try {
    await prisma.buylistPriceBand.delete({
      where: { id }
    });
    revalidatePath("/admin/pricing");
    revalidatePath("/player/buylist/new");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
