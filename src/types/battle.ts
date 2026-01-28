import type { Pet } from './pet';

// Battle event types for replay system
export type BattleEventType =
  | 'battleStart'
  | 'abilityTrigger'
  | 'attack'
  | 'damage'
  | 'heal'
  | 'faint'
  | 'summon'
  | 'buff'
  | 'battleEnd';

export interface BattleEvent {
  type: BattleEventType;
  source: string | null; // Pet ID or null for system events
  target: string | null; // Pet ID or null
  value: number;
  timestamp: number;
  description?: string;
}

// Battle result
export type BattleOutcome = 'win' | 'loss' | 'draw';

export interface BattleResult {
  outcome: BattleOutcome;
  playerTeamSurvivors: number;
  opponentTeamSurvivors: number;
  events: BattleEvent[];
  livesLost: number;
}

// Battle state during combat resolution
export interface BattleState {
  playerTeam: Pet[];
  opponentTeam: Pet[];
  events: BattleEvent[];
  currentTimestamp: number;
}

// Damage calculation
export interface DamageInfo {
  rawDamage: number;
  armorReduction: number;
  finalDamage: number;
}
