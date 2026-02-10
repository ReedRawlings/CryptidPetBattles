import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TournamentConfig, CreatureSnapshot } from './types';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('[logger] Missing Supabase URL or key — logging disabled');
    return null;
  }

  client = createClient(url, key);
  return client;
}

export async function createTournamentRun(config: TournamentConfig): Promise<string | null> {
  const sb = getClient();
  if (!sb) return null;

  const { data, error } = await sb
    .from('tournament_runs')
    .insert({
      player_count: config.players.length,
      pairing_mode: config.pairingMode,
      config: {
        maxTurns: config.maxTurns,
        players: config.players.map((p) => ({ name: p.name, model: p.provider.model })),
      },
    })
    .select('id')
    .single();

  if (error) {
    console.error('[logger] Failed to create tournament run:', error.message);
    return null;
  }

  return data.id;
}

export function logDecision(
  tournamentId: string | null,
  turn: number,
  playerName: string,
  playerModel: string,
  reasoning: string | null,
  actions: { action: string; params?: Record<string, number>; success: boolean; error?: string }[],
  teamBefore: CreatureSnapshot[],
  teamAfter: CreatureSnapshot[],
  shopOffered: unknown[],
  goldSpent: number,
  lives: number,
  wins: number
): void {
  const sb = getClient();
  if (!sb || !tournamentId) return;

  sb.from('tournament_decisions')
    .insert({
      tournament_id: tournamentId,
      turn,
      player_name: playerName,
      player_model: playerModel,
      llm_reasoning: reasoning,
      actions_taken: actions,
      gold_spent: goldSpent,
      team_before: teamBefore,
      team_after: teamAfter,
      shop_offered: shopOffered,
      lives,
      wins,
    })
    .then(({ error }) => {
      if (error) console.error('[logger] Failed to log decision:', error.message);
    });
}

export function logBattle(
  tournamentId: string | null,
  turn: number,
  playerAName: string,
  playerAModel: string,
  playerATeam: CreatureSnapshot[],
  playerBName: string,
  playerBModel: string,
  playerBTeam: CreatureSnapshot[],
  winner: 'player_a' | 'player_b' | 'draw',
  damage: number,
  events: unknown[]
): void {
  const sb = getClient();
  if (!sb || !tournamentId) return;

  sb.from('tournament_battles')
    .insert({
      tournament_id: tournamentId,
      turn,
      player_a_name: playerAName,
      player_a_model: playerAModel,
      player_a_team: playerATeam,
      player_b_name: playerBName,
      player_b_model: playerBModel,
      player_b_team: playerBTeam,
      winner,
      damage_dealt: damage,
      battle_events: events.slice(0, 100), // Cap event log size
    })
    .then(({ error }) => {
      if (error) console.error('[logger] Failed to log battle:', error.message);
    });
}

export async function completeTournamentRun(
  tournamentId: string | null,
  winnerName: string | null,
  winnerModel: string | null,
  totalTurns: number
): Promise<void> {
  const sb = getClient();
  if (!sb || !tournamentId) return;

  const { error } = await sb
    .from('tournament_runs')
    .update({
      winner_name: winnerName,
      winner_model: winnerModel,
      total_turns: totalTurns,
      completed_at: new Date().toISOString(),
    })
    .eq('id', tournamentId);

  if (error) {
    console.error('[logger] Failed to complete tournament run:', error.message);
  }
}
