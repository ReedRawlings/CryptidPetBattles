import { v4 as uuidv4 } from 'uuid';
import { Player, Pet } from './types';

// Constants
export const STARTING_GOLD = 10;
export const GOLD_PER_TURN = 10;
export const STARTING_LIVES = 5;
export const MAX_TEAM_SIZE = 5;
export const ROLL_COST = 1;
export const PET_COST = 3;
export const SELL_VALUE = 1;

/**
 * Create a new player
 */
export function createPlayer(username: string): Player {
  return {
    id: uuidv4(),
    username,
    team: [null, null, null, null, null],
    gold: STARTING_GOLD,
    lives: STARTING_LIVES,
    wins: 0,
    currentTurn: 1,
    mmr: 1000,
  };
}

/**
 * Get the number of pets on a team
 */
export function getTeamSize(player: Player): number {
  return player.team.filter((pet) => pet !== null).length;
}

/**
 * Check if team has space for another pet
 */
export function hasTeamSpace(player: Player): boolean {
  return getTeamSize(player) < MAX_TEAM_SIZE;
}

/**
 * Add a pet to the team at the first available slot
 */
export function addPetToTeam(player: Player, pet: Pet): number {
  for (let i = 0; i < MAX_TEAM_SIZE; i++) {
    if (player.team[i] === null) {
      player.team[i] = pet;
      return i;
    }
  }
  return -1;
}

/**
 * Remove a pet from the team
 */
export function removePetFromTeam(player: Player, petId: string): Pet | null {
  for (let i = 0; i < MAX_TEAM_SIZE; i++) {
    if (player.team[i]?.id === petId) {
      const pet = player.team[i];
      player.team[i] = null;
      return pet;
    }
  }
  return null;
}

/**
 * Swap two pet positions
 */
export function swapPetPositions(player: Player, pos1: number, pos2: number): boolean {
  if (pos1 < 0 || pos1 >= MAX_TEAM_SIZE || pos2 < 0 || pos2 >= MAX_TEAM_SIZE) {
    return false;
  }
  const temp = player.team[pos1];
  player.team[pos1] = player.team[pos2];
  player.team[pos2] = temp;
  return true;
}

/**
 * Move a pet to a specific position
 */
export function movePetToPosition(player: Player, petId: string, targetPos: number): boolean {
  if (targetPos < 0 || targetPos >= MAX_TEAM_SIZE) {
    return false;
  }

  const currentPos = player.team.findIndex((p) => p?.id === petId);
  if (currentPos === -1) {
    return false;
  }

  return swapPetPositions(player, currentPos, targetPos);
}

/**
 * Find a pet by ID in the team
 */
export function findPetInTeam(player: Player, petId: string): Pet | null {
  return player.team.find((p) => p?.id === petId) ?? null;
}

/**
 * Find a pet by template ID (for combining)
 */
export function findPetByTemplateId(player: Player, templateId: string): Pet | null {
  return player.team.find((p) => p?.templateId === templateId) ?? null;
}

/**
 * Spend gold
 */
export function spendGold(player: Player, amount: number): boolean {
  if (player.gold < amount) {
    return false;
  }
  player.gold -= amount;
  return true;
}

/**
 * Add gold
 */
export function addGold(player: Player, amount: number): void {
  player.gold += amount;
}

/**
 * Lose a life
 */
export function loseLife(player: Player, amount: number = 1): void {
  player.lives = Math.max(0, player.lives - amount);
}

/**
 * Check if player is eliminated
 */
export function isEliminated(player: Player): boolean {
  return player.lives <= 0;
}

/**
 * Add a win
 */
export function addWin(player: Player): void {
  player.wins += 1;
}

/**
 * Check if player has won the game (arena mode)
 */
export function hasWonGame(player: Player): boolean {
  return player.wins >= 10;
}

/**
 * Start a new turn
 */
export function startNewTurn(player: Player): void {
  player.currentTurn += 1;
  player.gold = GOLD_PER_TURN;
}

/**
 * Update MMR based on battle result
 */
export function updateMmr(player: Player, won: boolean, opponentMmr: number): void {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentMmr - player.mmr) / 400));
  const actualScore = won ? 1 : 0;
  const kFactor = 32;
  player.mmr = Math.round(player.mmr + kFactor * (actualScore - expectedScore));
}

/**
 * Get active pets (non-null, sorted by position)
 */
export function getActivePets(player: Player): Pet[] {
  return player.team.filter((p): p is Pet => p !== null);
}

/**
 * Compact team (remove gaps)
 */
export function compactTeam(player: Player): void {
  const activePets = getActivePets(player);
  player.team = [
    ...activePets,
    ...Array(MAX_TEAM_SIZE - activePets.length).fill(null),
  ];
}

/**
 * Clone player state for battle
 */
export function clonePlayer(player: Player): Player {
  return {
    ...player,
    team: player.team.map((pet) => (pet ? { ...pet } : null)),
  };
}
