import { v4 as uuidv4 } from 'uuid';
import { GameState, Player, Pet, BattleResult, GameMode } from '../models/types';
import { createPlayer, startNewTurn, loseLife, addWin, isEliminated, hasWonGame, updateMmr, clonePlayer, getActivePets } from '../models/Player';
import { incrementBattlesParticipated, resetBattleStats } from '../models/Pet';
import { createShop, rollShop, buyPet, buyFood, sellPet, toggleFreeze } from './ShopSystem';
import { resolveBattle, calculateDamageTaken } from './BattleSystem';

/**
 * Game Manager - handles game state and orchestrates game flow
 */

// In-memory storage for game sessions (would be Redis/DB in production)
const gameSessions: Map<string, GameState> = new Map();
const playerSnapshots: Map<string, Player> = new Map(); // For async matchmaking

/**
 * Create a new game session
 */
export function createGame(username: string, mode: GameMode = 'arena'): GameState {
  const player = createPlayer(username);
  const shop = createShop(1);

  const gameState: GameState = {
    player,
    shop,
    phase: 'shop',
    turn: 1,
    opponentSnapshot: null,
  };

  gameSessions.set(player.id, gameState);

  return gameState;
}

/**
 * Get a game session by player ID
 */
export function getGame(playerId: string): GameState | undefined {
  return gameSessions.get(playerId);
}

/**
 * Handle shop roll action
 */
export function handleRoll(playerId: string): { success: boolean; error?: string; shop?: GameState['shop'] } {
  const game = gameSessions.get(playerId);
  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  if (game.phase !== 'shop') {
    return { success: false, error: 'Not in shop phase' };
  }

  const success = rollShop(game.player, game.shop);
  if (!success) {
    return { success: false, error: 'Not enough gold to roll' };
  }

  return { success: true, shop: game.shop };
}

/**
 * Handle buying a pet from shop
 */
export function handleBuyPet(
  playerId: string,
  shopIndex: number
): { success: boolean; error?: string; pet?: Pet; leveledUp?: boolean } {
  const game = gameSessions.get(playerId);
  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  if (game.phase !== 'shop') {
    return { success: false, error: 'Not in shop phase' };
  }

  return buyPet(game.player, game.shop, shopIndex);
}

/**
 * Handle buying food from shop
 */
export function handleBuyFood(
  playerId: string,
  shopIndex: number,
  targetPetId: string
): { success: boolean; error?: string } {
  const game = gameSessions.get(playerId);
  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  if (game.phase !== 'shop') {
    return { success: false, error: 'Not in shop phase' };
  }

  return buyFood(game.player, game.shop, shopIndex, targetPetId);
}

/**
 * Handle selling a pet
 */
export function handleSellPet(
  playerId: string,
  petId: string
): { success: boolean; error?: string; gold?: number } {
  const game = gameSessions.get(playerId);
  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  if (game.phase !== 'shop') {
    return { success: false, error: 'Not in shop phase' };
  }

  return sellPet(game.player, petId);
}

/**
 * Handle freezing a shop slot
 */
export function handleFreeze(
  playerId: string,
  slotIndex: number
): { success: boolean; error?: string } {
  const game = gameSessions.get(playerId);
  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  if (game.phase !== 'shop') {
    return { success: false, error: 'Not in shop phase' };
  }

  const success = toggleFreeze(game.shop, slotIndex);
  if (!success) {
    return { success: false, error: 'Invalid slot index' };
  }

  return { success: true };
}

/**
 * Handle rearranging team
 */
export function handleArrangeTeam(
  playerId: string,
  newOrder: (string | null)[]
): { success: boolean; error?: string } {
  const game = gameSessions.get(playerId);
  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  if (game.phase !== 'shop') {
    return { success: false, error: 'Not in shop phase' };
  }

  // Validate that all pet IDs in newOrder exist in the team
  const teamPetIds = game.player.team.map((p) => p?.id ?? null);
  const validIds = new Set(teamPetIds.filter((id) => id !== null));

  for (const id of newOrder) {
    if (id !== null && !validIds.has(id)) {
      return { success: false, error: 'Invalid pet ID in new order' };
    }
  }

  // Create new team array based on order
  const newTeam: (Pet | null)[] = newOrder.map((id) => {
    if (id === null) return null;
    return game.player.team.find((p) => p?.id === id) ?? null;
  });

  // Pad with nulls if needed
  while (newTeam.length < 5) {
    newTeam.push(null);
  }

  game.player.team = newTeam;

  return { success: true };
}

