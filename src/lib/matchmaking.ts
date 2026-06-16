// Función de matchmaking

export interface PlayerScore {
  registrationId: string;
  points: number;
  hasBye?: boolean;
}

/** Emparejamientos suizos: se agrupan a los jugadores según puntuaciones similares, evitando que se repitan los enfrentamientos mediante el uso del retroceso */
export function generateSwissPairings(
  players: PlayerScore[],
  history: Record<string, string[]> = {}
): Array<PlayerScore[]> {
  // Se ordenan a los jugadores por puntuación descendente
  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

  const pairings: Array<PlayerScore[]> = [];

  // Se comprueba si hay un número impar de jugadores, en cuyo caso el jugador con la puntuación más baja que no haya tenido un bye obtiene un bye
  let byePlayer: PlayerScore | null = null;
  if (sortedPlayers.length % 2 !== 0) {
    let byeIndex = sortedPlayers.length - 1;
    for (let i = sortedPlayers.length - 1; i >= 0; i--) {
      if (!sortedPlayers[i].hasBye) {
        byeIndex = i;
        break;
      }
    }
    [byePlayer] = sortedPlayers.splice(byeIndex, 1);
    if (byePlayer) {
      byePlayer.hasBye = true;
    }
  }

  // Solucionador del retroceso
  function findPairings(
    plist: PlayerScore[],
    allowRepeats: boolean
  ): Array<PlayerScore[]> | null {
    const currentPairings: Array<PlayerScore[]> = [];
    const paired = new Set<string>();

    function solve(idx: number): boolean {
      if (idx === plist.length) return true;
      const p1 = plist[idx];
      if (paired.has(p1.registrationId)) {
        return solve(idx + 1);
      }

      // Busca todos los compañeros potenciales comenzando desde idx + 1
      const candidates: { player: PlayerScore; index: number; scoreDiff: number }[] = [];
      for (let i = idx + 1; i < plist.length; i++) {
        const p2 = plist[i];
        if (!paired.has(p2.registrationId)) {
          const hasPlayed =
            history[p1.registrationId]?.includes(p2.registrationId) ||
            history[p2.registrationId]?.includes(p1.registrationId);

          if (!hasPlayed || allowRepeats) {
            candidates.push({
              player: p2,
              index: i,
              scoreDiff: Math.abs(p1.points - p2.points) + (hasPlayed ? 1000 : 0)
            });
          }
        }
      }

      // Ordena los candidatos según su penalización (se priorizan puntuaciones cercanas y ausencia de repeticiones)
      candidates.sort((a, b) => a.scoreDiff - b.scoreDiff);

      for (const cand of candidates) {
        const p2 = cand.player;

        currentPairings.push([p1, p2]);
        paired.add(p1.registrationId);
        paired.add(p2.registrationId);

        if (solve(idx + 1)) return true;

        // Vuelta atrás (backtracking)
        currentPairings.pop();
        paired.delete(p1.registrationId);
        paired.delete(p2.registrationId);
      }

      return false;
    }

    if (solve(0)) return currentPairings;
    return null;
  }

  // Intento 1: Restricción estricta de no repetición de enfrentamientos
  let result = findPairings(sortedPlayers, false);
  if (!result) {
    // Intento 2: Flexibilización de la regla, permitiendo repeticiones (la heurística intentará minimizarlas mediante una penalización de 1000)
    result = findPairings(sortedPlayers, true) || [];
  }

  // Si se asignó un descanso (bye), se añade al jugador como una mesa de un solo integrante
  if (byePlayer) {
    result.push([byePlayer]);
  }

  return result;
}

/** Emparejamiento aleatorio: desordena los jugadores y realiza los emparejamientos */
export function generateRandomPairings(
  players: PlayerScore[],
  history: Record<string, string[]> = {}
): Array<PlayerScore[]> {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  return generateSwissPairings(shuffled, history);
}

