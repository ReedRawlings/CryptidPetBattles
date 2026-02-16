import { GameState, Creature } from '../types';
import { FilteredGameState } from '../game/stateFilter';

// ============================================================
// LLM Provider Interface
// ============================================================

export interface LLMAction {
  action: string;
  params?: Record<string, number>;
}

export interface LLMResponse {
  reasoning: string;
  actions: LLMAction[];
}

export interface LLMProvider {
  name: string;
  model: string;
  makeDecision(context: TurnContext): Promise<LLMResponse>;
}

// ============================================================
// Tournament Player
// ============================================================

export interface TournamentPlayer {
  name: string;
  provider: LLMProvider;
  state: GameState;
  alive: boolean;
}

// ============================================================
// Tournament Config
// ============================================================

export type PairingMode = 'random' | 'swiss';

export interface TournamentConfig {
  players: { name: string; provider: LLMProvider }[];
  maxTurns: number;
  pairingMode: PairingMode;
}

// ============================================================
// Turn Context (what the LLM sees)
// ============================================================

export interface TurnContext {
  filteredState: FilteredGameState;
  standings: StandingEntry[];
  turnNumber: number;
  playersRemaining: number;
}

export interface StandingEntry {
  name: string;
  model: string;
  wins: number;
  lives: number;
  alive: boolean;
}

// ============================================================
// Team snapshot for logging
// ============================================================

export interface CreatureSnapshot {
  name: string;
  templateId: string;
  tier: number;
  attack: number;
  health: number;
  maxHealth: number;
  speed: number;
  role: string;
  type: string;
  position: string;
  ability: string;
}

export function snapshotTeam(team: (Creature | null)[]): CreatureSnapshot[] {
  return team
    .filter((c): c is Creature => c !== null)
    .map((c) => ({
      name: c.name,
      templateId: c.templateId,
      tier: c.tier,
      attack: c.currentAttack,
      health: c.currentHealth,
      maxHealth: c.maxHealth,
      speed: c.currentSpeed,
      role: c.role,
      type: c.type,
      position: c.position,
      ability: c.ability.name,
    }));
}