/**
 * Find an opponent for matchmaking
 */
function findOpponent(player: Player): Player | null {
  // In a real implementation, this would query a matchmaking queue
  // For now, create a simple AI opponent based on the player's turn

  const aiOpponent = createPlayer('AI Opponent');
  aiOpponent.currentTurn = player.currentTurn;

  // Generate a random team appropriate for the turn
  const { getPetsUpToTier, getMaxTierForTurn } = require('../data/pets');
  const { createPet } = require('../models/Pet');

  const maxTier = getMaxTierForTurn(player.currentTurn);
  const availablePets = getPetsUpToTier(maxTier);

  // Add 1-5 random pets to the AI team
  const teamSize = Math.min(5, Math.max(1, Math.floor(player.currentTurn / 2) + 1));

  for (let i = 0; i < teamSize && i < 5; i++) {
    if (availablePets.length > 0) {
      const randomIndex = Math.floor(Math.random() * availablePets.length);
      const pet = createPet(availablePets[randomIndex]);

      // Give AI pets some random buffs based on turn
      pet.currentAttack += Math.floor(player.currentTurn / 3);
      pet.currentHealth += Math.floor(player.currentTurn / 2);
      pet.baseAttack = pet.currentAttack;
      pet.baseHealth = pet.currentHealth;
      pet.maxHealth = pet.currentHealth;

      aiOpponent.team[i] = pet;
    }
  }

  return aiOpponent;
}

/**
 * Handle ending the shop phase and starting battle
 */
export function handleEndTurn(
  playerId: string
): { success: boolean; error?: string; battleResult?: BattleResult; gameOver?: boolean; gameWon?: boolean } {
  const game = gameSessions.get(playerId);
  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  if (game.phase !== 'shop') {
    return { success: false, error: 'Not in shop phase' };
  }

  // Check if player has any pets
  const activePets = getActivePets(game.player);
  if (activePets.length === 0) {
    return { success: false, error: 'You need at least one pet to battle' };
  }

  // Increment battles participated for all pets
  for (const pet of activePets) {
    incrementBattlesParticipated(pet);
  }

  // Save player snapshot for async matchmaking
  playerSnapshots.set(playerId, clonePlayer(game.player));

  // Find an opponent
  const opponent = findOpponent(game.player);
  if (!opponent) {
    return { success: false, error: 'No opponent found' };
  }

  game.opponentSnapshot = opponent;
  game.phase = 'battle';

  // Resolve the battle
  const battleResult = resolveBattle(game.player.team, opponent.team);

  // Apply battle results
  if (battleResult.winner === 'opponent') {
    const damage = calculateDamageTaken(battleResult.opponentTeamRemaining);
    loseLife(game.player, damage);
  } else if (battleResult.winner === 'player') {
    addWin(game.player);
  }

  // Update MMR
  updateMmr(game.player, battleResult.winner === 'player', opponent.mmr);

  // Reset pet battle stats
  for (const pet of game.player.team) {
    if (pet) {
      resetBattleStats(pet);
    }
  }

  // Check for game over conditions
  const gameOver = isEliminated(game.player);
  const gameWon = hasWonGame(game.player);

  if (gameOver || gameWon) {
    // Clean up game session
    gameSessions.delete(playerId);
    playerSnapshots.delete(playerId);

    return {
      success: true,
      battleResult,
      gameOver: gameOver && !gameWon,
      gameWon,
    };
  }

  // Start next turn
  startNewTurn(game.player);
  game.shop = createShop(game.player.currentTurn);
  game.phase = 'shop';
  game.turn = game.player.currentTurn;

  return { success: true, battleResult };
}

/**
 * Get the current game state for a player
 */
export function getGameState(playerId: string): {
  success: boolean;
  error?: string;
  state?: {
    player: Player;
    shop: GameState['shop'];
    phase: GameState['phase'];
    turn: number;
  };
} {
  const game = gameSessions.get(playerId);
  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  return {
    success: true,
    state: {
      player: game.player,
      shop: game.shop,
      phase: game.phase,
      turn: game.turn,
    },
  };
}

/**
 * Get all active game sessions (for debugging)
 */
export function getAllGames(): Map<string, GameState> {
  return gameSessions;
}

/**
 * End a game session
 */
export function endGame(playerId: string): boolean {
  const deleted = gameSessions.delete(playerId);
  playerSnapshots.delete(playerId);
  return deleted;
}
