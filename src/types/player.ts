import type { Pet } from './pet';

// Maximum team size
export const MAX_TEAM_SIZE = 5;

// Starting values
export const STARTING_LIVES = 5;
export const STARTING_GOLD = 10;

export interface Player {
  id: string;
  username: string;
  team: (Pet | null)[]; // Array of 5 slots, null for empty
  gold: number;
  lives: number;
  wins: number;
  currentTurn: number;
  mmr: number;
}

// Game session state
export type GamePhase = 'shop' | 'battle' | 'gameOver';

export type GameMode = 'arena' | 'versus';

export interface GameSession {
  id: string;
  playerId: string;
  mode: GameMode;
  phase: GamePhase;
  turn: number;
  player: Player;
  // For arena mode: opponent snapshot
  opponentSnapshot?: Player;
}
