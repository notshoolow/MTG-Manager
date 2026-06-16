import { describe, it, expect, vi, beforeEach } from 'vitest';
import { endTournamentAndDistributePrizesAction } from '@/app/actions/tournament-actions';

// Simulación (mock) de la base de datos
vi.mock('@/lib/db', () => {
  return {
    prisma: {
      tournament: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      match: {
        findFirst: vi.fn().mockResolvedValue(null), // sin partidas pendientes
      },
      playerRegistration: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
      },
      user: {
        update: vi.fn(),
      },
      $executeRawUnsafe: vi.fn(),
    },
  };
});

vi.mock('@/lib/standings', () => ({
  calculateStandingsAction: vi.fn().mockResolvedValue([
    { userId: 'user-winner', score: 9 },
    { userId: 'user-runnerup', score: 6 }
  ]),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Tournament Prize Distribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ends tournament and awards store credit prize directly to user profile balance', async () => {
    const { prisma } = await import('@/lib/db');
    
    const mockTournament = {
      id: 'tour-1',
      status: 'ONGOING',
      currentRound: 3,
      registrations: [
        { id: 'reg-1', userId: 'user-winner', user: { name: 'Winner' } },
        { id: 'reg-2', userId: 'user-runnerup', user: { name: 'Runner Up' } }
      ],
      prizes: [
        { id: 'prize-1', name: '1st Place Credit', startPlace: 1, endPlace: 1, storeCreditAmount: 20.0 }
      ]
    };

    (prisma.tournament.findUnique as any).mockResolvedValue(mockTournament);

    await endTournamentAndDistributePrizesAction('tour-1');

    // Verificar que el estado del torneo sea completado (COMPLETED)
    expect(prisma.tournament.update).toHaveBeenCalledWith({
      where: { id: 'tour-1' },
      data: { status: 'COMPLETED' }
    });

    // Verificar que la consulta directa (raw query) inserte el registro de premio del usuario (UserPrize)
    expect(prisma.$executeRawUnsafe).toHaveBeenCalled();

    // Verificar que el saldo de la cartera del jugador se haya incrementado en 20,00 €
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-winner' },
      data: {
        storeCredit: { increment: 20.0 }
      }
    });
  });
});
