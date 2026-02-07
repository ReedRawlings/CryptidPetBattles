import { supabase } from '@/lib/supabase';
import type { Player } from '@/types';
import type { TeamSnapshotWithProfile, MatchmakingResult, UserProfile, SerializedCreature } from '@/types/multiplayer';
import { deserializeTeam } from './teamSerializer';
import { generateOpponent } from '@/game/opponent';

// MMR range for matchmaking (starts tight, expands if no matches)
const MMR_RANGES = [100, 200, 400, 800];

// Only match against opponents on the same turn
const TURN_RANGE = 0;

interface SnapshotQueryResult {
  id: string;
  run_id: string;
  player_id: string;
  turn: number;
  team_data: unknown;
  team_power: number;
  mmr_at_snapshot: number;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    mmr: number;
  } | null;
}

/**
 * Find a real opponent based on MMR and turn progression.
 * Returns null if no suitable opponent is found.
 */
async function findRealOpponent(
  playerId: string,
  playerMmr: number,
  currentTurn: number
): Promise<TeamSnapshotWithProfile | null> {
  if (!supabase) return null;

  // Try progressively wider MMR ranges
  for (const mmrRange of MMR_RANGES) {
    const { data, error } = await supabase
      .from('team_snapshots')
      .select(`
        *,
        profiles:player_id (
          id,
          username,
          display_name,
          mmr
        )
      `)
      .neq('player_id', playerId)
      .gte('mmr_at_snapshot', playerMmr - mmrRange)
      .lte('mmr_at_snapshot', playerMmr + mmrRange)
      .gte('turn', Math.max(1, currentTurn - TURN_RANGE))
      .lte('turn', currentTurn + TURN_RANGE)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error finding opponent:', error);
      return null;
    }

    const results = data as unknown as SnapshotQueryResult[] | null;

    if (results && results.length > 0) {
      // Pick a random opponent from the matches
      const randomIndex = Math.floor(Math.random() * results.length);
      const match = results[randomIndex];

      const profile = match.profiles;

      return {
        id: match.id,
        run_id: match.run_id,
        player_id: match.player_id,
        turn: match.turn,
        team_data: match.team_data as SerializedCreature[],
        team_power: match.team_power,
        mmr_at_snapshot: match.mmr_at_snapshot,
        created_at: match.created_at,
        profile: profile ? {
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name,
          mmr: profile.mmr,
        } : undefined,
      };
    }
  }

  return null;
}

/**
 * Main matchmaking function: finds a real opponent or generates AI.
 */
export async function findOpponent(
  playerId: string | null,
  playerMmr: number,
  currentTurn: number,
  _playerWins: number
): Promise<MatchmakingResult> {
  // If not authenticated or Supabase not configured, use AI
  if (!playerId || !supabase) {
    return {
      type: 'ai',
      snapshot: null,
      opponentProfile: null,
    };
  }

  // Try to find a real opponent
  const realOpponent = await findRealOpponent(playerId, playerMmr, currentTurn);

  if (realOpponent) {
    return {
      type: 'player',
      snapshot: realOpponent,
      opponentProfile: realOpponent.profile ?? null,
    };
  }

  // Fallback to AI opponent
  return {
    type: 'ai',
    snapshot: null,
    opponentProfile: null,
  };
}

/**
 * Convert a team snapshot to a Player object for battle.
 */
export function snapshotToPlayer(
  snapshot: TeamSnapshotWithProfile,
  profile: UserProfile | null
): Player {
  const team = deserializeTeam(snapshot.team_data);

  return {
    id: snapshot.player_id,
    username: profile?.displayName ?? profile?.username ?? 'Opponent',
    team,
    gold: 0, // Not relevant for opponent
    lives: 5,
    wins: 0,
    currentTurn: snapshot.turn,
    mmr: snapshot.mmr_at_snapshot,
  };
}

/**
 * Generate an AI opponent for fallback.
 */
export function generateAIOpponent(turn: number, playerWins: number): Player {
  return generateOpponent(turn, playerWins);
}

/**
 * Get a matched opponent as a Player object.
 * This is the main entry point for the game to get an opponent.
 */
export async function getOpponent(
  playerId: string | null,
  playerMmr: number,
  currentTurn: number,
  playerWins: number
): Promise<{
  player: Player;
  isRealPlayer: boolean;
  snapshotId: string | null;
  opponentPlayerId: string | null;
  opponentMmr: number;
}> {
  const result = await findOpponent(playerId, playerMmr, currentTurn, playerWins);

  if (result.type === 'player' && result.snapshot) {
    const player = snapshotToPlayer(result.snapshot, result.opponentProfile);
    return {
      player,
      isRealPlayer: true,
      snapshotId: result.snapshot.id,
      opponentPlayerId: result.snapshot.player_id,
      opponentMmr: result.snapshot.mmr_at_snapshot,
    };
  }

  // AI fallback
  const aiOpponent = generateAIOpponent(currentTurn, playerWins);
  return {
    player: aiOpponent,
    isRealPlayer: false,
    snapshotId: null,
    opponentPlayerId: null,
    opponentMmr: aiOpponent.mmr,
  };
}
