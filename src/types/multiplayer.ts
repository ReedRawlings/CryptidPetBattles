import type { Creature, BattleEvent } from './index';
import type { Profile, PlayerStats, TeamSnapshot as DbTeamSnapshot } from './database';

// Re-export database types for convenience
export type { Profile, PlayerStats, LeaderboardEntry } from './database';
export type { GameRun } from './database';

// Authentication state
export interface AuthState {
  user: Profile | null;
  stats: PlayerStats | null;
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null;
  loading: boolean;
  error: string | null;
}

// User for display purposes
export interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  mmr: number;
}

// Serialized creature for database storage (excludes runtime-only fields)
export interface SerializedCreature {
  templateId: string;
  name: string;
  tier: number;
  experience: number;
  currentAttack: number;
  currentHealth: number;
  currentSpeed: number;
  maxHealth: number;
  position: number; // team index 0-4
  battlesParticipated: number;
}

// Team snapshot with populated profile for matchmaking
export interface TeamSnapshotWithProfile extends Omit<DbTeamSnapshot, 'team_data'> {
  team_data: SerializedCreature[];
  profile?: UserProfile;
}

// Matchmaking result
export interface MatchmakingResult {
  type: 'player' | 'ai';
  snapshot: TeamSnapshotWithProfile | null;
  opponentProfile: UserProfile | null;
}

// Battle record for submission
export interface BattleSubmission {
  runId: string;
  turn: number;
  opponentSnapshotId: string | null;
  opponentPlayerId: string | null;
  playerTeam: SerializedCreature[];
  opponentTeam: SerializedCreature[];
  result: 'win' | 'loss' | 'draw';
  damageDealt: number;
  battleEvents: BattleEvent[];
  clientHash: string;
  isAiOpponent: boolean;
}

// Active game run with full state
export interface ActiveGameRun {
  id: string;
  status: 'active' | 'won' | 'lost' | 'abandoned';
  currentTurn: number;
  lives: number;
  wins: number;
  gold: number;
  mmrAtStart: number;
  teamData: SerializedCreature[];
  createdAt: string;
}

// Serialization utilities types
export interface SerializationContext {
  creatureToSerialized: (creature: Creature) => SerializedCreature;
  serializedToCreature: (data: SerializedCreature) => Creature;
}

// Multiplayer game state extension
export interface MultiplayerState {
  isAuthenticated: boolean;
  isMultiplayerEnabled: boolean;
  runId: string | null;
  matchedOpponent: TeamSnapshotWithProfile | null;
  opponentProfile: UserProfile | null;
  pendingValidation: boolean;
}
