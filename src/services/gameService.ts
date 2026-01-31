import { supabase } from '@/lib/supabase';
import type { Pet } from '@/types';
import type { GameRun, SerializedPet, BattleSubmission } from '@/types/multiplayer';
import { serializeTeam, calculateTeamPower } from './teamSerializer';

/**
 * Start a new game run for a player.
 */
export async function startGameRun(playerId: string, mmr: number): Promise<GameRun | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('game_runs')
    .insert({
      player_id: playerId,
      mmr_at_start: mmr,
      status: 'active' as const,
      current_turn: 1,
      lives: 5,
      wins: 0,
      gold: 10,
    })
    .select()
    .single();

  if (error) {
    console.error('Error starting game run:', error);
    return null;
  }

  return data as unknown as GameRun;
}

/**
 * Get the active game run for a player, if one exists.
 */
export async function getActiveGameRun(playerId: string): Promise<GameRun | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('game_runs')
    .select('*')
    .eq('player_id', playerId)
    .eq('status', 'active')
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching active game run:', error);
    }
    return null;
  }

  return data as unknown as GameRun;
}

/**
 * Update a game run's state.
 */
export async function updateGameRun(
  runId: string,
  updates: {
    current_turn?: number;
    lives?: number;
    wins?: number;
    gold?: number;
    team_data?: SerializedPet[];
    shop_data?: unknown;
  }
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('game_runs')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', runId);

  if (error) {
    console.error('Error updating game run:', error);
    return false;
  }

  return true;
}

/**
 * Complete a game run (won or lost).
 */
export async function completeGameRun(
  runId: string,
  result: 'won' | 'lost'
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('game_runs')
    .update({
      status: result,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', runId);

  if (error) {
    console.error('Error completing game run:', error);
    return false;
  }

  return true;
}

/**
 * Save a team snapshot at the end of a turn (for matchmaking).
 */
export async function saveTeamSnapshot(
  runId: string,
  playerId: string,
  turn: number,
  team: (Pet | null)[],
  mmr: number
): Promise<string | null> {
  if (!supabase) return null;

  const serializedTeam = serializeTeam(team);
  const teamPower = calculateTeamPower(team);

  // Upsert to handle re-saving on the same turn
  const { data, error } = await supabase
    .from('team_snapshots')
    .upsert(
      {
        run_id: runId,
        player_id: playerId,
        turn,
        team_data: serializedTeam as unknown,
        team_power: teamPower,
        mmr_at_snapshot: mmr,
      },
      {
        onConflict: 'run_id,turn',
      }
    )
    .select('id')
    .single();

  if (error) {
    console.error('Error saving team snapshot:', error);
    return null;
  }

  return (data as { id: string }).id;
}

/**
 * Record a battle result.
 */
export async function recordBattle(submission: BattleSubmission): Promise<string | null> {
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('battles')
    .insert({
      run_id: submission.runId,
      player_id: userData.user?.id,
      opponent_snapshot_id: submission.opponentSnapshotId,
      opponent_player_id: submission.opponentPlayerId,
      turn: submission.turn,
      player_team: submission.playerTeam as unknown,
      opponent_team: submission.opponentTeam as unknown,
      result: submission.result,
      damage_dealt: submission.damageDealt,
      battle_events: submission.battleEvents as unknown,
      client_hash: submission.clientHash,
      is_ai_opponent: submission.isAiOpponent,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error recording battle:', error);
    return null;
  }

  return (data as { id: string }).id;
}

/**
 * Update player stats after a battle.
 */
export async function updatePlayerStats(
  playerId: string,
  battleResult: 'win' | 'loss' | 'draw',
  isGameComplete: boolean,
  gameResult?: 'won' | 'lost'
): Promise<boolean> {
  if (!supabase) return false;

  // Get current stats
  const { data: currentStats, error: fetchError } = await supabase
    .from('player_stats')
    .select('*')
    .eq('id', playerId)
    .single();

  if (fetchError) {
    console.error('Error fetching player stats:', fetchError);
    return false;
  }

  const stats = currentStats as Record<string, number> | null;

  // Calculate updated stats
  const updates: Record<string, number> = {
    total_battles: (stats?.total_battles ?? 0) + 1,
  };

  if (battleResult === 'win') {
    updates.battle_wins = (stats?.battle_wins ?? 0) + 1;
    updates.current_streak = (stats?.current_streak ?? 0) + 1;
    updates.best_streak = Math.max(
      stats?.best_streak ?? 0,
      updates.current_streak
    );
  } else if (battleResult === 'loss') {
    updates.battle_losses = (stats?.battle_losses ?? 0) + 1;
    updates.current_streak = 0;
  } else {
    updates.battle_draws = (stats?.battle_draws ?? 0) + 1;
  }

  if (isGameComplete) {
    updates.total_games = (stats?.total_games ?? 0) + 1;
    if (gameResult === 'won') {
      updates.total_wins = (stats?.total_wins ?? 0) + 1;
    } else if (gameResult === 'lost') {
      updates.total_losses = (stats?.total_losses ?? 0) + 1;
    }
  }

  const { error: updateError } = await supabase
    .from('player_stats')
    .update(updates as Record<string, unknown>)
    .eq('id', playerId);

  if (updateError) {
    console.error('Error updating player stats:', updateError);
    return false;
  }

  return true;
}

/**
 * Update MMR using the server-side function.
 */
export async function updateMmr(
  playerId: string,
  opponentMmr: number,
  result: 'win' | 'loss' | 'draw'
): Promise<number | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('update_mmr', {
    p_player_id: playerId,
    p_opponent_mmr: opponentMmr,
    p_result: result,
  });

  if (error) {
    console.error('Error updating MMR:', error);
    return null;
  }

  return data as number;
}

/**
 * Get battle history for a player.
 */
export async function getBattleHistory(
  playerId: string,
  limit: number = 20
): Promise<unknown[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('battles')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching battle history:', error);
    return [];
  }

  return data ?? [];
}
