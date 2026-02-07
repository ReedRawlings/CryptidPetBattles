/**
 * Game state persistence for the API.
 * Stores and retrieves full GameState from Supabase game_runs table.
 */

import { getSupabase } from './supabase';
import type { GameState } from '../../src/types/index';

export async function saveGameState(gameId: string, state: GameState): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('api_game_sessions')
    .upsert({
      id: gameId,
      game_state: state as unknown,
      phase: state.phase,
      turn: state.player.currentTurn,
      lives: state.player.lives,
      wins: state.player.wins,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving game state:', error);
    return false;
  }

  return true;
}

export async function loadGameState(gameId: string): Promise<GameState | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('api_game_sessions')
    .select('game_state')
    .eq('id', gameId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    console.error('Error loading game state:', error);
    return null;
  }

  return data.game_state as GameState;
}

export async function deleteGameState(gameId: string): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('api_game_sessions')
    .delete()
    .eq('id', gameId);

  if (error) {
    console.error('Error deleting game state:', error);
    return false;
  }

  return true;
}
