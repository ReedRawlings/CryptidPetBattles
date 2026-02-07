/**
 * Headless Game Engine
 *
 * Pure-function game engine extracted from GameContext.tsx.
 * No React, no HTTP, no Supabase — just (state, action) → newState.
 * Used by the REST API, MCP server, and the React UI.
 */

import { GameState, Creature, GAME_CONSTANTS } from '../types';
import {
  generateShop,
  rollShop,
  buyCreature,
  sellCreature,
  swapCreatures,
  combineCreatures,
  toggleFreeze,
} from './shop';
import { resolveBattle } from './battle';
import { generateOpponent } from './opponent';

// ============================================================
// Action Types
// ============================================================

export type EngineAction =
  | { type: 'BUY_CREATURE'; shopIndex: number; teamIndex: number }
  | { type: 'SELL_CREATURE'; teamIndex: number }
  | { type: 'ROLL_SHOP' }
  | { type: 'SWAP_CREATURES'; indexA: number; indexB: number }
  | { type: 'COMBINE_CREATURES'; sourceIndex: number; targetIndex: number }
  | { type: 'TOGGLE_FREEZE'; shopIndex: number }
  | { type: 'END_TURN' }
  | { type: 'NEXT_TURN' };

// String action names for API consumers
export type ActionName =
  | 'buy'
  | 'sell'
  | 'roll'
  | 'swap'
  | 'combine'
  | 'freeze'
  | 'end_turn'
  | 'next_turn';

// ============================================================
// Action Result
// ============================================================

export interface EngineResult {
  success: boolean;
  state: GameState;
  error?: string;
}

// ============================================================
// Initial State
// ============================================================

