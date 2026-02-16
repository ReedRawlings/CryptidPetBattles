/**
 * Headless Game Engine
 *
 * Pure-function game engine extracted from GameContext.tsx.
 * No React, no HTTP, no Supabase — just (state, action) → newState.
 * Used by the REST API, MCP server, and the React UI.
 */

import { GameState, Creature, Player, BattleResult, GAME_CONSTANTS } from '../types';
import {
  generateShop,
  rollShop,
  buyCreature,
  sellCreature,
  swapCreatures,
  combineCreatures,
  toggleFreeze,
  buyRelic,
  unequipRelic,
  toggleRelicFreeze,
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
  | { type: 'BUY_RELIC'; relicIndex: number; teamIndex: number }
  | { type: 'UNEQUIP_RELIC'; teamIndex: number }
  | { type: 'TOGGLE_RELIC_FREEZE'; relicIndex: number }
  | { type: 'END_TURN' }
  | { type: 'END_SHOP' }
  | { type: 'NEXT_TURN' };

// String action names for API consumers
export type ActionName =
  | 'buy'
  | 'sell'
  | 'roll'
  | 'swap'
  | 'combine'
  | 'freeze'
  | 'buy_relic'
  | 'unequip_relic'
  | 'freeze_relic'
  | 'end_turn'
  | 'end_shop'
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
    case 'buy_relic': {
      const relicIndex = params.relicIndex;
      const teamIndex = params.teamIndex;
      if (relicIndex === undefined || teamIndex === undefined) {
        return { error: 'buy_relic requires relicIndex and teamIndex' };
      }
      return { type: 'BUY_RELIC', relicIndex, teamIndex };
    }
    case 'unequip_relic': {
      const teamIndex = params.teamIndex;
      if (teamIndex === undefined) {
        return { error: 'unequip_relic requires teamIndex' };
      }
      return { type: 'UNEQUIP_RELIC', teamIndex };
    }
    case 'freeze_relic': {
      const relicIndex = params.relicIndex;
      if (relicIndex === undefined) {
        return { error: 'freeze_relic requires relicIndex' };
      }
      return { type: 'TOGGLE_RELIC_FREEZE', relicIndex };
    }
    case 'end_turn':
      return { type: 'END_TURN' };
    case 'end_shop':
      return { type: 'END_SHOP' };
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
        return { success: false, state, error: 'Cannot combine: creatures must be identical, source tier ≤ target tier, and target below max tier' };
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

    case 'BUY_RELIC': {
      if (state.phase !== 'shop') {
        return { success: false, state, error: 'Can only buy relics during shop phase' };
      }
      const relicDef = state.shop.relics?.[action.relicIndex];
      if (!relicDef) {
        return { success: false, state, error: 'No relic at that shop index' };
      }
      if (state.player.gold < relicDef.shopCost) {
        return { success: false, state, error: 'Not enough gold' };
      }
      if (action.teamIndex < 0 || action.teamIndex >= GAME_CONSTANTS.MAX_TEAM_SIZE) {
        return { success: false, state, error: `teamIndex must be 0-${GAME_CONSTANTS.MAX_TEAM_SIZE - 1}` };
      }

      const result = buyRelic(state.shop, action.relicIndex, state.player.team, action.teamIndex);
      if (!result.success) {
        return { success: false, state, error: 'Cannot equip relic: no creature at that slot' };
      }

      return {
        success: true,
        state: {
          ...state,
          shop: result.updatedShop,
          player: {
            ...state.player,
            team: result.updatedTeam,
            gold: state.player.gold - relicDef.shopCost,
          },
        },
      };
    }

    case 'UNEQUIP_RELIC': {
      if (state.phase !== 'shop') {
        return { success: false, state, error: 'Can only unequip relics during shop phase' };
      }

      const result = unequipRelic(state.player.team, action.teamIndex);
      if (!result.success) {
        return { success: false, state, error: 'No relic to unequip at that slot' };
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

    case 'TOGGLE_RELIC_FREEZE': {
      if (state.phase !== 'shop') {
        return { success: false, state, error: 'Can only freeze during shop phase' };
      }

      return {
        success: true,
        state: {
          ...state,
          shop: toggleRelicFreeze(state.shop, action.relicIndex),
        },
      };
    }

    case 'END_SHOP': {
      return endShopPhase(state);
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
        newLives -= 1;
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
// PvP Tournament Functions
// ============================================================

/**
 * End the shop phase without starting a battle.
 * Transitions to 'waiting' phase so a tournament runner can pair opponents.
 */
export function endShopPhase(state: GameState): EngineResult {
  if (state.phase !== 'shop') {
    return { success: false, state, error: 'Can only end shop during shop phase' };
  }

  return {
    success: true,
    state: {
      ...state,
      phase: 'waiting',
    },
  };
}

/**
 * Inject a PvP battle result into a player's state.
 * Called by the tournament runner after resolveBattle() completes.
 * Transitions from 'waiting' to 'result' so NEXT_TURN works unchanged.
 */
export function applyPvPBattleResult(
  state: GameState,
  battleResult: BattleResult,
  opponent: Player
): EngineResult {
  if (state.phase !== 'waiting') {
    return { success: false, state, error: 'Can only apply PvP result during waiting phase' };
  }

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
