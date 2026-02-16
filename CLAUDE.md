# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Battle Pets Arena is an auto-battler web game built with React 19 + TypeScript + Vite. Players build teams of creatures, combine duplicates to star them up, and battle AI or LLM-controlled opponents. Win 10 battles to win, lose 5 lives to lose.

## Development Commands

```bash
npm run dev          # Vite dev server with hot reload
npm run build        # TypeScript compile + Vite production build
npm run preview      # Preview production build locally
npm run mcp          # Run MCP server (npx tsx src/mcp/server.ts)
npm run tournament   # Run LLM tournament (npx tsx src/tournament/runner.ts)
```

No test framework is configured. Use `npx tsc --noEmit` for type-checking.

## Path Alias

`@` resolves to `src/` (configured in vite.config.ts and tsconfig.json).

## Architecture

### Headless Game Engine (Multi-Consumer)

The core game logic is a pure-function engine in `src/game/engine.ts`: `(GameState, Action) → EngineResult`. Four consumers share this single engine:

1. **React UI** — `src/game/GameContext.tsx` wraps the engine in Context + useReducer
2. **REST API** — `api/game/` (Vercel serverless), uses Redis for state persistence
3. **MCP Server** — `src/mcp/server.ts` (stdio, in-memory state), exposes tools: `start_game`, `get_game_state`, `take_action`, `list_games`
4. **Tournament Runner** — `src/tournament/runner.ts` (CLI), runs multi-player LLM tournaments

### Game Logic Modules

- `src/game/engine.ts` — Action parsing and reducer. Actions: `buy`, `sell`, `roll`, `swap`, `combine`, `freeze`, `end_turn`, `end_shop`, `next_turn`
- `src/game/shop.ts` — Shop generation, creature buying/selling, team swapping, combining (XP + star-up). Creatures star up at variable XP thresholds (2 for ★1→★2, 3 for ★2→★3) with incremental stat bonuses per XP point
- `src/game/battle.ts` — Deterministic battle resolution. Initiative queue sorted by speed, targeting: taunt > random frontline > random backline. Ability trigger recursion capped at depth 3
- `src/game/buffs.ts` — Buff/debuff application, stacking, tick/expiry, stat calculation (base + buff stacks = effective). Permanent buffs persist across battles; combat buffs are temporary
- `src/game/opponent.ts` — AI opponent scaling by turn + win count, tribe synergy bias
- `src/game/stateFilter.ts` — Strips internal data for API consumers. Returns `FilteredGameState` with available actions

### Creature Data Flow

`creatures.json` (42 creatures, 3 star tiers each) → `src/data/creatures.ts` loads templates → `shop.ts:createCreatureFromTemplate()` instantiates game instances. Each creature has a tribe (Spirit/Flora/Fauna/Kami/Dessert), role (tank/brawler/support/mage/assassin), and shop tier (1-4). Abilities reference `abilities_matrix.json` for the full assignment tracker.

### Type System

`src/types/index.ts` defines everything: `CreatureTemplate` (from JSON), `Creature` (game instance with current/base stats, buffs, position), `CreatureAbility` (trigger + effects), `BuffInstance` (type, stacks, duration), `Player`, `GameState`, `BattleResult`, and all game constants.

Key trigger types: `frontline`, `backline`, `on_placement`, `on_buff`, `on_debuff`, `on_kill`, `ally_dies`, `passive`, `low_health`.

### Team Layout

5-slot flat array: indices 0-1 = frontline, 2-4 = backline. Position fields synced by `updateTeamPositions()` after swaps.

### Star-Up / Combine System

- ★1 → ★2: 2 XP (3 copies). ★2 → ★3: 3 XP (3 more copies, 6 total).
- Each XP point applies `floor((nextTierStats - currentTierStats) / threshold)` incremental stat bonus.
- Source star must be ≤ target star (★1 copies feed into ★2 creatures).
- On star-up: full next-tier stats, new ability, buffs cleared.

### Tribe Synergies

Applied at team level: Flora (+HP), Fauna (+ATK), Kami (+gold/turn), Spirit (summon on faint), Dessert (AoE on faint). Thresholds at 2/3/5 creatures of the same tribe.

## Important: LLM / Tournament Components

**Always ask the user before modifying or running anything in `src/tournament/`, `src/mcp/`, or LLM provider code.** These components make real API calls to Anthropic/OpenAI (costing money), and changes to prompts, providers, or the tournament runner can have non-obvious downstream effects on LLM behavior. Confirm intent before touching these files.

## Tournament System

`src/tournament/` — CLI-driven LLM tournament runner.

- `runner.ts` — Main loop: filter state → LLM decides → apply actions → pair for battle → log results
- `providers/claude.ts`, `providers/openai.ts` — LLM adapters (Anthropic SDK / OpenAI SDK)
- `prompt.ts` — System prompt + per-turn context for LLM players
- `pairing.ts` — Random or Swiss pairing modes
- `logger.ts` — Logs to Supabase (tournament runs, decisions, battles)
- `types.ts` — `TurnContext`, `LLMProvider`, `LLMResponse`, `TournamentPlayer`

CLI: `npm run tournament -- --players 4 --mode swiss --player "Name:claude:claude-sonnet-4-5-20250929"`

Requires `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY` env vars.

## Multiplayer / Supabase

Code is complete but database needs setup. See `NEXT_STEPS.md`.

- `src/lib/supabase.ts` — Client (needs `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)
- `src/contexts/AuthContext.tsx` — Email + Google OAuth
- `src/services/` — Game persistence, matchmaking, leaderboard
- `supabase/migrations/` — Database schema (profiles, player_stats, game_runs, team_snapshots, battles, leaderboard view)

## REST API

`api/game/` — Vercel serverless functions:
- `POST /api/game` — Create new game
- `GET /api/game/{id}` — Get filtered state
- `POST /api/game/{id}/action` — Apply action `{action, params}`

State persisted in Redis. Auth via API key (`api/_lib/auth.ts`).

## PRD

`PRD` is a historical artifact from the original v1 design (Jan 2026). The game has diverged significantly — the PRD references food items, 15 pets, 6 tiers, old ability triggers (`onBuy`/`onSell`), right-to-left combat, and no speed/buff/tribe systems. **Do not use the PRD as a source of truth for current game mechanics.** Use `src/types/index.ts`, `creatures.json`, and this file instead.

Notable PRD features not yet implemented: food/items (removed, needs redesign), versus mode (8-player lobbies), turn timers, reborn mechanic, armor/damage reduction, battle replay, Supabase Realtime channels, ranked seasons.

## Deployment

Deployed to Vercel. Frontend builds to `dist/`, API functions in `api/`.
