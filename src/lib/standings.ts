import { prisma } from "@/lib/db";

export interface StandingEntry {
  registrationId: string;
  userId: string;
  name: string;
  score: number;
  matchPoints: number;
  customMissions: number;
  omwp: number;
  isDropped: boolean;
  deckStatus: string;
  deckUrl: string | null;
}

export async function calculateStandingsAction(tournamentId: string): Promise<StandingEntry[]> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      registrations: {
        include: { user: true }
      },
      matches: {
        where: { status: "COMPLETED" },
        include: {
          matchPlayers: true
        }
      }
    }
  });

  if (!tournament) return [];

  const isCommander = tournament.format === "COMMANDER";
  const firstPlacePoints = tournament.firstPlacePoints ?? 4;

  // 1. Cálculo de las estadísticas base para cada jugador registrado
  const playerStatsMap = new Map<string, {
    registrationId: string;
    userId: string;
    name: string;
    isDropped: boolean;
    deckStatus: string;
    deckUrl: string | null;
    matchPoints: number;
    customMissions: number;
    opponents: string[];
    nonByeRounds: number;
    nonByePoints: number;
  }>();

  for (const reg of tournament.registrations) {
    playerStatsMap.set(reg.id, {
      registrationId: reg.id,
      userId: reg.user.id,
      name: reg.user.name,
      isDropped: reg.drop,
      deckStatus: reg.deckStatus,
      deckUrl: reg.deckUrl,
      matchPoints: 0,
      customMissions: 0,
      opponents: [],
      nonByeRounds: 0,
      nonByePoints: 0,
    });
  }

  // Se procesan todos los enfrentamientos finalizados para agregar puntuaciones y oponentes
  for (const match of tournament.matches) {
    const isBye = match.matchPlayers.length === 1;

    for (const mp of match.matchPlayers) {
      const stats = playerStatsMap.get(mp.registrationId);
      if (!stats) continue;

      // Acumulación de las puntuaciones
      stats.matchPoints += mp.points;
      stats.customMissions += mp.customMissions;

      if (isBye) {
        // Las exenciones (Byes) no computan en el cálculo del porcentaje de victorias de los oponentes
      } else {
        stats.nonByeRounds += 1;
        stats.nonByePoints += mp.points;
        // Registro de oponentes
        const opps = match.matchPlayers
          .filter(o => o.registrationId !== mp.registrationId)
          .map(o => o.registrationId);
        stats.opponents.push(...opps);
      }
    }
  }

  // 2. Cálculo del porcentaje individual de victorias en enfrentamientos (Match Win Percentage - MWP)
  const mwpMap = new Map<string, number>();
  const maxPointsPerRound = isCommander ? firstPlacePoints : 3;

  for (const [regId, stats] of playerStatsMap.entries()) {
    if (stats.nonByeRounds === 0) {
      mwpMap.set(regId, 0.33);
    } else {
      const computedMwp = stats.nonByePoints / (maxPointsPerRound * stats.nonByeRounds);
      mwpMap.set(regId, Math.max(0.33, computedMwp));
    }
  }

  // 3. Cálculo del porcentaje de victorias de los oponentes (Opponent Match Win Percentage - OMWP)
  const standings: StandingEntry[] = [];

  for (const [regId, stats] of playerStatsMap.entries()) {
    let opponentMwpSum = 0;
    let count = 0;

    for (const oppId of stats.opponents) {
      const oppMwp = mwpMap.get(oppId);
      if (oppMwp !== undefined) {
        opponentMwpSum += oppMwp;
        count++;
      }
    }

    const omwp = count > 0 ? (opponentMwpSum / count) : 0.33;

    standings.push({
      registrationId: regId,
      userId: stats.userId,
      name: stats.name,
      // Puntuación acumulada utilizada para la clasificación
      score: stats.matchPoints + stats.customMissions,
      matchPoints: stats.matchPoints,
      customMissions: stats.customMissions,
      omwp,
      isDropped: stats.isDropped,
      deckStatus: stats.deckStatus,
      deckUrl: stats.deckUrl,
    });
  }

  // 4. Ordenación de la clasificación general
  // Criterios de desempate estándar del sistema suizo: puntuación total primero, seguido del OMWP, logros personalizados y, finalmente, desempate alfabético por nombre del jugador
  standings.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (b.omwp !== a.omwp) {
      return b.omwp - a.omwp;
    }
    if (b.customMissions !== a.customMissions) {
      return b.customMissions - a.customMissions;
    }
    return a.name.localeCompare(b.name);
  });

  return standings;
}
