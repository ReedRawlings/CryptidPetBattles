import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { GameState, Pet, Player, GAME_CONSTANTS } from '../types';
import { generateShop, rollShop, buyPet, sellPet, applyFood, swapPets, combinePets, toggleFreeze } from './shop';
import { resolveBattle, incrementBattlesParticipated } from './battle';
import { generateOpponent } from './opponent';
import { useAuth } from '@/hooks/useAuth';
import {
  startGameRun,
  completeGameRun,
  saveTeamSnapshot,
  recordBattle,
  updatePlayerStats,
  updateMmr,
} from '@/services/gameService';
import { getOpponent } from '@/services/matchmakingService';
import { serializeTeam } from '@/services/teamSerializer';
import type { MultiplayerState } from '@/types/multiplayer';

// Extended game state with multiplayer
interface ExtendedGameState extends GameState {
  multiplayer: MultiplayerState;
  // Track opponent info for MMR updates
  currentOpponentMmr: number;
  currentOpponentSnapshotId: string | null;
  currentOpponentPlayerId: string | null;
  isRealOpponent: boolean;
}

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
  | { type: 'COMPLETE_BATTLE' }
  | { type: 'NEXT_TURN' }
  | { type: 'RESET_GAME' }
  // Multiplayer actions
  | { type: 'SET_MULTIPLAYER_STATE'; state: Partial<MultiplayerState> }
  | { type: 'SET_MATCHED_OPPONENT'; opponent: Player; mmr: number; snapshotId: string | null; playerId: string | null; isReal: boolean }
  | { type: 'RESTORE_GAME'; state: Partial<ExtendedGameState> };

// Initial state
function createInitialState(): ExtendedGameState {
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
    // Multiplayer state
    multiplayer: {
      isAuthenticated: false,
      isMultiplayerEnabled: false,
      runId: null,
      matchedOpponent: null,
      opponentProfile: null,
      pendingValidation: false,
    },
    currentOpponentMmr: 1000,
    currentOpponentSnapshotId: null,
    currentOpponentPlayerId: null,
    isRealOpponent: false,
  };
}

