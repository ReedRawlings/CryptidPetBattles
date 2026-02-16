#!/usr/bin/env node
/**
 * LLM Tournament Runner
 *
 * Spins up N game instances, has LLMs shop in parallel,
 * pairs them for PvP battles, and logs everything to Supabase.
 *
 * Usage: npx tsx src/tournament/runner.ts --players 4 --mode random
 */

import { Creature, BattleResult } from '../types';
import { createInitialGameState, runAction, endShopPhase, applyPvPBattleResult } from '../game/engine';
import { resolveBattle } from '../game/battle';
import { generateOpponent } from '../game/opponent';
import { filterGameState } from '../game/stateFilter';
import {
  TournamentPlayer,
  TournamentConfig,
  StandingEntry,
  TurnContext,
  LLMResponse,
  LLMProvider,
  PairingMode,
  snapshotTeam,
} from './types';
import { Pairing, pairRandom, pairSwiss } from './pairing';
import { createClaudeProvider } from './providers/claude';
import { createOpenAIProvider } from './providers/openai';
import { createTournamentRun, logDecision, logBattle, completeTournamentRun } from './logger';
import { readFileSync } from 'fs';

// ============================================================
// CLI Argument Parsing
// ============================================================

interface ParsedArgs {
  mode: PairingMode;
  maxTurns: number;
  playerDefs: { name: string; provider: string; model: string }[];
  configPath: string | null;
  legacyPlayerCount: number;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let mode: PairingMode = 'random';
  let maxTurns = 30;
  let configPath: string | null = null;
  let legacyPlayerCount = 4;
  const playerDefs: { name: string; provider: string; model: string }[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode' && args[i + 1]) {
      mode = args[i + 1] as PairingMode;
      i++;
    } else if (args[i] === '--max-turns' && args[i + 1]) {
      maxTurns = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--config' && args[i + 1]) {
      configPath = args[i + 1];
      i++;
    } else if (args[i] === '--players' && args[i + 1]) {
      legacyPlayerCount = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--player' && args[i + 1]) {
      // Format: --player "name:provider:model" e.g. --player "GPT4o:openai:gpt-4o"
      const parts = args[i + 1].split(':');
      if (parts.length >= 2) {
        playerDefs.push({
          name: parts[0],
          provider: parts[1],
          model: parts.slice(2).join(':') || '', // model may contain colons
        });
      }
      i++;
    }
  }

  return { mode, maxTurns, playerDefs, configPath, legacyPlayerCount };
}

// ============================================================
// Player Setup
// ============================================================

interface PlayerConfig {
  name: string;
  provider: string; // 'claude' | 'openai'
  model?: string;
}

function resolveProvider(cfg: PlayerConfig): LLMProvider {
  const p = cfg.provider.toLowerCase();
  if (p === 'claude' || p === 'anthropic') {
    return createClaudeProvider(cfg.name, cfg.model || undefined);
  }
  if (p === 'openai' || p === 'gpt') {
    return createOpenAIProvider(cfg.name, cfg.model || undefined);
  }
  // Default to OpenAI for unknown providers (covers model names passed as provider)
  console.warn(`Unknown provider "${cfg.provider}" for ${cfg.name}, defaulting to OpenAI`);
  return createOpenAIProvider(cfg.name, cfg.model || cfg.provider);
}

function createPlayers(parsed: ParsedArgs): { name: string; provider: LLMProvider }[] {
  // 1. Config file takes priority
  if (parsed.configPath) {
    const raw = readFileSync(parsed.configPath, 'utf-8');
    const json = JSON.parse(raw) as { players: PlayerConfig[] };
    return json.players.map((cfg) => ({
      name: cfg.name,
      provider: resolveProvider(cfg),
    }));
  }

  // 2. Inline --player flags
  if (parsed.playerDefs.length > 0) {
    return parsed.playerDefs.map((def) => ({
      name: def.name,
      provider: resolveProvider({ name: def.name, provider: def.provider, model: def.model }),
    }));
  }

  // 3. Legacy --players N (auto-assign based on available API keys)
  const count = parsed.legacyPlayerCount;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasClaude && !hasOpenAI) {
    console.error('Error: Set ANTHROPIC_API_KEY and/or OPENAI_API_KEY, or use --player flags');
    process.exit(1);
  }

  const players: { name: string; provider: LLMProvider }[] = [];
  for (let i = 0; i < count; i++) {
    if (hasClaude && hasOpenAI) {
      if (i % 2 === 0) {
        players.push({ name: `Claude-${i + 1}`, provider: createClaudeProvider(`Claude-${i + 1}`) });
      } else {
        players.push({ name: `GPT-${i + 1}`, provider: createOpenAIProvider(`GPT-${i + 1}`) });
      }
    } else if (hasClaude) {
      players.push({ name: `Claude-${i + 1}`, provider: createClaudeProvider(`Claude-${i + 1}`) });
    } else {
      players.push({ name: `GPT-${i + 1}`, provider: createOpenAIProvider(`GPT-${i + 1}`) });
    }
  }
  return players;
}

