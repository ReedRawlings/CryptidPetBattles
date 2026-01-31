import type { Pet, BattleEvent } from './index';
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

// Serialized pet for database storage (excludes runtime-only fields)
export interface SerializedPet {
  templateId: string;
  name: string;
  tier: number;
  level: number;
  experience: number;
  currentAttack: number;
  currentHealth: number;
  maxHealth: number;
  position: number;
  battlesParticipated: number;
  foodSlotId: string | null;
  foodAttackBonus: number;
  foodHealthBonus: number;
}

// Team snapshot with populated profile for matchmaking
export interface TeamSnapshotWithProfile extends Omit<DbTeamSnapshot, 'team_data'> {
  team_data: SerializedPet[];
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
  playerTeam: SerializedPet[];
  opponentTeam: SerializedPet[];
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
  teamData: SerializedPet[];
  createdAt: string;
}

// Serialization utilities types
export interface SerializationContext {
  petToSerialized: (pet: Pet) => SerializedPet;
  serializedToPet: (data: SerializedPet) => Pet;
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
