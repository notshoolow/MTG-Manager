import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSwissPairings, generatePods } from '@/lib/matchmaking';
import { validateDeck, parseTextDeck } from '@/lib/deck-validator';

// Simulación de base de datos para las consultas del validador de mazos
vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    scryfallCard: {
      findFirst: vi.fn(),
      upsert: vi.fn()
    }
  }
}));

import { prisma } from '@/lib/db';

describe('Matchmaking and Pod Generation', () => {
  describe('Swiss Matchmaking with Backtracking', () => {
    it('pairs adjacent scores when no history exists', () => {
      const players = [
        { registrationId: 'A', points: 9 },
        { registrationId: 'B', points: 9 },
        { registrationId: 'C', points: 6 },
        { registrationId: 'D', points: 6 },
      ];
      
      const pairings = generateSwissPairings(players);
      expect(pairings).toHaveLength(2);
      expect(pairings[0]).toEqual([
        { registrationId: 'A', points: 9 },
        { registrationId: 'B', points: 9 }
      ]);
      expect(pairings[1]).toEqual([
        { registrationId: 'C', points: 6 },
        { registrationId: 'D', points: 6 }
      ]);
    });

    it('avoids repeat matchups based on history', () => {
      const players = [
        { registrationId: 'A', points: 9 },
        { registrationId: 'B', points: 9 },
        { registrationId: 'C', points: 6 },
        { registrationId: 'D', points: 6 },
      ];
      // A ya se enfrentó a B; C ya se enfrentó a D
      const history = {
        'A': ['B'],
        'B': ['A'],
        'C': ['D'],
        'D': ['C']
      };

      const pairings = generateSwissPairings(players, history);
      expect(pairings).toHaveLength(2);
      
      // Los emparejamientos no deben ser A-B ni C-D
      const aPair = pairings.find(p => p.some(x => x.registrationId === 'A'));
      const opponentOfA = aPair?.find(x => x.registrationId !== 'A')?.registrationId;
      expect(opponentOfA).not.toBe('B');
      expect(opponentOfA).toBeDefined();
    });

    it('relaxes rules when no perfect pairing is possible', () => {
      const players = [
        { registrationId: 'A', points: 9 },
        { registrationId: 'B', points: 9 },
        { registrationId: 'C', points: 6 },
        { registrationId: 'D', points: 6 },
      ];
      // Todos los jugadores se han enfrentado entre sí
      const history = {
        'A': ['B', 'C', 'D'],
        'B': ['A', 'C', 'D'],
        'C': ['A', 'B', 'D'],
        'D': ['A', 'B', 'C']
      };

      // El algoritmo de búsqueda con retroceso (backtracking) debe recurrir a permitir repeticiones
      const pairings = generateSwissPairings(players, history);
      expect(pairings).toHaveLength(2);
      expect(pairings[0]).toHaveLength(2);
      expect(pairings[1]).toHaveLength(2);
    });
  });

  describe('Commander Pod Generation', () => {
    it('creates pods of 4 when N is a multiple of 4', () => {
      const players = Array.from({ length: 8 }, (_, i) => ({ registrationId: `P${i}`, points: i }));
      const pods = generatePods(players, 4);
      expect(pods).toHaveLength(2);
      expect(pods[0]).toHaveLength(4);
      expect(pods[1]).toHaveLength(4);
    });

    it('redistributes N=6 players into two pods of 3', () => {
      const players = Array.from({ length: 6 }, (_, i) => ({ registrationId: `P${i}`, points: i }));
      const pods = generatePods(players, 4);
      expect(pods).toHaveLength(2);
      expect(pods[0]).toHaveLength(3);
      expect(pods[1]).toHaveLength(3);
    });

    it('assigns a BYE to lowest score when N=5', () => {
      const players = Array.from({ length: 5 }, (_, i) => ({ registrationId: `P${i}`, points: i, hasBye: false }));
      const pods = generatePods(players, 4);
      
      // El total de mesas/grupos (pods) debe ser 2: un grupo de 4 jugadores y un grupo exento (BYE) de 1 jugador
      expect(pods).toHaveLength(2);
      
      const byePod = pods.find(p => p.length === 1);
      const activePod = pods.find(p => p.length === 4);
      
      expect(byePod).toBeDefined();
      expect(activePod).toBeDefined();
      expect(byePod?.[0].hasBye).toBe(true);
    });
  });
});

describe('Deck Validator Improvements', () => {
  describe('Plain Text parsing', () => {
    it('parses basic plain text format', () => {
      const text = `
        // Comandante
        1 Heliod, Sun-Crowned *CMDR*
        
        // Mazo Principal (Mainboard)
        1 Altar of Dementia
        4 Plains
      `;
      const result = parseTextDeck(text);
      expect(result.commanders).toHaveProperty('Heliod, Sun-Crowned');
      expect(result.mainboard).toHaveProperty('Altar of Dementia');
      expect(result.mainboard).toHaveProperty('Plains');
      expect(result.mainboard['Plains'].quantity).toBe(4);
    });
  });

  describe('Commander Color Identity Validation', () => {
    it('rejects decks containing cards outside the commander color identity', async () => {
      const textList = `
        // Commander
        1 Heliod, Sun-Crowned
        // Mainboard
        1 Lightning Bolt
      `;

      // Simulación de consulta a base de datos para Heliod (monoblanco)
      (prisma.$queryRawUnsafe as any)
        .mockResolvedValueOnce([{
          name: 'Heliod, Sun-Crowned',
          colorIdentity: JSON.stringify(['W']),
          legalities: JSON.stringify({ commander: 'legal' }),
          priceEur: 15.0
        }])
        // Simulación de consulta a base de datos para Lightning Bolt (rojo)
        .mockResolvedValueOnce([{
          name: 'Lightning Bolt',
          colorIdentity: JSON.stringify(['R']),
          legalities: JSON.stringify({ commander: 'legal' }),
          priceEur: 0.5
        }]);

      const validation = await validateDeck(textList, 'commander');
      expect(validation.isValid).toBe(false);
      expect(validation.message).toContain('fuera de la identidad del comandante');
    });

    it('calculates deck cost in EUR with static USD conversion rate fallback', async () => {
      const textList = `
        // Commander
        1 Heliod, Sun-Crowned
      `;

      // Simulación de consulta a base de datos únicamente con precio en USD
      (prisma.$queryRawUnsafe as any).mockResolvedValue([{
        name: 'Heliod, Sun-Crowned',
        colorIdentity: JSON.stringify(['W']),
        legalities: JSON.stringify({ commander: 'legal' }),
        priceEur: null,
        priceEurFoil: null,
        priceUsd: 10.0, // 10.0 USD
        priceUsdFoil: null
      }]);

      const validation = await validateDeck(textList, 'commander');
      // El coste calculado debe ser 10.0 * 0.92 = 9.20 EUR
      expect(validation.cost).toBe(9.20);
    });
  });
});
