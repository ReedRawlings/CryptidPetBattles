-- API Game Sessions - Stores game state for the REST API
-- Run this migration in your Supabase SQL Editor

-- ============================================
-- API GAME SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_game_sessions (
  id TEXT PRIMARY KEY,
  game_state JSONB NOT NULL,
  phase TEXT NOT NULL DEFAULT 'shop',
  turn INTEGER NOT NULL DEFAULT 1,
  lives INTEGER NOT NULL DEFAULT 5,
  wins INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_api_game_sessions_updated_at
  ON public.api_game_sessions(updated_at);

-- RLS: API uses service role key, so allow all for authenticated service
ALTER TABLE public.api_game_sessions ENABLE ROW LEVEL SECURITY;

-- Allow all operations (API authenticates via API key, not Supabase auth)
CREATE POLICY "API game sessions are accessible by service"
  ON public.api_game_sessions FOR ALL USING (true) WITH CHECK (true);
