"use server";
 
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  generateSwissPairings,
  generateRandomPairings,
  generatePods,
  generateRandomPods,
  generateSingleEliminationPairings,
} from "@/lib/matchmaking";
import crypto from "crypto";
import { calculateStandingsAction } from "@/lib/standings";
 
 
 
export async function createTournamentAction(data: {
  name: string;
  format: string;
  roundTimer: number;
  date?: string;
  totalRounds?: number | null;
  pairingMode?: string;
  firstPlacePoints?: number;
  secondPlacePoints?: number;
  thirdPlacePoints?: number;
  fourthPlacePoints?: number;
  prizes: { name: string; startPlace: number; endPlace: number; storeCreditAmount?: number }[];
  missions: { description: string; points: number }[];
}) {
  let store = await prisma.store.findFirst();
  if (!store) {
    const owner = await prisma.user.create({ data: { name: "Admin", email: "admin@store.com", role: "ADMIN" }});
    store = await prisma.store.create({ data: { name: "Local Game Store", ownerId: owner.id }});
  }
 
  const tournament = await prisma.tournament.create({
    data: {
      name: data.name,
      format: data.format,
      roundTimer: data.roundTimer,
      date: data.date ? new Date(data.date) : null,
      totalRounds: data.totalRounds ?? null,
      pairingMode: data.pairingMode ?? "SWISS",
      storeId: store.id,
      firstPlacePoints: data.format === 'COMMANDER' ? data.firstPlacePoints : null,
      secondPlacePoints: data.format === 'COMMANDER' ? data.secondPlacePoints : null,
      thirdPlacePoints: data.format === 'COMMANDER' ? data.thirdPlacePoints : null,
      fourthPlacePoints: data.format === 'COMMANDER' ? data.fourthPlacePoints : null,
      prizes: {
        create: data.prizes.map(p => ({
          name: p.name,
          startPlace: p.startPlace,
          endPlace: p.endPlace,
          storeCreditAmount: p.storeCreditAmount ?? null
        }))
      },
      missions: {
        create: data.format === 'COMMANDER' ? data.missions.map(m => ({
          description: m.description,
          points: m.points
        })) : []
      }
    }
  });
 
  redirect(`/admin/tournaments/tournament/${tournament.id}`);
}
 
export async function startTournamentAction(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      registrations: {
        where: { drop: false },
      },
    },
  });
 
  if (!tournament || tournament.status !== "UPCOMING") {
    throw new Error("Tournament not found or already started");
  }
 
  const players = tournament.registrations.map((r) => ({
    registrationId: r.id,
    points: r.score,
    hasBye: false,
  }));
 
  if (players.length < 2) {
    throw new Error("Not enough players to start");
  }
 
  const isCommander = tournament.format === "COMMANDER";
  const isElimination = tournament.totalRounds == null || tournament.totalRounds === 0;
 
  let tables: Array<{ registrationId: string; points: number; hasBye?: boolean }[]>;
 
  if (isElimination) {
    if (isCommander) {
      tables = generateRandomPods(players, 4);
    } else {
      tables = generateSingleEliminationPairings(players);
    }
  } else if (isCommander) {
    if (tournament.pairingMode === "RANDOM") {
      tables = generateRandomPods(players, 4);
    } else {
      tables = generatePods(players, 4);
    }
  } else {
    if (tournament.pairingMode === "RANDOM") {
      tables = generateRandomPairings(players);
    } else {
      tables = generateSwissPairings(players);
    }
  }
 
  // Se crean los emparejamientos asignando números de mesa y completando automáticamente los jugadores exentos (byes)
  const matchCreatePromises = tables.map((table, index) => {
    const isBye = table.length === 1;
    const byePoints = isCommander ? (tournament.firstPlacePoints || 4) : 3;
    return prisma.match.create({
      data: {
        tournamentId,
        roundNumber: 1,
        tableNumber: index + 1,
        status: isBye ? "COMPLETED" : "IN_PROGRESS",
        matchPlayers: {
          create: table.map((p) => ({
            registrationId: p.registrationId,
            points: isBye ? byePoints : 0,
            status: isBye ? "CONFIRMED" : "PENDING",
          })),
        },
      },
    });
  });
 
  await Promise.all(matchCreatePromises);
  await recalculateTournamentScores(tournamentId);
 
  // Actualización del estado del torneo a activo e inicio del temporizador
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: "ONGOING",
      currentRound: 1,
      roundStartedAt: new Date(),
    },
  });
 
  revalidatePath(`/admin/tournaments/tournament/${tournamentId}`);
}
 
