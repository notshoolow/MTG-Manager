"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";



export async function updatePlayerProfile(userId: string, data: { name: string, avatarUrl: string }) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      avatarUrl: data.avatarUrl
    }
  });

  revalidatePath('/player/tournaments');
}
