"use server";

import { validateDeck } from "@/lib/deck-validator";
import { prisma } from "@/lib/db";
import { getMockUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function validateAndRegisterDeck(tournamentId: string, deckUrl: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
     return { success: false, message: "Tournament not found." };
  }

  let result = { isValid: true, message: "Valid", cost: 0 };
  const requiresDeck = !["DRAFT", "SEALED"].includes(tournament.format);

  if (requiresDeck) {
     result = await validateDeck(deckUrl, tournament.format);
  }

  if (!result.isValid) {
    return {
      success: false,
      message: result.message,
    };
  }

  const mockUserId = await getMockUserId();
  const player = await prisma.user.findUnique({ where: { id: mockUserId } });
  if (!player) {
    return { success: false, message: "Player not found." };
  }
 
  // Check for existing registration
  const existingRegistration = await prisma.playerRegistration.findFirst({
    where: {
      tournamentId,
      userId: player.id
    }
  });
 
  if (existingRegistration) {
    if (tournament.status !== "UPCOMING") {
      return { success: false, message: "Cannot change deck list once the tournament has started." };
    }
 
    // Update existing registration
    const updated = await prisma.playerRegistration.update({
      where: { id: existingRegistration.id },
      data: {
        deckUrl: requiresDeck ? deckUrl : existingRegistration.deckUrl,
        deckStatus: requiresDeck ? "VALIDATED" : "NOT_REQUIRED",
        deckCost: requiresDeck ? result.cost : 0,
      }
    });
 
    return {
      success: true,
      message: "Deck successfully updated.",
      registration: updated,
    };
  }
 
  // Create the player's registration in the database
  const registration = await prisma.playerRegistration.create({
    data: {
      tournamentId,
      userId: player.id,
      deckUrl: requiresDeck ? deckUrl : undefined,
      deckStatus: requiresDeck ? "VALIDATED" : "NOT_REQUIRED",
      deckCost: requiresDeck ? result.cost : 0,
    },
  });

  return {
    success: true,
    message: "Deck successfully validated and registered.",
    registration,
  };
}

export async function leaveTournamentAction(tournamentId: string) {
  const mockUserId = await getMockUserId();
  const registration = await prisma.playerRegistration.findFirst({
    where: {
      tournamentId,
      userId: mockUserId,
    },
    include: {
      tournament: true,
      _count: {
        select: { matchPlayers: true }
      }
    }
  });

  if (!registration) {
    return { success: false, message: "No estás registrado en este torneo." };
  }

  if (registration.tournament.status !== "UPCOMING" || registration._count.matchPlayers > 0) {
    return { success: false, message: "No puedes salirte de un torneo que ya ha comenzado." };
  }

  await prisma.playerRegistration.delete({
    where: { id: registration.id }
  });

  revalidatePath('/player/tournaments');
  revalidatePath(`/player/tournaments/tournament/${tournamentId}`);

  return { success: true, message: "Te has salido del torneo con éxito." };
}
