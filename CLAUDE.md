# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Battle Pets Arena is an auto battler web game built with React 19 + TypeScript + Vite. Players build teams of pets, equip them with food items, and battle AI opponents. Win 10 battles to win, or lose 5 lives to lose.

## Development Commands

```bash
npm run dev       # Start development server with hot reload
npm run build     # TypeScript compile + Vite production build
npm run preview   # Preview production build locally
```

No test framework is currently configured.

## Architecture

### State Management
`src/game/GameContext.tsx` uses React Context + useReducer pattern. The `useGame()` hook provides access to game state and action dispatchers. All state updates are immutable.

### Game Logic Modules
- `src/game/battle.ts` - Deterministic battle resolution engine with ability triggering and event logging
- `src/game/shop.ts` - Shop generation, pet buying/selling, food application, pet combining (3 identical = level up)
- `src/game/opponent.ts` - AI opponent generation with scaling difficulty per turn

### Type System
`src/types/index.ts` defines the complete type hierarchy: abilities (triggers/effects/targets), pets (templates/instances), player state, battle events, shop state, and game phases.

### Data Files
- `src/data/pets.ts` - 15 pets across 5 tiers with unique abilities, plus summoned pet templates
- `src/data/foods.ts` - 8 food items across 5 tiers with stat bonuses

### Game Flow
1. Shop phase: 10 gold/turn, buy pets (3g), roll shop (1g), apply food (3g)
2. Battle phase: Automatic combat - rightmost pet attacks leftmost enemy
3. Result: Win (+1 win), Loss (-1 life), or Draw

### Ability Trigger Types
Shop: `onBuy`, `onSell`, `onLevelUp`, `onFoodEaten`, `startOfTurn`, `endOfTurn`
Battle: `startOfBattle`, `beforeAttack`, `onAttack`, `afterAttack`, `onHurt`, `onFaint`, `onFriendFaint`, `onEnemyFaint`, `onKill`, `onSummon`, `onFriendSummoned`, `onFriendAttack`, `passive`

## Path Alias

`@` resolves to `src/` directory (configured in vite.config.ts and tsconfig.json).

## Multiplayer (In Progress)

Multiplayer code is complete but Supabase database needs setup. **See `NEXT_STEPS.md` for instructions.**

### Multiplayer Architecture
- `src/lib/supabase.ts` - Supabase client (needs `.env.local` credentials)
- `src/contexts/AuthContext.tsx` - Authentication (email + Google OAuth)
- `src/services/` - Game persistence, matchmaking, leaderboard
- `supabase/migrations/001_initial_schema.sql` - Database schema to run

### Setup Required
1. Use Supabase MCP tools to create project and run migration
2. Enable Google OAuth in Supabase dashboard
3. Create `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Deployment

Deployed to Vercel. Build output goes to `dist/`.