export function createInitialGameState(): GameState {
  return {
    phase: 'shop',
    player: {
      id: `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username: 'Player',
      team: [null, null, null, null, null],
      gold: GAME_CONSTANTS.STARTING_GOLD,
      lives: GAME_CONSTANTS.STARTING_LIVES,
      wins: 0,
      currentTurn: 1,
      mmr: 1000,
    },
    shop: generateShop(1),
    currentOpponent: null,
    lastBattleResult: null,
    gameMode: 'arena',
  };
}

// ============================================================
// Parse API action name to EngineAction
// ============================================================

export function parseAction(
  name: ActionName,
  params: Record<string, number | undefined>
): EngineAction | { error: string } {
  switch (name) {
    case 'buy': {
      const shopIndex = params.shopIndex;
      const teamIndex = params.teamIndex;
      if (shopIndex === undefined || teamIndex === undefined) {
        return { error: 'buy requires shopIndex and teamIndex' };
      }
      return { type: 'BUY_CREATURE', shopIndex, teamIndex };
    }
    case 'sell': {
      const teamIndex = params.teamIndex;
      if (teamIndex === undefined) {
        return { error: 'sell requires teamIndex' };
      }
      return { type: 'SELL_CREATURE', teamIndex };
    }
    case 'roll':
      return { type: 'ROLL_SHOP' };
    case 'swap': {
      const indexA = params.indexA;
      const indexB = params.indexB;
      if (indexA === undefined || indexB === undefined) {
        return { error: 'swap requires indexA and indexB' };
      }
      return { type: 'SWAP_CREATURES', indexA, indexB };
    }
    case 'combine': {
      const sourceIndex = params.sourceIndex;
      const targetIndex = params.targetIndex;
      if (sourceIndex === undefined || targetIndex === undefined) {
        return { error: 'combine requires sourceIndex and targetIndex' };
      }
      return { type: 'COMBINE_CREATURES', sourceIndex, targetIndex };
    }
    case 'freeze': {
      const shopIndex = params.shopIndex;
      if (shopIndex === undefined) {
        return { error: 'freeze requires shopIndex' };
      }
      return { type: 'TOGGLE_FREEZE', shopIndex };
    }
    case 'end_turn':
      return { type: 'END_TURN' };
    case 'next_turn':
      return { type: 'NEXT_TURN' };
    default:
      return { error: `Unknown action: ${name}` };
  }
}

// ============================================================
// Engine Reducer (pure function)
// ============================================================

export function applyAction(state: GameState, action: EngineAction): EngineResult {
  switch (action.type) {
    case 'BUY_CREATURE': {
      if (state.phase !== 'shop') {
        return { success: false, state, error: 'Can only buy during shop phase' };
      }
      if (state.player.gold < GAME_CONSTANTS.CREATURE_BUY_COST) {
        return { success: false, state, error: 'Not enough gold' };
      }
      if (action.teamIndex < 0 || action.teamIndex >= GAME_CONSTANTS.MAX_TEAM_SIZE) {
        return { success: false, state, error: `teamIndex must be 0-${GAME_CONSTANTS.MAX_TEAM_SIZE - 1}` };
      }

      const result = buyCreature(
        state.shop,
        action.shopIndex,
        state.player.team,
        action.teamIndex
      );

      if (!result.success) {
        return { success: false, state, error: 'Cannot buy: slot occupied or invalid shop index' };
      }

      return {
        success: true,
        state: {
          ...state,
          shop: result.updatedShop,
          player: {
            ...state.player,
            team: result.updatedTeam,
            gold: state.player.gold - GAME_CONSTANTS.CREATURE_BUY_COST,
          },
        },
      };
    }

    case 'SELL_CREATURE': {
      if (state.phase !== 'shop') {
        return { success: false, state, error: 'Can only sell during shop phase' };
      }

      const result = sellCreature(state.player.team, action.teamIndex);

      if (!result.success) {
        return { success: false, state, error: 'No creature at that position' };
      }

      return {
        success: true,
        state: {
          ...state,
          player: {
            ...state.player,
            team: result.updatedTeam,
            gold: state.player.gold + result.goldGained,
          },
        },
      };
    }

    case 'ROLL_SHOP': {
      if (state.phase !== 'shop') {
        return { success: false, state, error: 'Can only roll during shop phase' };
      }
      if (state.player.gold < GAME_CONSTANTS.ROLL_COST) {
        return { success: false, state, error: 'Not enough gold to roll' };
      }

      return {
        success: true,
        state: {
          ...state,
          shop: rollShop(state.shop, state.player.currentTurn),
          player: {
            ...state.player,
            gold: state.player.gold - GAME_CONSTANTS.ROLL_COST,
          },
        },
      };
    }

    case 'SWAP_CREATURES': {
      if (state.phase !== 'shop') {
        return { success: false, state, error: 'Can only swap during shop phase' };
      }

      return {
        success: true,
        state: {
          ...state,
          player: {
            ...state.player,
            team: swapCreatures(state.player.team, action.indexA, action.indexB),
          },
        },
      };
    }

    case 'COMBINE_CREATURES': {
      if (state.phase !== 'shop') {
        return { success: false, state, error: 'Can only combine during shop phase' };
      }

      const result = combineCreatures(
        state.player.team,
        action.sourceIndex,
        action.targetIndex
      );

      if (!result.success) {
        return { success: false, state, error: 'Cannot combine: creatures must be identical and below max stars' };
      }

      return {
        success: true,
        state: {
          ...state,
          player: {
            ...state.player,
            team: result.updatedTeam,
          },
        },
      };
    }

    case 'TOGGLE_FREEZE': {
      if (state.phase !== 'shop') {
        return { success: false, state, error: 'Can only freeze during shop phase' };
      }

      return {
        success: true,
        state: {
          ...state,
          shop: toggleFreeze(state.shop, action.shopIndex),
        },
      };
    }

    case 'END_TURN': {
      if (state.phase !== 'shop') {
        return { success: false, state, error: 'Can only end turn during shop phase' };
      }

      const opponent = generateOpponent(state.player.currentTurn, state.player.wins);
      const playerCreatures = state.player.team.filter((c): c is Creature => c !== null);
      const opponentCreatures = opponent.team.filter((c): c is Creature => c !== null);

      if (playerCreatures.length === 0) {
        return { success: false, state, error: 'Cannot battle with an empty team' };
      }

      const battleResult = resolveBattle(playerCreatures, opponentCreatures);

      // Clone team to avoid mutating input state
      const updatedTeam = state.player.team.map((c) =>
        c ? { ...c, battlesParticipated: c.battlesParticipated + 1 } : null
      );

      return {
        success: true,
        state: {
          ...state,
          phase: 'result',
          currentOpponent: opponent,
          lastBattleResult: battleResult,
          player: {
            ...state.player,
            team: updatedTeam,
          },
        },
      };
    }

    case 'NEXT_TURN': {
      if (state.phase !== 'result') {
        return { success: false, state, error: 'Can only advance from result phase' };
      }

      const result = state.lastBattleResult;
      if (!result) {
        return { success: false, state, error: 'No battle result to process' };
      }

      let newLives = state.player.lives;
      let newWins = state.player.wins;

      if (result.winner === 'player') {
        newWins++;
      } else if (result.winner === 'opponent') {
        newLives -= result.damageDealt || 1;
      }

      if (newWins >= GAME_CONSTANTS.WINS_TO_WIN || newLives <= 0) {
        return {
          success: true,
          state: {
            ...state,
            phase: 'gameOver',
            player: {
              ...state.player,
              lives: newLives,
              wins: newWins,
            },
          },
        };
      }

      const newTurn = state.player.currentTurn + 1;

      // Kami gold bonus
      const kamiCount = state.player.team.filter((c) => c !== null && c.type === 'Kami').length;
      let bonusGold = 0;
      if (kamiCount >= 5) bonusGold = 3;
      else if (kamiCount >= 3) bonusGold = 2;
      else if (kamiCount >= 2) bonusGold = 1;

      return {
        success: true,
        state: {
          ...state,
          phase: 'shop',
          shop: generateShop(newTurn, state.shop),
          currentOpponent: null,
          lastBattleResult: null,
          player: {
            ...state.player,
            lives: newLives,
            wins: newWins,
            currentTurn: newTurn,
            gold: GAME_CONSTANTS.GOLD_PER_TURN + bonusGold,
          },
        },
      };
    }

    default:
      return { success: false, state, error: 'Unknown action' };
  }
}

// ============================================================
// Convenience: run a named action with params
// ============================================================

export function runAction(
  state: GameState,
  actionName: ActionName,
  params: Record<string, number | undefined> = {}
): EngineResult {
  const parsed = parseAction(actionName, params);
  if ('error' in parsed) {
    return { success: false, state, error: parsed.error };
  }
  return applyAction(state, parsed);
}
