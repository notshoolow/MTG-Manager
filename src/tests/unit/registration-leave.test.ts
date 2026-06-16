import { describe, it, expect, vi, beforeEach } from 'vitest';
import { leaveTournamentAction } from '@/app/actions/deck-actions';

// Simulación (mock) de la base de datos
vi.mock('@/lib/db', () => {
  return {
    prisma: {
      playerRegistration: {
        findFirst: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/auth', () => ({
  getMockUserId: vi.fn().mockResolvedValue('user-1'),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Player Leave Tournament Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows leaving an upcoming tournament', async () => {
    const { prisma } = await import('@/lib/db');

    const mockReg = {
      id: 'reg-1',
      tournamentId: 'tour-1',
      userId: 'user-1',
      tournament: { status: 'UPCOMING' },
      _count: { matchPlayers: 0 }
    };

    (prisma.playerRegistration.findFirst as any).mockResolvedValue(mockReg);
    (prisma.playerRegistration.delete as any).mockResolvedValue(mockReg);

    const result = await leaveTournamentAction('tour-1');

    expect(result.success).toBe(true);
    expect(result.message).toContain('Te has salido del torneo con éxito');
    expect(prisma.playerRegistration.delete).toHaveBeenCalledWith({
      where: { id: 'reg-1' }
    });
  });

  it('blocks leaving ongoing or started tournaments', async () => {
    const { prisma } = await import('@/lib/db');

    const mockReg = {
      id: 'reg-1',
      tournamentId: 'tour-1',
      userId: 'user-1',
      tournament: { status: 'ONGOING' },
      _count: { matchPlayers: 0 }
    };

    (prisma.playerRegistration.findFirst as any).mockResolvedValue(mockReg);

    const result = await leaveTournamentAction('tour-1');

    expect(result.success).toBe(false);
    expect(result.message).toContain('No puedes salirte de un torneo que ya ha comenzado');
    expect(prisma.playerRegistration.delete).not.toHaveBeenCalled();
  });
});