export async function submitMatchResultAction(matchId: string, reporterRegistrationId: string, pointsData: { matchPlayerId: string, points: number, customMissions?: number }[]) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { matchPlayers: true } });
  if (!match || match.status === "COMPLETED" || match.status === "PENDING_CONFIRMATION") return;
 
  for (const pd of pointsData) {
    const mp = match.matchPlayers.find((m: any) => m.id === pd.matchPlayerId);
    if (!mp) continue;
    await prisma.matchPlayer.update({
      where: { id: pd.matchPlayerId },
      data: { 
        points: pd.points,
        customMissions: pd.customMissions ?? mp.customMissions,
        status: mp.registrationId === reporterRegistrationId ? "CONFIRMED" : "PENDING"
      }
    });
  }
 
  await prisma.match.update({
    where: { id: matchId },
    data: { status: "PENDING_CONFIRMATION" }
  });
 
  revalidatePath(`/player/tournaments/tournament/${match.tournamentId}`);
  revalidatePath(`/admin/tournaments/tournament/${match.tournamentId}`);
}
 
export async function confirmMatchResultAction(matchId: string, participantRegistrationId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { matchPlayers: true } });
  if (!match) return;
 
  const player = match.matchPlayers.find((p: any) => p.registrationId === participantRegistrationId);
  if (player) {
    await prisma.matchPlayer.update({
      where: { id: player.id },
      data: { status: "CONFIRMED" }
    });
  }
 
  const updatedMatchPlayers = await prisma.matchPlayer.findMany({ where: { matchId }});
  const allConfirmed = updatedMatchPlayers.every(p => p.status === "CONFIRMED");
 
  if (allConfirmed) {
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "COMPLETED" }
    });
    await recalculateTournamentScores(match.tournamentId);
  }
 
  revalidatePath(`/player/tournaments/tournament/${match.tournamentId}`);
  revalidatePath(`/admin/tournaments/tournament/${match.tournamentId}`);
}
 
export async function denyMatchResultAction(matchId: string) {
  const match = await prisma.match.update({
    where: { id: matchId },
    data: { status: "DISPUTED" }
  });
  revalidatePath(`/player/tournaments/tournament/${match.tournamentId}`);
  revalidatePath(`/admin/tournaments/tournament/${match.tournamentId}`);
}
 
export async function adminResolveMatchAction(matchId: string, pointsData: { matchPlayerId: string, points: number, customMissions?: number }[]) {
  const match = await prisma.match.findUnique({ where: { id: matchId }});
  if (!match) return;
 
  for (const pd of pointsData) {
    await prisma.matchPlayer.update({
      where: { id: pd.matchPlayerId },
      data: { 
        points: pd.points, 
        customMissions: pd.customMissions ?? 0,
        status: "CONFIRMED" 
      }
    });
  }
 
  await prisma.match.update({
    where: { id: matchId },
    data: { status: "COMPLETED" }
  });
 
  await recalculateTournamentScores(match.tournamentId);
 
  revalidatePath(`/admin/tournaments/tournament/${match.tournamentId}`);
  revalidatePath(`/player/tournaments/tournament/${match.tournamentId}`);
}
 
async function recalculateTournamentScores(tournamentId: string) {
  const registrations = await prisma.playerRegistration.findMany({
    where: { tournamentId },
    include: {
      matchPlayers: {
        where: {
          match: {
            status: "COMPLETED"
          }
        }
      }
    }
  });
 
  for (const reg of registrations) {
    const totalPoints = reg.matchPlayers.reduce((sum, mp) => sum + mp.points + mp.customMissions, 0);
    await prisma.playerRegistration.update({
      where: { id: reg.id },
      data: { score: totalPoints }
    });
  }
}
 
