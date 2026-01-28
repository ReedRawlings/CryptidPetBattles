import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, Pet, BattleResult, GAME_CONSTANTS } from '../types';
import { generateShop, rollShop, buyPet, sellPet, applyFood, swapPets, combinePets, toggleFreeze } from './shop';
import { resolveBattle, incrementBattlesParticipated } from './battle';
import { generateOpponent } from './opponent';

// Action types
type GameAction =
  | { type: 'START_GAME'; mode: 'arena' | 'versus' }
  | { type: 'BUY_PET'; shopIndex: number; teamIndex: number }
  | { type: 'SELL_PET'; teamIndex: number }
  | { type: 'APPLY_FOOD'; foodIndex: number; teamIndex: number }
  | { type: 'ROLL_SHOP' }
  | { type: 'SWAP_PETS'; indexA: number; indexB: number }
  | { type: 'COMBINE_PETS'; sourceIndex: number; targetIndex: number }
  | { type: 'TOGGLE_FREEZE'; shopIndex: number }
  | { type: 'END_TURN' }
  | { type: 'START_BATTLE' }
  | { type: 'BATTLE_COMPLETE'; result: BattleResult }
  | { type: 'NEXT_TURN' }
  | { type: 'RESET_GAME' };

// Initial state
function createInitialState(): GameState {
  return {
    phase: 'shop',
    player: {
      id: 'player-1',
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

// Reducer
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const initialState = createInitialState();
      return {
        ...initialState,
        gameMode: action.mode,
      };
    }

    case 'BUY_PET': {
      if (state.player.gold < GAME_CONSTANTS.PET_BUY_COST) {
        return state;
      }

      const result = buyPet(
        state.shop,
        action.shopIndex,
        state.player.team,
        action.teamIndex
      );

      if (!result.success) {
        return state;
      }

      return {
        ...state,
        shop: result.updatedShop,
        player: {
          ...state.player,
          team: result.updatedTeam,
          gold: state.player.gold - GAME_CONSTANTS.PET_BUY_COST,
        },
      };
    }

    case 'SELL_PET': {
      const result = sellPet(state.player.team, action.teamIndex);

      if (!result.success) {
        return state;
      }

      return {
        ...state,
        player: {
          ...state.player,
          team: result.updatedTeam,
          gold: state.player.gold + result.goldGained,
        },
      };
    }

    case 'APPLY_FOOD': {
      if (state.player.gold < GAME_CONSTANTS.FOOD_COST) {
        return state;
      }

      const result = applyFood(
        state.shop,
        action.foodIndex,
        state.player.team,
        action.teamIndex
      );

      if (!result.success) {
        return state;
      }

      return {
        ...state,
        shop: result.updatedShop,
        player: {
          ...state.player,
          team: result.updatedTeam,
          gold: state.player.gold - GAME_CONSTANTS.FOOD_COST,
        },
      };
    }

    case 'ROLL_SHOP': {
      if (state.player.gold < GAME_CONSTANTS.ROLL_COST) {
        return state;
      }

      return {
        ...state,
        shop: rollShop(state.shop, state.player.currentTurn),
        player: {
          ...state.player,
          gold: state.player.gold - GAME_CONSTANTS.ROLL_COST,
        },
      };
    }

    case 'SWAP_PETS': {
      return {
        ...state,
        player: {
          ...state.player,
          team: swapPets(state.player.team, action.indexA, action.indexB),
        },
      };
    }

    case 'COMBINE_PETS': {
      const result = combinePets(
        state.player.team,
        action.sourceIndex,
        action.targetIndex
      );

      if (!result.success) {
        return state;
      }

      return {
        ...state,
        player: {
          ...state.player,
          team: result.updatedTeam,
        },
      };
    }

    case 'TOGGLE_FREEZE': {
      return {
        ...state,
        shop: toggleFreeze(state.shop, action.shopIndex),
      };
    }

    case 'END_TURN':
    case 'START_BATTLE': {
      // Generate opponent and start battle
      const opponent = generateOpponent(state.player.currentTurn, state.player.wins);
      const playerPets = state.player.team.filter((p): p is Pet => p !== null);
      const opponentPets = opponent.team.filter((p): p is Pet => p !== null);

      if (playerPets.length === 0) {
        // No pets to battle - skip battle
        return state;
      }

      const battleResult = resolveBattle(playerPets, opponentPets);

      // Increment battles participated
      incrementBattlesParticipated(state.player.team);

      return {
        ...state,
        phase: 'result',
        currentOpponent: opponent,
        lastBattleResult: battleResult,
      };
    }

    case 'NEXT_TURN': {
      const result = state.lastBattleResult;
      if (!result) return state;

      let newLives = state.player.lives;
      let newWins = state.player.wins;

      if (result.winner === 'player') {
        newWins++;
      } else if (result.winner === 'opponent') {
        newLives -= result.damageDealt || 1;
      }

      // Check win/lose conditions
      if (newWins >= GAME_CONSTANTS.WINS_TO_WIN || newLives <= 0) {
        return {
          ...state,
          phase: 'gameOver',
          player: {
            ...state.player,
            lives: newLives,
            wins: newWins,
          },
        };
      }

      const newTurn = state.player.currentTurn + 1;

      return {
        ...state,
        phase: 'shop',
        shop: generateShop(newTurn),
        currentOpponent: null,
        lastBattleResult: null,
        player: {
          ...state.player,
          lives: newLives,
          wins: newWins,
          currentTurn: newTurn,
          gold: GAME_CONSTANTS.GOLD_PER_TURN,
        },
      };
    }

    case 'RESET_GAME': {
      return createInitialState();
    }

    default:
      return state;
  }
}

// Context
interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  // Convenience actions
  startGame: (mode: 'arena' | 'versus') => void;
  buyPet: (shopIndex: number, teamIndex: number) => void;
  sellPet: (teamIndex: number) => void;
  applyFood: (foodIndex: number, teamIndex: number) => void;
  rollShop: () => void;
  swapPets: (indexA: number, indexB: number) => void;
  combinePets: (sourceIndex: number, targetIndex: number) => void;
  toggleFreeze: (shopIndex: number) => void;
  endTurn: () => void;
  nextTurn: () => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

// Provider
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);

  const value: GameContextType = {
    state,
    dispatch,
    startGame: (mode) => dispatch({ type: 'START_GAME', mode }),
    buyPet: (shopIndex, teamIndex) => dispatch({ type: 'BUY_PET', shopIndex, teamIndex }),
    sellPet: (teamIndex) => dispatch({ type: 'SELL_PET', teamIndex }),
    applyFood: (foodIndex, teamIndex) => dispatch({ type: 'APPLY_FOOD', foodIndex, teamIndex }),
    rollShop: () => dispatch({ type: 'ROLL_SHOP' }),
    swapPets: (indexA, indexB) => dispatch({ type: 'SWAP_PETS', indexA, indexB }),
    combinePets: (sourceIndex, targetIndex) => dispatch({ type: 'COMBINE_PETS', sourceIndex, targetIndex }),
    toggleFreeze: (shopIndex) => dispatch({ type: 'TOGGLE_FREEZE', shopIndex }),
    endTurn: () => dispatch({ type: 'END_TURN' }),
    nextTurn: () => dispatch({ type: 'NEXT_TURN' }),
    resetGame: () => dispatch({ type: 'RESET_GAME' }),
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// Hook
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
