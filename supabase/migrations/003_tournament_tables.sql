-- Tournament tables for LLM playtesting

-- One row per tournament
CREATE TABLE public.tournament_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_count INTEGER NOT NULL,
  pairing_mode TEXT NOT NULL,
  total_turns INTEGER,
  winner_name TEXT,
  winner_model TEXT,
  config JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- One row per battle per round
CREATE TABLE public.tournament_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournament_runs(id) ON DELETE CASCADE,
  turn INTEGER NOT NULL,
  player_a_name TEXT NOT NULL,
  player_a_model TEXT NOT NULL,
  player_a_team JSONB NOT NULL,
  player_b_name TEXT NOT NULL,
  player_b_model TEXT NOT NULL,
  player_b_team JSONB NOT NULL,
  winner TEXT NOT NULL,
  damage_dealt INTEGER NOT NULL,
  battle_events JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tournament_battles_tournament ON public.tournament_battles(tournament_id, turn);

-- One row per player per shopping turn
CREATE TABLE public.tournament_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournament_runs(id) ON DELETE CASCADE,
  turn INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  player_model TEXT NOT NULL,
  llm_reasoning TEXT,
  actions_taken JSONB NOT NULL,
  gold_spent INTEGER NOT NULL,
  team_before JSONB NOT NULL,
  team_after JSONB NOT NULL,
  shop_offered JSONB NOT NULL,
  lives INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tournament_decisions_tournament ON public.tournament_decisions(tournament_id, turn);