export async function nextRoundAction(tournamentId: string) {
  // Se recalculan las puntuaciones para garantizar su precisión antes de generar los nuevos emparejamientos
  await recalculateTournamentScores(tournamentId);
 
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      registrations: { where: { drop: false } },
    },
  });
 
  if (!tournament || tournament.status !== "ONGOING") return;
 
  if (tournament.totalRounds && tournament.currentRound >= tournament.totalRounds) {
    throw new Error(`Cannot advance: This tournament is limited to ${tournament.totalRounds} rounds.`);
  }
 
  const pendingMatches = await prisma.match.findFirst({
    where: { 
      tournamentId, 
      roundNumber: tournament.currentRound, 
      status: { not: "COMPLETED" } 
    }
  });
 
  if (pendingMatches) {
    throw new Error("Cannot advance round: not all matches are completed.");
  }
 
  // Se identifica qué jugadores han recibido una exención (bye) en rondas previas
  const players = await Promise.all(
    tournament.registrations.map(async (r) => {
      const playerMatches = await prisma.match.findMany({
        where: {
          tournamentId,
          matchPlayers: {
            some: { registrationId: r.id }
          }
        },
        include: {
          matchPlayers: true
        }
      });
      const hasHadBye = playerMatches.some(m => m.matchPlayers.length === 1);
      return {
        registrationId: r.id,
        points: r.score,
        hasBye: hasHadBye,
      };
    })
  );
 
  // Se construye el historial de oponentes cruzados para evitar la duplicidad de enfrentamientos en emparejamientos suizos
  const completedMatches = await prisma.match.findMany({
    where: {
      tournamentId,
      status: "COMPLETED"
    },
    include: {
      matchPlayers: true
    }
  });

  const history: Record<string, string[]> = {};
  for (const reg of tournament.registrations) {
    history[reg.id] = [];
  }

  for (const match of completedMatches) {
    const pIds = match.matchPlayers.map(mp => mp.registrationId);
    for (const pId of pIds) {
      if (!history[pId]) history[pId] = [];
      const opponents = pIds.filter(id => id !== pId);
      history[pId].push(...opponents);
    }
  }

  const isCommander = tournament.format === "COMMANDER";
  let tables: Array<{ registrationId: string; points: number; hasBye?: boolean }[]> = [];
 
  if (isCommander) {
    tables = tournament.pairingMode === "RANDOM" ? generateRandomPods(players, 4) : generatePods(players, 4);
  } else {
    tables = tournament.pairingMode === "RANDOM" 
      ? generateRandomPairings(players, history) 
      : generateSwissPairings(players, history);
  }
 
  const nextRound = tournament.currentRound + 1;
 
  const matchCreatePromises = tables.map((table: any, index: number) => {
    const isBye = table.length === 1;
    const byePoints = isCommander ? (tournament.firstPlacePoints || 4) : 3;
    return prisma.match.create({
      data: {
        tournamentId,
        roundNumber: nextRound,
        tableNumber: index + 1,
        status: isBye ? "COMPLETED" : "IN_PROGRESS",
        matchPlayers: {
          create: table.map((p: any) => ({
            registrationId: p.registrationId,
            points: isBye ? byePoints : 0,
            status: isBye ? "CONFIRMED" : "PENDING",
          })),
        },
      },
    });
  });
 
  await Promise.all(matchCreatePromises);
  await recalculateTournamentScores(tournamentId);
 
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      currentRound: nextRound,
      roundStartedAt: new Date(),
    },
  });
 
  revalidatePath(`/admin/tournaments/tournament/${tournamentId}`);
  revalidatePath(`/player/tournaments/tournament/${tournamentId}`);
}
 