/** Generación de mesas de Commander: agrupa a los jugadores en mesas de 4 integrantes (o de 3 si es necesario) */
export function generatePods(players: PlayerScore[], podSize: number = 4): Array<PlayerScore[]> {
  // Ordena a los jugadores por puntuación descendente
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.points === a.points) {
      return Math.random() - 0.5; // Desempate aleatorio simple
    }
    return b.points - a.points;
  });

  const N = sortedPlayers.length;
  if (N === 0) return [];

  // Si el tamaño de la mesa no es 4, realiza una partición simple por fragmentos
  if (podSize !== 4) {
    const pods: Array<PlayerScore[]> = [];
    for (let i = 0; i < N; i += podSize) {
      pods.push(sortedPlayers.slice(i, i + podSize));
    }
    return pods;
  }

  // Determina el número de mesas de 4 (x) y mesas de 3 (y)
  let x = 0;
  let y = 0;
  let byePlayer: PlayerScore | null = null;

  if (N % 4 === 0) {
    x = N / 4;
    y = 0;
  } else if (N % 4 === 3) {
    x = Math.floor(N / 4);
    y = 1;
  } else if (N % 4 === 2 && N >= 6) {
    x = Math.floor((N - 6) / 4);
    y = 2;
  } else if (N % 4 === 1 && N >= 9) {
    x = Math.floor((N - 9) / 4);
    y = 3;
  } else {
    // Para N = 1, 2, 5 (o cualquier residuo impar donde las mesas de 3 y 4 no puedan encajar exactamente)
    // Concede un descanso (bye) al jugador con la menor puntuación que no haya recibido ninguno previamente
    let byeIndex = sortedPlayers.length - 1;
    for (let i = sortedPlayers.length - 1; i >= 0; i--) {
      if (!sortedPlayers[i].hasBye) {
        byeIndex = i;
        break;
      }
    }
    [byePlayer] = sortedPlayers.splice(byeIndex, 1);
    byePlayer.hasBye = true;

    // Lógica recursiva con los N - 1 jugadores restantes
    const remainingPods = generatePods(sortedPlayers, 4);
    remainingPods.push([byePlayer]); // Añade la mesa con descanso (bye)
    return remainingPods;
  }

  const pods: Array<PlayerScore[]> = [];
  let ptr = 0;
  for (let i = 0; i < x; i++) {
    pods.push(sortedPlayers.slice(ptr, ptr + 4));
    ptr += 4;
  }
  for (let i = 0; i < y; i++) {
    pods.push(sortedPlayers.slice(ptr, ptr + 3));
    ptr += 3;
  }

  return pods;
}

/** Mesas aleatorias: desordena a los jugadores primero y los agrupa en mesas de 4 */
export function generateRandomPods(players: PlayerScore[], podSize: number = 4): Array<PlayerScore[]> {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  return generatePods(shuffled, podSize);
}

/** Eliminación directa: empareja a los clasificados superiores contra los clasificados inferiores (top seeds vs bottom seeds) */
export function generateSingleEliminationPairings(players: PlayerScore[]): Array<PlayerScore[]> {
  // Ordena por puntuación en orden descendente
  const sorted = [...players].sort((a, b) => b.points - a.points);

  const pairings: Array<PlayerScore[]> = [];

  // Si la cantidad es impar, el jugador con la puntuación más baja que no haya tenido descanso recibe un bye
  if (sorted.length % 2 !== 0) {
    let byeIndex = sorted.length - 1;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (!sorted[i].hasBye) {
        byeIndex = i;
        break;
      }
    }
    const [byePlayer] = sorted.splice(byeIndex, 1);
    if (byePlayer) {
      byePlayer.hasBye = true;
      pairings.push([byePlayer]);
    }
  }

  // Empareja al primero contra el último, al segundo contra el penúltimo, etcétera
  const half = Math.floor(sorted.length / 2);
  for (let i = 0; i < half; i++) {
    pairings.push([sorted[i], sorted[sorted.length - 1 - i]]);
  }

  return pairings;
}

