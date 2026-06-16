import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateStandingsAction } from '@/lib/standings';

// Simulación (mock) de la base de datos
vi.mock('@/lib/db', () => {
  return {
    prisma: {
      tournament: {
        findUnique: vi.fn(),
      },
    },
  };
});

import { prisma } from '@/lib/db';

describe('Standings Calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates points and sorts by score and OMWP correctly', async () => {
    // 3 jugadores: A, B, C
    // A se enfrenta a B, C tiene exención de emparejamiento (bye)
    const mockTournament = {
      id: 'tourney-1',
      format: 'SWISS',
      firstPlacePoints: 3,
      registrations: [
        { id: 'reg-a', drop: false, deckStatus: 'VALIDATED', deckUrl: null, user: { id: 'user-a', name: 'Player A' } },
        { id: 'reg-b', drop: false, deckStatus: 'VALIDATED', deckUrl: null, user: { id: 'user-b', name: 'Player B' } },
        { id: 'reg-c', drop: false, deckStatus: 'VALIDATED', deckUrl: null, user: { id: 'user-c', name: 'Player C' } },
      ],
      matches: [
        {
          id: 'match-1',
          status: 'COMPLETED',
          matchPlayers: [
            { registrationId: 'reg-a', points: 3, customMissions: 0 }, // El jugador A ganó
            { registrationId: 'reg-b', points: 0, customMissions: 0 },
          ],
        },
        {
          id: 'match-2',
          status: 'COMPLETED',
          matchPlayers: [
            { registrationId: 'reg-c', points: 3, customMissions: 0 }, // El jugador C tuvo exención (bye)
          ],
        },
      ],
    };

    (prisma.tournament.findUnique as any).mockResolvedValue(mockTournament);

    const standings = await calculateStandingsAction('tourney-1');

    // Salida esperada:
    // A: 1 partida jugada (sin exención), 3 pts -> MWP = 1.0. OMWP = MWP de B = 0.33
    // C: 0 partidas jugadas (sin exención), 3 pts -> MWP = 0.33. OMWP = 0.33 (sin oponentes)
    // B: 1 partida jugada, 0 pts -> MWP = 0.33. OMWP = MWP de A = 1.0
    // Lógica de ordenación: Puntos desc., luego OMWP desc., luego orden alfabético
    // A tiene 3 pts, OMWP = 0.33
    // C tiene 3 pts, OMWP = 0.33
    // B tiene 0 pts, OMWP = 1.00
    // Por lo tanto, el orden debe ser A, C, B (A y C empatan en puntos/OMWP, A se ordena antes que C alfabéticamente)
    expect(standings.length).toBe(3);
    expect(standings[0].registrationId).toBe('reg-a');
    expect(standings[1].registrationId).toBe('reg-c');
    expect(standings[2].registrationId).toBe('reg-b');

    expect(standings[0].score).toBe(3);
    expect(standings[1].score).toBe(3);
    expect(standings[2].score).toBe(0);

    expect(standings[0].omwp).toBe(0.33); // El oponente B de A tiene MWP 0.33
    expect(standings[2].omwp).toBe(1.0); // El oponente A de B tiene MWP 1.0
  });
});
