-- Battle Pets Arena - Multiplayer Database Schema
-- Run this migration in your Supabase SQL Editor

-- ============================================
-- USER PROFILES (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  mmr INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- PLAYER STATISTICS
-- ============================================
CREATE TABLE IF NOT EXISTS public.player_stats (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_battles INTEGER DEFAULT 0,
  battle_wins INTEGER DEFAULT 0,
  battle_losses INTEGER DEFAULT 0,
  battle_draws INTEGER DEFAULT 0,
  highest_mmr INTEGER DEFAULT 1000,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- Stats policies
CREATE POLICY "Public stats are viewable by everyone"
  ON public.player_stats FOR SELECT USING (true);

CREATE POLICY "Users can insert their own stats"
  ON public.player_stats FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own stats"
  ON public.player_stats FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- GAME RUNS (active game sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.game_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'abandoned')),
  current_turn INTEGER DEFAULT 1,
  lives INTEGER DEFAULT 5,
  wins INTEGER DEFAULT 0,
  gold INTEGER DEFAULT 10,
  mmr_at_start INTEGER NOT NULL,
  team_data JSONB DEFAULT '[]'::jsonb,
  shop_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.game_runs ENABLE ROW LEVEL SECURITY;

-- Game runs policies
CREATE POLICY "Users can view their own runs"
  ON public.game_runs FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "Users can insert their own runs"
  ON public.game_runs FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can update their own runs"
  ON public.game_runs FOR UPDATE USING (auth.uid() = player_id);

-- Index for finding active runs
CREATE INDEX IF NOT EXISTS idx_game_runs_active
  ON public.game_runs(player_id) WHERE status = 'active';

-- ============================================
-- TEAM SNAPSHOTS (for matchmaking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.team_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.game_runs(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turn INTEGER NOT NULL,
  team_data JSONB NOT NULL,
  team_power INTEGER NOT NULL,
  mmr_at_snapshot INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(run_id, turn)
);

-- Enable RLS
ALTER TABLE public.team_snapshots ENABLE ROW LEVEL SECURITY;

-- Team snapshots policies (readable by all for matchmaking)
CREATE POLICY "Team snapshots are readable for matchmaking"
  ON public.team_snapshots FOR SELECT USING (true);

CREATE POLICY "Users can insert their own snapshots"
  ON public.team_snapshots FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Index for matchmaking queries
CREATE INDEX IF NOT EXISTS idx_team_snapshots_matchmaking
  ON public.team_snapshots(mmr_at_snapshot, team_power, turn);

-- ============================================
-- BATTLES (history and validation)
-- ============================================
CREATE TABLE IF NOT EXISTS public.battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.game_runs(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id),
  opponent_snapshot_id UUID REFERENCES public.team_snapshots(id),
  opponent_player_id UUID REFERENCES auth.users(id),
  turn INTEGER NOT NULL,
  player_team JSONB NOT NULL,
  opponent_team JSONB NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
  damage_dealt INTEGER NOT NULL,
  battle_events JSONB,
  client_hash TEXT,
  server_validated BOOLEAN DEFAULT FALSE,
  is_ai_opponent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;

-- Battles policies
CREATE POLICY "Users can view battles they participated in"
  ON public.battles FOR SELECT
  USING (auth.uid() = player_id OR auth.uid() = opponent_player_id);

CREATE POLICY "Users can insert their own battles"
  ON public.battles FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Index for user battle history
CREATE INDEX IF NOT EXISTS idx_battles_player
  ON public.battles(player_id, created_at DESC);

-- ============================================
-- LEADERBOARD VIEW
-- ============================================
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.id,
  p.username,
  p.display_name,
  p.mmr,
  ps.total_games,
  ps.total_wins,
  ps.battle_wins,
  ps.battle_losses,
  RANK() OVER (ORDER BY p.mmr DESC) as rank
FROM public.profiles p
LEFT JOIN public.player_stats ps ON p.id = ps.id
WHERE ps.total_games >= 1
ORDER BY p.mmr DESC
LIMIT 100;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create profile and stats on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Player_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name')
  );

  INSERT INTO public.player_stats (id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update MMR after battle
CREATE OR REPLACE FUNCTION public.update_mmr(
  p_player_id UUID,
  p_opponent_mmr INTEGER,
  p_result TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_player_mmr INTEGER;
  v_expected DECIMAL;
  v_actual DECIMAL;
  v_k INTEGER := 32;
  v_change INTEGER;
BEGIN
  -- Get current MMR
  SELECT mmr INTO v_player_mmr FROM public.profiles WHERE id = p_player_id;

  -- Calculate expected score
  v_expected := 1.0 / (1.0 + POWER(10, (p_opponent_mmr - v_player_mmr) / 400.0));

  -- Actual score
  v_actual := CASE p_result
    WHEN 'win' THEN 1.0
    WHEN 'draw' THEN 0.5
    ELSE 0.0
  END;

  -- Calculate change
  v_change := ROUND(v_k * (v_actual - v_expected));

  -- Update MMR
  UPDATE public.profiles
  SET mmr = GREATEST(100, mmr + v_change),
      updated_at = NOW()
  WHERE id = p_player_id;

  -- Update highest MMR if needed
  UPDATE public.player_stats
  SET highest_mmr = GREATEST(highest_mmr, v_player_mmr + v_change),
      updated_at = NOW()
  WHERE id = p_player_id;

  RETURN v_change;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
