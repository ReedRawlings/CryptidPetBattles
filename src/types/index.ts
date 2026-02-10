// ============================================================
// Creature System Types
// ============================================================

// Tribes
export type Tribe = 'Spirit' | 'Flora' | 'Fauna' | 'Kami' | 'Dessert';

// Roles
export type Role = 'tank' | 'brawler' | 'support' | 'mage' | 'assassin';

// Positions
export type Position = 'frontline' | 'backline';

// ============================================================
// Buff System
// ============================================================

export type BuffType =
  | 'strengthen'
  | 'weaken'
  | 'thorns'
  | 'haste'
  | 'slow'
  | 'burn'
  | 'poison'
  | 'bleed'
  | 'taunt'
  | 'gigantify';

export type BuffCategory = 'buff' | 'debuff' | 'dot';

export interface BuffDefinition {
  name: string;
  category: BuffCategory;
  stackable: boolean;
  defaultDuration: number | null; // null = this_combat (permanent for duration of battle)
}

export interface BuffInstance {
  type: BuffType;
  stacks: number;
  remainingTurns: number | null; // null = lasts entire combat
  sourceId: string;
  permanent?: boolean; // persists across battles (e.g. placement buffs)
}

// ============================================================
// Creature Abilities
// ============================================================

export type CreatureTrigger =
  | 'frontline'
  | 'backline'
  | 'on_placement'
  | 'on_buff'
  | 'on_debuff'
  | 'on_kill'
  | 'ally_dies'
  | 'passive'
  | 'low_health';

export type EffectTarget =
  | 'self'
  | 'all_allies'
  | 'all_enemies'
  | 'random_enemy'
  | 'random_frontline_enemy'
  | 'nearest_enemy'
  | 'strongest_enemy'
  | 'lowest_hp_ally'
  | 'self_and_nearest_ally'
  | 'self_and_lowest_ally'
  | 'attacker';

export interface CreatureEffect {
  type: string; // effect type from creatures.json (strengthen, weaken, thorns, aoe, dot, taunt, slow, haste, cleanse_dot, cleanse_aoe, increase_damage, increase_health, gigantify, poison, burn, bleed)
  stacks?: number;
  value?: number;
  duration?: number | string; // number for turns, 'this_combat' for permanent
  target: EffectTarget;
  stackable?: boolean;
}

export interface CreatureAbility {
  name: string;
  id: string;
  trigger: CreatureTrigger;
  description: string;
  effects: CreatureEffect[];
  notes?: string;
}

// ============================================================
// Creature Template (from creatures.json)
// ============================================================

export interface CreatureTierData {
  tier: number;
  stars: string;
  baseStats: {
    health: number;
    attack: number;
    speed: number;
  };
  ability: CreatureAbility;
}

export interface TypePassive {
  name: string;
  tiers: {
    [threshold: string]: string; // e.g. "2": "description", "3": "description", "5": "description"
  };
}

export interface CreatureTemplate {
  id: string;
  name: string;
  type: Tribe;
  role: Role;
  shopTier: number;
  description: string;
  typePassive?: TypePassive;
  tiers: {
    '1': CreatureTierData;
    '2': CreatureTierData;
    '3': CreatureTierData;
  };
}

// ============================================================
// Creature Instance (in-game)
// ============================================================

export interface Creature {
  id: string;
  templateId: string;
  name: string;
  type: Tribe;
  role: Role;
  shopTier: number;
  star: number; // 1-3
  experience: number;
  baseAttack: number;
  baseHealth: number;
  baseSpeed: number;
  currentAttack: number;
  currentHealth: number;
  currentSpeed: number;
  maxHealth: number;
  position: Position;
  slotIndex: number; // index within the row (0-1 for frontline, 0-2 for backline)
  teamIndex: number; // absolute index in the 5-slot team array
  ability: CreatureAbility;
  buffs: BuffInstance[];
  battlesParticipated: number;
  lowHealthTriggered?: boolean;
}

// ============================================================
// Player State
// ============================================================

export interface Player {
  id: string;
  username: string;
  team: (Creature | null)[]; // 5 slots: [0-1] = frontline, [2-4] = backline
  gold: number;
  lives: number;
  wins: number;
  currentTurn: number;
  mmr: number;
}

