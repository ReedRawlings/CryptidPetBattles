/**
 * Core type definitions for Battle Pets Arena
 */

// Ability trigger types - when abilities activate
export type ShopTrigger =
  | 'onBuy'
  | 'onSell'
  | 'onLevelUp'
  | 'onFoodEaten'
  | 'startOfTurn'
  | 'endOfTurn';

export type BattleTrigger =
  | 'startOfBattle'
  | 'beforeAttack'
  | 'onAttack'
  | 'afterAttack'
  | 'onHurt'
  | 'onFaint'
  | 'onFriendFaint'
  | 'onEnemyFaint'
  | 'onKill'
  | 'onSummon'
  | 'onFriendSummoned'
  | 'onFriendAttack'
  | 'passive';

export type AbilityTrigger = ShopTrigger | BattleTrigger;

// Ability effect types
export type AbilityEffect =
  | 'damage'
  | 'heal'
  | 'buff_attack'
  | 'buff_health'
  | 'buff_both'
  | 'summon'
  | 'armor'
  | 'reborn'
  | 'reflect';

// Target types for abilities
export type AbilityTarget =
  | 'self'
  | 'attacker'
  | 'random_enemy'
  | 'all_enemies'
  | 'all_allies'
  | 'adjacent_allies'
  | 'pet_behind'
  | 'random_ally';

// Ability interface
export interface Ability {
  id: string;
  name: string;
  trigger: AbilityTrigger;
  effect: AbilityEffect;
  baseValue: number;
  target: AbilityTarget;
  description: string;
  // Scaling values per level
  levelValues: [number, number, number]; // Level 1, 2, 3
}

// Food item interface
export interface Food {
  id: string;
  name: string;
  tier: number;
  effect: AbilityEffect;
  value: number;
  target: 'self' | 'all_allies' | 'random_ally';
  description: string;
}

// Pet template - defines the base pet type
export interface PetTemplate {
  id: string;
  name: string;
  tier: number;
  baseAttack: number;
  baseHealth: number;
  ability: Ability;
}

// Pet instance - a specific pet owned by a player
export interface Pet {
  id: string;
  templateId: string;
  name: string;
  tier: number;
  level: number;
  experience: number;
  baseAttack: number;
  baseHealth: number;
  currentAttack: number;
  currentHealth: number;
  maxHealth: number;
  foodSlot: Food | null;
  battlesParticipated: number;
  ability: Ability;
  // Temporary battle state
  tempAttackBonus: number;
  tempHealthBonus: number;
  armor: number;
  hasReborn: boolean;
}

// Player interface
export interface Player {
  id: string;
  username: string;
  team: (Pet | null)[];
  gold: number;
  lives: number;
  wins: number;
  currentTurn: number;
  mmr: number;
}

// Battle event types
export type BattleEventType =
  | 'battle_start'
  | 'attack'
  | 'damage'
  | 'heal'
  | 'ability_trigger'
  | 'faint'
  | 'summon'
  | 'buff'
  | 'battle_end';

// Battle event interface
export interface BattleEvent {
  type: BattleEventType;
  source: string | null;
  target: string | null;
  value: number;
  timestamp: number;
  description: string;
}

// Battle result
export interface BattleResult {
  winner: 'player' | 'opponent' | 'draw';
  playerTeamRemaining: Pet[];
  opponentTeamRemaining: Pet[];
  events: BattleEvent[];
  damageDealt: number;
}

// Shop state
export interface Shop {
  pets: (PetTemplate | null)[];
  foods: (Food | null)[];
  frozen: boolean[];
}

// Game state for a player session
export interface GameState {
  player: Player;
  shop: Shop;
  phase: 'shop' | 'battle' | 'result';
  turn: number;
  opponentSnapshot: Player | null;
}

// Game mode
export type GameMode = 'arena' | 'versus';

// Match state for versus mode
export interface MatchState {
  id: string;
  mode: GameMode;
  players: Player[];
  currentTurn: number;
  phase: 'shop' | 'battle' | 'result';
  turnTimer: number;
  battlePairings: [string, string][];
}