// ============================================================
// Standings
// ============================================================

function getStandings(players: TournamentPlayer[]): StandingEntry[] {
  return players.map((p) => ({
    name: p.name,
    model: p.provider.model,
    wins: p.state.player.wins,
    lives: p.state.player.lives,
    alive: p.alive,
  }));
}

// ============================================================
// Shop Phase
// ============================================================

async function runShopPhase(
  player: TournamentPlayer,
  standings: StandingEntry[],
  tournamentId: string | null
): Promise<void> {
  const turn = player.state.player.currentTurn;
  const filteredState = filterGameState(player.state, player.name);
  const context: TurnContext = {
    filteredState,
    standings,
    turnNumber: turn,
    playersRemaining: standings.filter((s) => s.alive).length,
  };

  const teamBefore = snapshotTeam(player.state.player.team);
  const shopOffered = filteredState.shop || [];
  const goldBefore = player.state.player.gold;

  let response: LLMResponse;
  try {
    response = await player.provider.makeDecision(context);
  } catch (err) {
    console.error(`  [${player.name}] LLM call failed:`, (err as Error).message);
    response = { reasoning: 'LLM call failed', actions: [] };
  }

  if (response.actions.length === 0 && !response.reasoning) {
    console.warn(`  [${player.name}] WARNING: LLM returned empty response (no reasoning, no actions)`);
  }
  console.log(`  [${player.name}] Reasoning: ${(response.reasoning || '(none)').slice(0, 120)}...`);

  // Execute actions (cap at 20 to prevent infinite loops)
  const actionLog: { action: string; params?: Record<string, number>; success: boolean; error?: string }[] = [];
  const maxActions = 20;

  for (let i = 0; i < Math.min(response.actions.length, maxActions); i++) {
    const a = response.actions[i];
    const actionName = a.action;
    // Filter out sentinel -1 values from structured output params
    const rawParams = a.params || {};
    const params: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawParams)) {
      if (typeof v === 'number' && v >= 0) params[k] = v;
    }

    // Skip end_turn / end_shop — runner controls phase transitions
    if (actionName === 'end_turn' || actionName === 'end_shop' || actionName === 'next_turn') {
      actionLog.push({ action: actionName, success: true });
      continue;
    }

    const result = runAction(player.state, actionName as any, params);
    if (result.success) {
      player.state = result.state;
      actionLog.push({ action: actionName, params, success: true });
    } else {
      actionLog.push({ action: actionName, params, success: false, error: result.error });
    }
  }

  // Lock the team (always transitions to 'waiting' so battle results can be applied)
  const lockResult = endShopPhase(player.state);
  if (lockResult.success) {
    player.state = lockResult.state;
  }

  const teamAfter = snapshotTeam(player.state.player.team);
  const goldSpent = goldBefore - player.state.player.gold;

  // Log to Supabase (fire-and-forget)
  logDecision(
    tournamentId,
    turn,
    player.name,
    player.provider.model,
    response.reasoning,
    actionLog,
    teamBefore,
    teamAfter,
    shopOffered,
    goldSpent,
    player.state.player.lives,
    player.state.player.wins
  );

  console.log(`  [${player.name}] Actions: ${actionLog.length}, Gold spent: ${goldSpent}, Team: ${teamAfter.map((c) => `${c.name} T${c.tier}`).join(', ') || 'empty'}`);
}

// ============================================================
// Battle Phase
// ============================================================

