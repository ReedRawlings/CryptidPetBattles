import { TournamentPlayer } from './types';

export interface Pairing {
  playerA: TournamentPlayer;
  playerB: TournamentPlayer | null; // null = bye (fight AI)
}

/**
 * Random pairing: shuffle active players, pair adjacent.
 * Odd player gets a bye (fights AI opponent).
 */
export function pairRandom(players: TournamentPlayer[]): Pairing[] {
  const active = players.filter((p) => p.alive);
  const shuffled = [...active].sort(() => Math.random() - 0.5);
  const pairs: Pairing[] = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      pairs.push({ playerA: shuffled[i], playerB: shuffled[i + 1] });
    } else {
      pairs.push({ playerA: shuffled[i], playerB: null });
    }
  }

  return pairs;
}

/**
 * Swiss pairing: sort by wins (desc), pair adjacent.
 * Avoids rematches from the last round if possible.
 */
export function pairSwiss(
  players: TournamentPlayer[],
  lastPairings?: Pairing[]
): Pairing[] {
  const active = players.filter((p) => p.alive);

  // Sort by wins descending, then lives descending for tiebreak
  const sorted = [...active].sort((a, b) => {
    const winDiff = b.state.player.wins - a.state.player.wins;
    if (winDiff !== 0) return winDiff;
    return b.state.player.lives - a.state.player.lives;
  });

  // Build recent opponent map
  const recentOpponents = new Map<string, string>();
  if (lastPairings) {
    for (const pair of lastPairings) {
      if (pair.playerB) {
        recentOpponents.set(pair.playerA.name, pair.playerB.name);
        recentOpponents.set(pair.playerB.name, pair.playerA.name);
      }
    }
  }

  const paired = new Set<string>();
  const pairs: Pairing[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (paired.has(sorted[i].name)) continue;

    const player = sorted[i];
    let bestMatch: TournamentPlayer | null = null;

    // Find best unpaired opponent (prefer someone they didn't just fight)
    for (let j = i + 1; j < sorted.length; j++) {
      if (paired.has(sorted[j].name)) continue;
      if (recentOpponents.get(player.name) === sorted[j].name) continue;
      bestMatch = sorted[j];
      break;
    }

    // Fallback: pair with anyone unpaired
    if (!bestMatch) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (paired.has(sorted[j].name)) continue;
        bestMatch = sorted[j];
        break;
      }
    }

    if (bestMatch) {
      pairs.push({ playerA: player, playerB: bestMatch });
      paired.add(player.name);
      paired.add(bestMatch.name);
    } else {
      // Odd player out — bye round
      pairs.push({ playerA: player, playerB: null });
      paired.add(player.name);
    }
  }

  return pairs;
}