export async function endTournamentAndDistributePrizesAction(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      registrations: {
        include: { user: true }
      },
      prizes: true
    }
  });
 
  if (!tournament || tournament.status === "COMPLETED") return;
 
  const pendingMatches = await prisma.match.findFirst({
    where: { 
      tournamentId, 
      roundNumber: tournament.currentRound, 
      status: { not: "COMPLETED" } 
    }
  });
 
  if (pendingMatches) {
    throw new Error("Cannot end tournament: not all matches are completed.");
  }
 
  // Consolidación y recálculo final de las puntuaciones antes de procesar la clasificación definitiva
  await recalculateTournamentScores(tournamentId);
 
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "COMPLETED" }
  });
 
  // Obtención de la clasificación oficial ponderando los criterios de desempate suizos
  const standings = await calculateStandingsAction(tournamentId);
 
  for (const prize of tournament.prizes) {
    const startIdx = prize.startPlace - 1;
    const endIdx = prize.endPlace - 1;
    for (let i = startIdx; i <= endIdx; i++) {
        const player = standings[i];
        if (player) {
           const id = crypto.randomUUID();
           await prisma.$executeRawUnsafe(
             `INSERT INTO UserPrize (id, userId, tournamentId, name, place, awardedAt) VALUES (?, ?, ?, ?, ?, ?)`,
             id, 
             player.userId, 
             tournamentId, 
             prize.name, 
             i + 1, 
             new Date().toISOString()
           );

           // Acreditación de saldo en la cartera virtual del usuario si el premio incluye crédito de la tienda
           if (prize.storeCreditAmount && prize.storeCreditAmount > 0) {
             await prisma.user.update({
               where: { id: player.userId },
               data: {
                 storeCredit: { increment: prize.storeCreditAmount }
               }
             });
           }
        }
    }
  }
 
  revalidatePath(`/admin/tournaments/tournament/${tournamentId}`);
  revalidatePath(`/player/tournaments/tournament/${tournamentId}`);
  revalidatePath(`/player/tournaments`);
}
 
export async function registerGuestAction(tournamentId: string, guestName: string, guestEmail: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new Error("Tournament not found");
 
  let user = await prisma.user.findUnique({ where: { email: guestEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: `${guestName} (guest)`,
        email: guestEmail,
        role: "PLAYER"
      }
    });
  }
 
  const existingRegistration = await prisma.playerRegistration.findFirst({
    where: {
      tournamentId,
      userId: user.id
    }
  });
 
  if (!existingRegistration) {
    await prisma.playerRegistration.create({
      data: {
        tournamentId,
        userId: user.id,
        deckStatus: "NOT_REQUIRED",
      }
    });
  }
 
  revalidatePath(`/admin/tournaments/tournament/${tournamentId}`);
}

export async function dropPlayerAction(registrationId: string) {
  const registration = await prisma.playerRegistration.update({
    where: { id: registrationId },
    data: { drop: true },
    include: { tournament: true }
  });

  const tournamentId = registration.tournamentId;

  // Localización de enfrentamientos activos en la ronda en curso
  const activeMatchPlayer = await prisma.matchPlayer.findFirst({
    where: {
      registrationId,
      match: {
        tournamentId,
        roundNumber: registration.tournament.currentRound,
        status: { in: ["IN_PROGRESS", "PENDING_CONFIRMATION", "DISPUTED"] }
      }
    },
    include: { match: { include: { matchPlayers: true } } }
  });

  if (activeMatchPlayer) {
    const match = activeMatchPlayer.match;
    const isCommander = registration.tournament.format === "COMMANDER";

    if (isCommander) {
      // En el formato Commander: se asigna una puntuación nula (0) al jugador retirado y se marca su estado como CONFIRMED
      await prisma.matchPlayer.update({
        where: { id: activeMatchPlayer.id },
        data: { points: 0, status: "CONFIRMED" }
      });
      
      const allConfirmed = match.matchPlayers.every(p => p.registrationId === registrationId || p.status === "CONFIRMED");
      if (allConfirmed) {
        await prisma.match.update({
          where: { id: match.id },
          data: { status: "COMPLETED" }
        });
      }
    } else {
      // En formato Suizo 1v1: se otorga la victoria (3 puntos) al oponente, se marcan ambos registros como confirmados y se finaliza la partida
      const opponent = match.matchPlayers.find(p => p.registrationId !== registrationId);
      await prisma.matchPlayer.update({
        where: { id: activeMatchPlayer.id },
        data: { points: 0, status: "CONFIRMED" }
      });
      if (opponent) {
        await prisma.matchPlayer.update({
          where: { id: opponent.id },
          data: { points: 3, status: "CONFIRMED" }
        });
      }
      await prisma.match.update({
        where: { id: match.id },
        data: { status: "COMPLETED" }
      });
    }
  }

  await recalculateTournamentScores(tournamentId);
  revalidatePath(`/admin/tournaments/tournament/${tournamentId}`);
  revalidatePath(`/player/tournaments/tournament/${tournamentId}`);
}