// Reducer
function gameReducer(state: ExtendedGameState, action: GameAction): ExtendedGameState {
  switch (action.type) {
    case 'START_GAME': {
      const initialState = createInitialState();
      return {
        ...initialState,
        gameMode: action.mode,
        // Preserve multiplayer authentication state
        multiplayer: {
          ...initialState.multiplayer,
          isAuthenticated: state.multiplayer.isAuthenticated,
          isMultiplayerEnabled: state.multiplayer.isMultiplayerEnabled,
        },
      };
    }

    case 'SET_MULTIPLAYER_STATE': {
      return {
        ...state,
        multiplayer: {
          ...state.multiplayer,
          ...action.state,
        },
      };
    }

    case 'SET_MATCHED_OPPONENT': {
      return {
        ...state,
        currentOpponent: action.opponent,
        currentOpponentMmr: action.mmr,
        currentOpponentSnapshotId: action.snapshotId,
        currentOpponentPlayerId: action.playerId,
        isRealOpponent: action.isReal,
      };
    }

    case 'RESTORE_GAME': {
      return {
        ...state,
        ...action.state,
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
      // Use pre-matched opponent or generate AI opponent
      const opponent = state.currentOpponent ?? generateOpponent(state.player.currentTurn, state.player.wins);
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
        phase: 'battle',
        currentOpponent: opponent,
        lastBattleResult: battleResult,
      };
    }

    case 'COMPLETE_BATTLE': {
      // Transition from battle animation to result
      return {
        ...state,
        phase: 'result',
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
        shop: generateShop(newTurn, state.shop),
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
  state: ExtendedGameState;
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
  completeBattle: () => void;
  nextTurn: () => void;
  resetGame: () => void;
  // Multiplayer actions
  findAndSetOpponent: () => Promise<void>;
  isMultiplayerReady: boolean;
}

const GameContext = createContext<GameContextType | null>(null);

// Provider
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
  const { user, isConfigured } = useAuth();

  // Track auth state for multiplayer
  useEffect(() => {
    dispatch({
      type: 'SET_MULTIPLAYER_STATE',
      state: {
        isAuthenticated: !!user,
        isMultiplayerEnabled: isConfigured && !!user,
      },
    });

    // Update player info from auth
    if (user) {
      dispatch({
        type: 'RESTORE_GAME',
        state: {
          player: {
            ...state.player,
            id: user.id,
            username: user.display_name || user.username,
            mmr: user.mmr,
          },
        },
      });
    }
  }, [user, isConfigured]);

  // Save team snapshot when turn ends (entering battle phase)
  useEffect(() => {
    if (
      state.phase === 'battle' &&
      state.multiplayer.isMultiplayerEnabled &&
      state.multiplayer.runId &&
      user
    ) {
      saveTeamSnapshot(
        state.multiplayer.runId,
        user.id,
        state.player.currentTurn,
        state.player.team,
        state.player.mmr
      );
    }
  }, [state.phase, state.multiplayer.isMultiplayerEnabled, state.multiplayer.runId, user]);

  // Record battle and update stats when battle completes
  useEffect(() => {
    if (
      state.phase === 'result' &&
      state.multiplayer.isMultiplayerEnabled &&
      state.multiplayer.runId &&
      state.lastBattleResult &&
      user
    ) {
      const result = state.lastBattleResult.winner === 'player' ? 'win'
        : state.lastBattleResult.winner === 'opponent' ? 'loss'
        : 'draw';

      // Record the battle
      recordBattle({
        runId: state.multiplayer.runId,
        turn: state.player.currentTurn,
        opponentSnapshotId: state.currentOpponentSnapshotId,
        opponentPlayerId: state.currentOpponentPlayerId,
        playerTeam: serializeTeam(state.player.team),
        opponentTeam: state.currentOpponent ? serializeTeam(state.currentOpponent.team) : [],
        result,
        damageDealt: state.lastBattleResult.damageDealt,
        battleEvents: state.lastBattleResult.events,
        clientHash: '', // TODO: Implement hash for validation
        isAiOpponent: !state.isRealOpponent,
      });

      // Update MMR if fighting a real opponent
      if (state.isRealOpponent) {
        updateMmr(user.id, state.currentOpponentMmr, result);
      }

      // Update player stats
      updatePlayerStats(user.id, result, false);
    }
  }, [state.phase, state.lastBattleResult, state.multiplayer.isMultiplayerEnabled, user]);

  // Handle game over - complete the run
  useEffect(() => {
    if (
      state.phase === 'gameOver' &&
      state.multiplayer.isMultiplayerEnabled &&
      state.multiplayer.runId &&
      user
    ) {
      const gameResult = state.player.wins >= GAME_CONSTANTS.WINS_TO_WIN ? 'won' : 'lost';
      completeGameRun(state.multiplayer.runId, gameResult);
      updatePlayerStats(user.id, 'draw', true, gameResult); // 'draw' is placeholder for battle result
    }
  }, [state.phase, state.multiplayer.isMultiplayerEnabled, state.multiplayer.runId, user]);

  // Find and set opponent before battle
  const findAndSetOpponent = useCallback(async () => {
    const playerId = state.multiplayer.isMultiplayerEnabled ? user?.id ?? null : null;

    const result = await getOpponent(
      playerId,
      state.player.mmr,
      state.player.currentTurn,
      state.player.wins
    );

    dispatch({
      type: 'SET_MATCHED_OPPONENT',
      opponent: result.player,
      mmr: result.opponentMmr,
      snapshotId: result.snapshotId,
      playerId: result.opponentPlayerId,
      isReal: result.isRealPlayer,
    });
  }, [state.multiplayer.isMultiplayerEnabled, state.player.mmr, state.player.currentTurn, state.player.wins, user]);

  // Start game with multiplayer support
  const handleStartGame = useCallback(async (mode: 'arena' | 'versus') => {
    dispatch({ type: 'START_GAME', mode });

    // Create a game run if authenticated
    if (isConfigured && user) {
      const run = await startGameRun(user.id, user.mmr);
      if (run) {
        dispatch({
          type: 'SET_MULTIPLAYER_STATE',
          state: { runId: run.id },
        });
      }
    }
  }, [isConfigured, user]);

  // End turn with opponent matching
  const handleEndTurn = useCallback(async () => {
    // Find opponent before starting battle
    await findAndSetOpponent();
    dispatch({ type: 'END_TURN' });
  }, [findAndSetOpponent]);

  const value: GameContextType = {
    state,
    dispatch,
    startGame: handleStartGame,
    buyPet: (shopIndex, teamIndex) => dispatch({ type: 'BUY_PET', shopIndex, teamIndex }),
    sellPet: (teamIndex) => dispatch({ type: 'SELL_PET', teamIndex }),
    applyFood: (foodIndex, teamIndex) => dispatch({ type: 'APPLY_FOOD', foodIndex, teamIndex }),
    rollShop: () => dispatch({ type: 'ROLL_SHOP' }),
    swapPets: (indexA, indexB) => dispatch({ type: 'SWAP_PETS', indexA, indexB }),
    combinePets: (sourceIndex, targetIndex) => dispatch({ type: 'COMBINE_PETS', sourceIndex, targetIndex }),
    toggleFreeze: (shopIndex) => dispatch({ type: 'TOGGLE_FREEZE', shopIndex }),
    endTurn: handleEndTurn,
    completeBattle: () => dispatch({ type: 'COMPLETE_BATTLE' }),
    nextTurn: () => dispatch({ type: 'NEXT_TURN' }),
    resetGame: () => dispatch({ type: 'RESET_GAME' }),
    findAndSetOpponent,
    isMultiplayerReady: state.multiplayer.isMultiplayerEnabled,
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