function runBattlePair(
  pairing: Pairing,
  turn: number,
  tournamentId: string | null
): void {
  const { playerA, playerB } = pairing;

  if (!playerB) {
    // Bye round — fight AI
    console.log(`  [${playerA.name}] vs AI (bye)`);
    const opponent = generateOpponent(turn, playerA.state.player.wins);
    const playerCreatures = playerA.state.player.team.filter((c): c is Creature => c !== null);
    const opponentCreatures = opponent.team.filter((c): c is Creature => c !== null);

    if (playerCreatures.length === 0) {
      // Auto-loss with empty team
      const lossResult: BattleResult = {
        winner: 'opponent',
        playerTeamRemaining: [],
        opponentTeamRemaining: opponentCreatures,
        events: [],
        damageDealt: 1,
      };
      const result = applyPvPBattleResult(playerA.state, lossResult, opponent);
      if (result.success) playerA.state = result.state;
      return;
    }

    const battleResult = resolveBattle(playerCreatures, opponentCreatures);
    const result = applyPvPBattleResult(playerA.state, battleResult, opponent);
    if (result.success) playerA.state = result.state;
    console.log(`    Result: ${battleResult.winner === 'player' ? playerA.name + ' wins' : battleResult.winner === 'opponent' ? 'AI wins' : 'Draw'}`);
    return;
  }

  // PvP battle
  console.log(`  [${playerA.name}] vs [${playerB.name}]`);
  const teamA = playerA.state.player.team.filter((c): c is Creature => c !== null);
  const teamB = playerB.state.player.team.filter((c): c is Creature => c !== null);

  const teamASnapshot = snapshotTeam(playerA.state.player.team);
  const teamBSnapshot = snapshotTeam(playerB.state.player.team);

  // Handle empty teams
  if (teamA.length === 0 && teamB.length === 0) {
    // Both empty — draw
    const drawResult: BattleResult = { winner: 'draw', playerTeamRemaining: [], opponentTeamRemaining: [], events: [], damageDealt: 0 };
    const resA = applyPvPBattleResult(playerA.state, drawResult, playerB.state.player);
    if (resA.success) playerA.state = resA.state;
    const resB = applyPvPBattleResult(playerB.state, drawResult, playerA.state.player);
    if (resB.success) playerB.state = resB.state;
    console.log(`    Result: Draw (both empty)`);
    return;
  }

  if (teamA.length === 0) {
    const lossResult: BattleResult = { winner: 'opponent', playerTeamRemaining: [], opponentTeamRemaining: teamB, events: [], damageDealt: 1 };
    const invertedResult: BattleResult = { winner: 'player', playerTeamRemaining: teamB, opponentTeamRemaining: [], events: [], damageDealt: 1 };
    const resA = applyPvPBattleResult(playerA.state, lossResult, playerB.state.player);
    if (resA.success) playerA.state = resA.state;
    const resB = applyPvPBattleResult(playerB.state, invertedResult, playerA.state.player);
    if (resB.success) playerB.state = resB.state;
    console.log(`    Result: ${playerB.name} wins (opponent had empty team)`);
    return;
  }

  if (teamB.length === 0) {
    const winResult: BattleResult = { winner: 'player', playerTeamRemaining: teamA, opponentTeamRemaining: [], events: [], damageDealt: 1 };
    const invertedResult: BattleResult = { winner: 'opponent', playerTeamRemaining: [], opponentTeamRemaining: teamA, events: [], damageDealt: 1 };
    const resA = applyPvPBattleResult(playerA.state, winResult, playerB.state.player);
    if (resA.success) playerA.state = resA.state;
    const resB = applyPvPBattleResult(playerB.state, invertedResult, playerA.state.player);
    if (resB.success) playerB.state = resB.state;
    console.log(`    Result: ${playerA.name} wins (opponent had empty team)`);
    return;
  }

  // Normal battle: A is "player", B is "opponent" in resolveBattle's terms
  const battleResult = resolveBattle(teamA, teamB);

  // For player A, result is as-is
  const resultA = applyPvPBattleResult(playerA.state, battleResult, playerB.state.player);
  if (resultA.success) playerA.state = resultA.state;

  // For player B, invert the result
  const invertedResult: BattleResult = {
    winner: battleResult.winner === 'player' ? 'opponent'
      : battleResult.winner === 'opponent' ? 'player'
      : 'draw',
    playerTeamRemaining: battleResult.opponentTeamRemaining,
    opponentTeamRemaining: battleResult.playerTeamRemaining,
    events: battleResult.events,
    damageDealt: battleResult.damageDealt,
  };
  const resultB = applyPvPBattleResult(playerB.state, invertedResult, playerA.state.player);
  if (resultB.success) playerB.state = resultB.state;

  const winnerName = battleResult.winner === 'player' ? playerA.name
    : battleResult.winner === 'opponent' ? playerB.name
    : 'Draw';
  console.log(`    Result: ${winnerName}${battleResult.winner !== 'draw' ? ' wins' : ''} (damage: ${battleResult.damageDealt})`);

  // Log to Supabase
  const logWinner = battleResult.winner === 'player' ? 'player_a' as const
    : battleResult.winner === 'opponent' ? 'player_b' as const
    : 'draw' as const;

  logBattle(
    tournamentId,
    turn,
    playerA.name,
    playerA.provider.model,
    teamASnapshot,
    playerB.name,
    playerB.provider.model,
    teamBSnapshot,
    logWinner,
    battleResult.damageDealt,
    battleResult.events
  );
}

