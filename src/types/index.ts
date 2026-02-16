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
  value?: number | string; // number for damage/heal amounts, 'all' for cleanse
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
    '4'?: CreatureTierData;
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
  tier: number; // 1-3 (auto-battler), 1-4 (roguelite)
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
  relic?: RelicInstance;
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
  relics?: (RelicDefinition | null)[];
  relicFrozen?: boolean[];
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
  gameMode: GameMode;
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
  { turns: [3, 4], availableTiers: [1, 2], creatureSlots: 4 },
  { turns: [5, 7], availableTiers: [1, 2, 3], creatureSlots: 5 },
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
  MAX_TIERS: 3,
  MAX_STAT: 999,
  STARTING_GOLD: 10,
  GOLD_PER_TURN: 10,
  ROLL_COST: 1,
  STARTING_LIVES: 5,
  WINS_TO_WIN: 10,
  CREATURE_BUY_COST: 3,
  CREATURE_SELL_VALUE: 1, // per tier
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

// ============================================================
// Game Mode
// ============================================================

export type GameMode = 'arena' | 'versus' | 'roguelite';

// ============================================================
// Relic System
// ============================================================

export type RelicTrigger =
  | 'on_battle_start'
  | 'on_attack'
  | 'on_kill'
  | 'on_faint'
  | 'on_battle_end'
  | 'passive';

export type RelicRarity = 'common' | 'uncommon' | 'rare';

export interface RelicEffect {
  type: string;
  trigger: RelicTrigger;
  value?: number;
  target?: EffectTarget;
  buffType?: BuffType;
  condition?: {
    tribe?: Tribe;
    position?: Position;
    fullHealth?: boolean;
  };
}

export interface RelicDefinition {
  id: string;
  name: string;
  description: string;
  rarity: RelicRarity;
  consumable: boolean;
  maxUses?: number;
  shopCost: number;
  effects: RelicEffect[];
}

export interface RelicInstance {
  definitionId: string;
  remainingUses: number | null; // null = permanent (non-consumable)
}

// ============================================================
// Roguelite Types
// ============================================================

export type NodeType = 'battle' | 'shop' | 'rest' | 'event' | 'boss';

export interface MapNode {
  id: string;
  row: number;
  column: number;
  type: NodeType;
  connections: string[]; // IDs of reachable nodes in next row
  completed: boolean;
  enemyPreview?: { count: number; maxTier: number }; // visible before selection
}

export interface ZoneMap {
  zoneId: number;
  nodes: MapNode[];
  currentNodeId: string | null;
}

export type RewardType = 'creature' | 'xp' | 'breeding_item';

export interface RewardChoice {
  type: RewardType;
  creature?: CreatureTemplate;
  xpAmount?: number;
  breedingItemId?: string;
  description: string;
}

export interface RogueliteCreature extends Creature {
  level: number;          // 0-30
  xpCurrent: number;      // XP toward next level
  xpToNextLevel: number;  // XP needed for next level
  runsRemaining: number;  // lifespan countdown
  tierCeiling: number;    // max tier this creature can reach (2-4)
  isDead: boolean;        // dead for this run (0 HP)
  bredFrom?: { parentAId: string; parentBId: string };
}

export type RoguelitePhase =
  | 'roster'
  | 'point_buy'
  | 'map'
  | 'pre_battle'
  | 'battle'
  | 'reward'
  | 'shop'
  | 'rest'
  | 'event'
  | 'run_complete'
  | 'breeding';

export interface RogueliteRunState {
  runId: string;
  zoneId: number;
  map: ZoneMap;
  team: (RogueliteCreature | null)[]; // 5 slots
  gold: number;
  relics: RelicInstance[];            // run-scoped relics (unequipped)
  breedingItemsCollected: string[];   // banked for post-run
  completedNodes: number;
  runActive: boolean;
}

export interface RogueliteMetaState {
  roster: RogueliteCreature[];       // persistent creature collection
  unlockedZones: number[];           // [1] initially
  availableCreatureIds: string[];    // templateIds unlocked for point-buy
  breedingItems: string[];           // banked breeding items
  completedRuns: number;
  totalBattlesWon: number;
}

export interface RogueliteShopOfferings {
  creatures: { template: CreatureTemplate; cost: number }[];
  relics: { definition: RelicDefinition; cost: number }[];
}

export interface RogueliteGameState {
  mode: 'roguelite';
  phase: RoguelitePhase;
  meta: RogueliteMetaState;
  currentRun: RogueliteRunState | null;
  lastBattleResult: BattleResult | null;
  rewardChoices: RewardChoice[] | null;
  selectedNodeId: string | null;
  enemyTeam: Creature[] | null;           // stored for battle animation display
  preBattleTeam: (RogueliteCreature | null)[] | null; // snapshot before battle resolution
  shopOfferings: RogueliteShopOfferings | null;
  currentEvent: { id: string; title: string; description: string; choiceCount: number } | null;
}

// ============================================================
// Roguelite Constants
// ============================================================

export const ROGUELITE_CONSTANTS = {
  POINT_BUY_BUDGET: 10,
  MAX_TIER_ROGUELITE: 4,
  LEVELS_PER_TIER: 10,
  MAX_LEVEL: 30,
  NODES_PER_RUN: 14,        // + 1 boss = 15 total
  MAX_TEAM_SIZE: 5,
  STARTER_TRIBES: ['Flora', 'Fauna', 'Kami'] as Tribe[],

  // XP per battle (base, before bonuses)
  XP_PER_BATTLE: 3,
  XP_REWARD_AMOUNT: 10,     // bonus XP from reward pick

  // Lifespan ranges by tier at creation
  LIFESPAN: {
    1: { min: 3, max: 7 },
    2: { min: 7, max: 12 },
    3: { min: 12, max: 17 },
    4: { min: 17, max: 24 },
  } as Record<number, { min: number; max: number }>,

  // Rest point values
  REST_HEAL_PERCENT: 0.5,
  REST_REVIVE_HP_PERCENT: 0.25,

  // Run gold
  GOLD_PER_BATTLE: 5,
  STARTING_RUN_GOLD: 0,
} as const;
