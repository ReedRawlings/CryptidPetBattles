// Ability system types

// Shop Phase Triggers
export type ShopTrigger =
  | 'onBuy'
  | 'onSell'
  | 'onLevelUp'
  | 'onFoodEaten'
  | 'startOfTurn'
  | 'endOfTurn';

// Battle Phase Triggers
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
  | 'randomEnemy'
  | 'allEnemies'
  | 'allAllies'
  | 'adjacentAllies'
  | 'petBehind'
  | 'petAhead'
  | 'attacker'
  | 'randomAlly';

// Effect types
export type AbilityEffectType =
  | 'damage'
  | 'heal'
  | 'buffAttack'
  | 'buffHealth'
  | 'buffBoth'
  | 'summon'
  | 'armor'
  | 'reborn';

export interface Ability {
  id: string;
  name: string;
  trigger: AbilityTrigger;
  effectType: AbilityEffectType;
  target: AbilityTarget;
  baseValue: number;
  description: string;
  // Scaling values per level (index 0 = level 1, etc.)
  scalingValues: [number, number, number];
}

// Ability instance on a pet (with current level scaling applied)
export interface AbilityInstance {
  abilityId: string;
  trigger: AbilityTrigger;
  effectType: AbilityEffectType;
  target: AbilityTarget;
  value: number; // Current value based on pet level
}
