// Ability trigger types
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

// Target types for abilities
export type AbilityTarget =
  | 'self'
  | 'attacker'
  | 'randomEnemy'
  | 'allEnemies'
  | 'allAllies'
  | 'adjacentAllies'
  | 'petBehind'
  | 'frontAlly'
  | 'none';

// Ability effect types
export type AbilityEffect =
  | 'gainAttack'
  | 'gainHealth'
  | 'dealDamage'
  | 'heal'
  | 'summon'
  | 'giveArmor'
  | 'reduceIncomingDamage'
  | 'revive';

// Ability definition
export interface Ability {
  trigger: AbilityTrigger;
  effect: AbilityEffect;
  baseValue: number;
  target: AbilityTarget;
  description: string;
  scaling?: number[]; // Values per level [lvl1, lvl2, lvl3]
}

// Pet template (base definition)
export interface PetTemplate {
  id: string;
  name: string;
  tier: number; // 1-6
  baseAttack: number;
  baseHealth: number;
  ability: Ability;
  emoji?: string; // For display
}

// Pet instance (in-game)
export interface Pet {
  id: string;
  templateId: string;
  name: string;
  tier: number;
  level: number; // 1-3
  experience: number; // 0-6, 2 XP to Lvl 2, 6 XP to Lvl 3
  baseAttack: number;
  baseHealth: number;
  currentAttack: number;
  currentHealth: number;
  maxHealth: number;
  ability: Ability;
  battlesParticipated: number;
  foodSlot: Food | null;
  position: number; // 0-4, position on team
  emoji?: string;
  // Battle-specific temporary state
  tempAttackBonus?: number;
  armor?: number;
  hasRevived?: boolean;
}

// Food item
export interface Food {
  id: string;
  name: string;
  tier: number;
  effect: 'attackBoost' | 'healthBoost' | 'both';
  attackValue: number;
  healthValue: number;
}

// Player state
export interface Player {
  id: string;
  username: string;
  team: (Pet | null)[]; // 5 slots
  gold: number;
  lives: number;
  wins: number;
  currentTurn: number;
  mmr: number;
}

// Battle event for replay/animation
export interface BattleEvent {
  type:
    | 'attack'
    | 'damage'
    | 'faint'
    | 'ability'
    | 'heal'
    | 'summon'
    | 'buff'
    | 'battleStart'
    | 'battleEnd';
  source: string | null; // Pet ID
  target: string | null; // Pet ID
  value: number;
  timestamp: number;
  description?: string;
}

// Battle result
export interface BattleResult {
  winner: 'player' | 'opponent' | 'draw';
  playerTeamRemaining: Pet[];
  opponentTeamRemaining: Pet[];
  events: BattleEvent[];
  damageDealt: number; // Damage dealt to loser's lives
}

// Shop state
export interface Shop {
  pets: (PetTemplate | null)[]; // 3-5 slots based on turn
  foods: (Food | null)[]; // 1-3 slots based on turn
  frozen: boolean[];
}

// Game state
export interface GameState {
  phase: 'shop' | 'battle' | 'result' | 'gameOver';
  player: Player;
  shop: Shop;
  currentOpponent: Player | null;
  lastBattleResult: BattleResult | null;
  gameMode: 'arena' | 'versus';
}

// Tier unlock schedule
export interface TierConfig {
  turns: [number, number]; // [minTurn, maxTurn]
  availableTiers: number[];
  petSlots: number;
  foodSlots: number;
}

export const TIER_SCHEDULE: TierConfig[] = [
  { turns: [1, 2], availableTiers: [1], petSlots: 3, foodSlots: 1 },
  { turns: [3, 4], availableTiers: [1, 2], petSlots: 3, foodSlots: 2 },
  { turns: [5, 6], availableTiers: [1, 2, 3], petSlots: 4, foodSlots: 2 },
  { turns: [7, 8], availableTiers: [1, 2, 3, 4], petSlots: 4, foodSlots: 2 },
  { turns: [9, 10], availableTiers: [1, 2, 3, 4, 5], petSlots: 5, foodSlots: 3 },
  { turns: [11, Infinity], availableTiers: [1, 2, 3, 4, 5, 6], petSlots: 5, foodSlots: 3 },
];

// Game constants
export const GAME_CONSTANTS = {
  MAX_TEAM_SIZE: 5,
  MAX_STAT: 50,
  STARTING_GOLD: 10,
  GOLD_PER_TURN: 10,
  ROLL_COST: 1,
  STARTING_LIVES: 5,
  WINS_TO_WIN: 10,
  XP_TO_LEVEL_2: 2,
  XP_TO_LEVEL_3: 6,
  PET_BUY_COST: 3,
  PET_SELL_VALUE: 1,
  FOOD_COST: 3,
} as const;
