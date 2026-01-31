# Next Steps: Supabase Setup via MCP

## What's Been Done
- Full multiplayer implementation is complete (auth, matchmaking, persistence, leaderboard)
- All code is written and builds successfully
- Supabase MCP is authenticated and connected

## What Needs to Be Done
Use the Supabase MCP tools to set up the database. The MCP tools available are:

### 1. List/Create Project
```
list_projects
list_organizations
create_project (if needed)
```

### 2. Run the Database Migration
Use `execute_sql` or `apply_migration` to run the schema in:
`supabase/migrations/001_initial_schema.sql`

This creates:
- `profiles` table (user accounts)
- `player_stats` table (win/loss tracking)
- `game_runs` table (active games)
- `team_snapshots` table (for matchmaking)
- `battles` table (history)
- `leaderboard` view
- RLS policies for security
- `handle_new_user()` trigger for auto profile creation
- `update_mmr()` function for ELO calculation

### 3. Enable Google OAuth
In Supabase Dashboard → Authentication → Providers → Google:
- Enable Google provider
- Add Google Cloud OAuth credentials

### 4. Get Project Credentials
Use `get_project_url` and `get_publishable_keys` to get:
- Project URL → `VITE_SUPABASE_URL`
- Anon Key → `VITE_SUPABASE_ANON_KEY`

Then create `.env.local`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx
```

### 5. Test
```bash
npm run dev
```
- Sign up with email or Google
- Play a game
- Check leaderboard

## File Reference
- Migration SQL: `supabase/migrations/001_initial_schema.sql`
- Supabase client: `src/lib/supabase.ts`
- Auth context: `src/contexts/AuthContext.tsx`
- Game services: `src/services/`
