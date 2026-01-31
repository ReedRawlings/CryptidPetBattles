import { supabase } from '@/lib/supabase';
import type { LeaderboardEntry } from '@/types/multiplayer';

/**
 * Fetch the global leaderboard.
 */
export async function getLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .limit(limit);

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  return (data as LeaderboardEntry[]) ?? [];
}

/**
 * Get a specific player's rank.
 */
export async function getPlayerRank(playerId: string): Promise<number | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('leaderboard')
    .select('rank')
    .eq('id', playerId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching player rank:', error);
    }
    return null;
  }

  return (data as { rank: number })?.rank ?? null;
}