// ============================================================
// Battle Events
// ============================================================

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
    | 'battleEnd'
    | 'round_start'
    | 'initiative'
    | 'dot_tick'
    | 'thorns_damage'
    | 'buff_applied'
    | 'debuff_applied'
    | 'buff_removed';
  source: string | null; // Creature ID
  target: string | null; // Creature ID
  value: number;
  timestamp: number;
  description?: string;
  buffType?: BuffType;
}

// ============================================================
// Battle Result
// ============================================================

export interface BattleResult {
  winner: 'player' | 'opponent' | 'draw';
  playerTeamRemaining: Creature[];
  opponentTeamRemaining: Creature[];
  events: BattleEvent[];
  damageDealt: number;
}

// ============================================================
// Shop State
// ============================================================

export interface Shop {
  creatures: (CreatureTemplate | null)[];
  frozen: boolean[];
}

// ============================================================
// Game State
// ============================================================

export interface GameState {
  phase: 'shop' | 'battle' | 'waiting' | 'result' | 'gameOver';
  player: Player;
  shop: Shop;
  currentOpponent: Player | null;
  lastBattleResult: BattleResult | null;
  gameMode: 'arena' | 'versus';
}

// ============================================================
// Tier Schedule & Constants
// ============================================================

export interface TierConfig {
  turns: [number, number];
  availableTiers: number[];
  creatureSlots: number;
}

export const TIER_SCHEDULE: TierConfig[] = [
  { turns: [1, 2], availableTiers: [1], creatureSlots: 3 },
  { turns: [3, 4], availableTiers: [1, 2], creatureSlots: 3 },
  { turns: [5, 7], availableTiers: [1, 2, 3], creatureSlots: 4 },
  { turns: [8, Infinity], availableTiers: [1, 2, 3, 4], creatureSlots: 5 },
];

export const BUFF_DEFINITIONS: Record<BuffType, BuffDefinition> = {
  strengthen: { name: 'Strengthen', category: 'buff', stackable: true, defaultDuration: null },
  weaken: { name: 'Weaken', category: 'debuff', stackable: true, defaultDuration: null },
  thorns: { name: 'Thorns', category: 'buff', stackable: true, defaultDuration: null },
  haste: { name: 'Haste', category: 'buff', stackable: true, defaultDuration: null },
  slow: { name: 'Slow', category: 'debuff', stackable: true, defaultDuration: null },
  burn: { name: 'Burn', category: 'dot', stackable: true, defaultDuration: 3 },
  poison: { name: 'Poison', category: 'dot', stackable: true, defaultDuration: 3 },
  bleed: { name: 'Bleed', category: 'dot', stackable: true, defaultDuration: 3 },
  taunt: { name: 'Taunt', category: 'buff', stackable: false, defaultDuration: null },
  gigantify: { name: 'Gigantify', category: 'buff', stackable: true, defaultDuration: null },
};

export const GAME_CONSTANTS = {
  MAX_TEAM_SIZE: 5,
  FRONTLINE_SLOTS: 2,
  BACKLINE_SLOTS: 3,
  MAX_STARS: 3,
  MAX_STAT: 999,
  STARTING_GOLD: 10,
  GOLD_PER_TURN: 10,
  ROLL_COST: 1,
  STARTING_LIVES: 5,
  WINS_TO_WIN: 10,
  CREATURE_BUY_COST: 3,
  CREATURE_SELL_VALUE: 1, // per star
  LOW_HEALTH_THRESHOLD: 0.3,
  MAX_BATTLE_ROUNDS: 50,
  // Buff per-stack values
  STRENGTHEN_PER_STACK: 2,
  WEAKEN_PER_STACK: 2,
  THORNS_PER_STACK: 2,
  HASTE_PER_STACK: 0.5,
  SLOW_PER_STACK: 0.5,
  BURN_PER_STACK: 2,
  POISON_PER_STACK: 2,
  BLEED_PER_STACK: 0.005, // 0.5% of max HP
  GIGANTIFY_HP_PER_STACK: 10,
  GIGANTIFY_ATK_PER_STACK: 10,
  // Trigger recursion limit
  MAX_TRIGGER_DEPTH: 3,
} as const;
