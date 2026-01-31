// Database types generated from Supabase schema
// These types represent the database tables and their relationships

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          mmr: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          mmr?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          mmr?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      player_stats: {
        Row: {
          id: string;
          total_games: number;
          total_wins: number;
          total_losses: number;
          total_battles: number;
          battle_wins: number;
          battle_losses: number;
          battle_draws: number;
          highest_mmr: number;
          current_streak: number;
          best_streak: number;
          updated_at: string;
        };
        Insert: {
          id: string;
          total_games?: number;
          total_wins?: number;
          total_losses?: number;
          total_battles?: number;
          battle_wins?: number;
          battle_losses?: number;
          battle_draws?: number;
          highest_mmr?: number;
          current_streak?: number;
          best_streak?: number;
          updated_at?: string;
        };
        Update: {
          total_games?: number;
          total_wins?: number;
          total_losses?: number;
          total_battles?: number;
          battle_wins?: number;
          battle_losses?: number;
          battle_draws?: number;
          highest_mmr?: number;
          current_streak?: number;
          best_streak?: number;
          updated_at?: string;
        };
      };
      game_runs: {
        Row: {
          id: string;
          player_id: string;
          status: 'active' | 'won' | 'lost' | 'abandoned';
          current_turn: number;
          lives: number;
          wins: number;
          gold: number;
          mmr_at_start: number;
          team_data: unknown;
          shop_data: unknown;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          player_id: string;
          status?: 'active' | 'won' | 'lost' | 'abandoned';
          current_turn?: number;
          lives?: number;
          wins?: number;
          gold?: number;
          mmr_at_start: number;
          team_data?: unknown;
          shop_data?: unknown;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          status?: 'active' | 'won' | 'lost' | 'abandoned';
          current_turn?: number;
          lives?: number;
          wins?: number;
          gold?: number;
          team_data?: unknown;
          shop_data?: unknown;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      team_snapshots: {
        Row: {
          id: string;
          run_id: string;
          player_id: string;
          turn: number;
          team_data: unknown;
          team_power: number;
          mmr_at_snapshot: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          player_id: string;
          turn: number;
          team_data: unknown;
          team_power: number;
          mmr_at_snapshot: number;
          created_at?: string;
        };
        Update: {
          team_data?: unknown;
          team_power?: number;
          mmr_at_snapshot?: number;
        };
      };
      battles: {
        Row: {
          id: string;
          run_id: string;
          player_id: string;
          opponent_snapshot_id: string | null;
          opponent_player_id: string | null;
          turn: number;
          player_team: unknown;
          opponent_team: unknown;
          result: 'win' | 'loss' | 'draw';
          damage_dealt: number;
          battle_events: unknown;
          client_hash: string | null;
          server_validated: boolean;
          is_ai_opponent: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          player_id: string;
          opponent_snapshot_id?: string | null;
          opponent_player_id?: string | null;
          turn: number;
          player_team: unknown;
          opponent_team: unknown;
          result: 'win' | 'loss' | 'draw';
          damage_dealt: number;
          battle_events?: unknown;
          client_hash?: string | null;
          server_validated?: boolean;
          is_ai_opponent?: boolean;
          created_at?: string;
        };
        Update: {
          server_validated?: boolean;
        };
      };
    };
    Views: {
      leaderboard: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          mmr: number;
          total_games: number;
          total_wins: number;
          battle_wins: number;
          battle_losses: number;
          rank: number;
        };
      };
    };
    Functions: {
      update_mmr: {
        Args: {
          p_player_id: string;
          p_opponent_mmr: number;
          p_result: string;
        };
        Returns: number;
      };
    };
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type PlayerStats = Database['public']['Tables']['player_stats']['Row'];
export type GameRun = Database['public']['Tables']['game_runs']['Row'];
export type TeamSnapshot = Database['public']['Tables']['team_snapshots']['Row'];
export type Battle = Database['public']['Tables']['battles']['Row'];
export type LeaderboardEntry = Database['public']['Views']['leaderboard']['Row'];