// ============================================================
// Main Tournament Loop
// ============================================================

async function main() {
  const parsed = parseArgs();
  const { mode, maxTurns } = parsed;

  // Set up players
  const playerConfigs = createPlayers(parsed);

  console.log(`\n=== LLM Tournament ===`);
  console.log(`Players: ${playerConfigs.length} | Mode: ${mode} | Max turns: ${maxTurns}`);
  for (const p of playerConfigs) {
    console.log(`  ${p.name} (${p.provider.model})`);
  }
  console.log();

  const config: TournamentConfig = {
    players: playerConfigs,
    maxTurns,
    pairingMode: mode,
  };

  const tournamentId = await createTournamentRun(config);
  if (tournamentId) console.log(`Tournament ID: ${tournamentId}`);

  // Initialize game states
  const players: TournamentPlayer[] = playerConfigs.map((p) => ({
    name: p.name,
    provider: p.provider,
    state: createInitialGameState(),
    alive: true,
  }));

  // Override player IDs/usernames to match tournament names
  for (const p of players) {
    p.state.player.id = p.name;
    p.state.player.username = p.name;
  }

  let lastPairings: Pairing[] | undefined;

  // Tournament loop
  for (let turn = 1; turn <= maxTurns; turn++) {
    const activePlayers = players.filter((p) => p.alive);
    if (activePlayers.length <= 1) break;

    console.log(`\n--- Turn ${turn} (${activePlayers.length} players alive) ---`);

    // 1. Shop phase (parallel)
    const standings = getStandings(players);
    console.log(`\n[SHOP PHASE]`);
    await Promise.all(
      activePlayers
        .filter((p) => p.state.phase === 'shop')
        .map((p) => runShopPhase(p, standings, tournamentId))
    );

    // 2. Pairing
    console.log(`\n[BATTLE PHASE]`);
    const pairings = mode === 'swiss'
      ? pairSwiss(activePlayers, lastPairings)
      : pairRandom(activePlayers);
    lastPairings = pairings;

    // 3. Battles (sequential to keep logs readable, but battles themselves are fast)
    for (const pairing of pairings) {
      runBattlePair(pairing, turn, tournamentId);
    }

    // 4. Advance — call NEXT_TURN on each player to process result and generate next shop
    for (const p of activePlayers) {
      if (p.state.phase === 'result') {
        const result = runAction(p.state, 'next_turn');
        if (result.success) {
          p.state = result.state;
        }
      }
    }

    // 5. Eliminate players (lost all lives OR stuck with empty team for 3+ turns)
    for (const p of players) {
      if (p.alive && p.state.phase === 'gameOver' && p.state.player.lives <= 0) {
        p.alive = false;
        console.log(`\n  ** ${p.name} eliminated! **`);
      }
      // Eliminate players stuck in shop phase (empty team, couldn't battle)
      if (p.alive && p.state.phase === 'shop' && turn >= 3) {
        const hasTeam = p.state.player.team.some((c) => c !== null);
        if (!hasTeam) {
          p.alive = false;
          console.log(`\n  ** ${p.name} eliminated (failed to build a team)! **`);
        }
      }
    }

    // Print standings
    console.log(`\n  Standings:`);
    for (const s of getStandings(players)) {
      const status = s.alive ? `${s.wins}W / ${s.lives}L` : 'ELIMINATED';
      console.log(`    ${s.name} (${s.model}): ${status}`);
    }
  }

  // Final results
  const alivePlayers = players.filter((p) => p.alive);
  const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
  const finalTurn = players.reduce((max, p) => Math.max(max, p.state.player.currentTurn), 0);

  console.log(`\n=== Tournament Complete ===`);
  if (winner) {
    console.log(`Winner: ${winner.name} (${winner.provider.model}) with ${winner.state.player.wins} wins and ${winner.state.player.lives} lives remaining`);
  } else if (alivePlayers.length === 0) {
    console.log(`All players eliminated!`);
  } else {
    console.log(`Tournament ended after ${maxTurns} turns. Remaining players:`);
    for (const p of alivePlayers) {
      console.log(`  ${p.name}: ${p.state.player.wins}W / ${p.state.player.lives}L`);
    }
  }

  // Log completion
  await completeTournamentRun(
    tournamentId,
    winner?.name ?? null,
    winner?.provider.model ?? null,
    finalTurn
  );

  // Small delay to let fire-and-forget logs flush
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(`\nDone.`);
}

main().catch((err) => {
  console.error('Tournament failed:', err);
  process.exit(1);
});
