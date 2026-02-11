import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { GameState, Creature, Player, GAME_CONSTANTS } from '../types';
import { generateShop, rollShop, buyCreature, sellCreature, swapCreatures, combineCreatures, toggleFreeze } from './shop';
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
  currentOpponentMmr: number;
  currentOpponentSnapshotId: string | null;
  currentOpponentPlayerId: string | null;
  isRealOpponent: boolean;
}

// Action types
type GameAction =
  | { type: 'START_GAME'; mode: 'arena' | 'versus' }
  | { type: 'BUY_CREATURE'; shopIndex: number; teamIndex: number }
  | { type: 'SELL_CREATURE'; teamIndex: number }
  | { type: 'ROLL_SHOP' }
  | { type: 'SWAP_CREATURES'; indexA: number; indexB: number }
  | { type: 'COMBINE_CREATURES'; sourceIndex: number; targetIndex: number }
  | { type: 'TOGGLE_FREEZE'; shopIndex: number }
  | { type: 'END_TURN' }
  | { type: 'START_BATTLE' }
  | { type: 'COMPLETE_BATTLE' }
  | { type: 'NEXT_TURN' }
  | { type: 'RESET_GAME' }
  | { type: 'SET_MULTIPLAYER_STATE'; state: Partial<MultiplayerState> }
  | { type: 'SET_MATCHED_OPPONENT'; opponent: Player; mmr: number; snapshotId: string | null; playerId: string | null; isReal: boolean }
  | { type: 'RESTORE_GAME'; state: Partial<ExtendedGameState> }
  | { type: 'GO_TO_MENU' };

// Initial state
function createInitialState(): ExtendedGameState {
  return {
    phase: 'menu',
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

    case 'BUY_CREATURE': {
      if (state.player.gold < GAME_CONSTANTS.CREATURE_BUY_COST) {
        return state;
      }

      const result = buyCreature(
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
          gold: state.player.gold - GAME_CONSTANTS.CREATURE_BUY_COST,
        },
      };
    }

    case 'SELL_CREATURE': {
      const result = sellCreature(state.player.team, action.teamIndex);

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

    case 'SWAP_CREATURES': {
      return {
        ...state,
        player: {
          ...state.player,
          team: swapCreatures(state.player.team, action.indexA, action.indexB),
        },
      };
    }

    case 'COMBINE_CREATURES': {
      const result = combineCreatures(
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
      const opponent = state.currentOpponent ?? generateOpponent(state.player.currentTurn, state.player.wins);
      const playerCreatures = state.player.team.filter((c): c is Creature => c !== null);
      const opponentCreatures = opponent.team.filter((c): c is Creature => c !== null);

      if (playerCreatures.length === 0) {
        return state;
      }

      const battleResult = resolveBattle(playerCreatures, opponentCreatures);

      incrementBattlesParticipated(state.player.team);

      return {
        ...state,
        phase: 'battle',
        currentOpponent: opponent,
        lastBattleResult: battleResult,
      };
    }

    case 'COMPLETE_BATTLE': {
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

      // Kami gold bonus
      const kamiCount = state.player.team.filter((c) => c !== null && c.type === 'Kami').length;
      let bonusGold = 0;
      if (kamiCount >= 5) bonusGold = 3;
      else if (kamiCount >= 3) bonusGold = 2;
      else if (kamiCount >= 2) bonusGold = 1;

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
          gold: GAME_CONSTANTS.GOLD_PER_TURN + bonusGold,
        },
      };
    }

    case 'GO_TO_MENU': {
      const freshState = createInitialState();
      return {
        ...freshState,
        multiplayer: {
          ...freshState.multiplayer,
          isAuthenticated: state.multiplayer.isAuthenticated,
          isMultiplayerEnabled: state.multiplayer.isMultiplayerEnabled,
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
  startGame: (mode: 'arena' | 'versus') => void;
  buyCreature: (shopIndex: number, teamIndex: number) => void;
  sellCreature: (teamIndex: number) => void;
  rollShop: () => void;
  swapCreatures: (indexA: number, indexB: number) => void;
  combineCreatures: (sourceIndex: number, targetIndex: number) => void;
  toggleFreeze: (shopIndex: number) => void;
  endTurn: () => void;
  completeBattle: () => void;
  nextTurn: () => void;
  resetGame: () => void;
  goToMenu: () => void;
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

  // Save team snapshot when turn ends
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

  // Record battle and update stats
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
        clientHash: '',
        isAiOpponent: !state.isRealOpponent,
      });

      if (state.isRealOpponent) {
        updateMmr(user.id, state.currentOpponentMmr, result);
      }

      updatePlayerStats(user.id, result, false);
    }
  }, [state.phase, state.lastBattleResult, state.multiplayer.isMultiplayerEnabled, user]);

  // Handle game over
  useEffect(() => {
    if (
      state.phase === 'gameOver' &&
      state.multiplayer.isMultiplayerEnabled &&
      state.multiplayer.runId &&
      user
    ) {
      const gameResult = state.player.wins >= GAME_CONSTANTS.WINS_TO_WIN ? 'won' : 'lost';
      completeGameRun(state.multiplayer.runId, gameResult);
      updatePlayerStats(user.id, 'draw', true, gameResult);
    }
  }, [state.phase, state.multiplayer.isMultiplayerEnabled, state.multiplayer.runId, user]);

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

  const handleStartGame = useCallback(async (mode: 'arena' | 'versus') => {
    dispatch({ type: 'START_GAME', mode });

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

  const handleEndTurn = useCallback(async () => {
    await findAndSetOpponent();
    dispatch({ type: 'END_TURN' });
  }, [findAndSetOpponent]);

  const value: GameContextType = {
    state,
    dispatch,
    startGame: handleStartGame,
    buyCreature: (shopIndex, teamIndex) => dispatch({ type: 'BUY_CREATURE', shopIndex, teamIndex }),
    sellCreature: (teamIndex) => dispatch({ type: 'SELL_CREATURE', teamIndex }),
    rollShop: () => dispatch({ type: 'ROLL_SHOP' }),
    swapCreatures: (indexA, indexB) => dispatch({ type: 'SWAP_CREATURES', indexA, indexB }),
    combineCreatures: (sourceIndex, targetIndex) => dispatch({ type: 'COMBINE_CREATURES', sourceIndex, targetIndex }),
    toggleFreeze: (shopIndex) => dispatch({ type: 'TOGGLE_FREEZE', shopIndex }),
    endTurn: handleEndTurn,
    completeBattle: () => dispatch({ type: 'COMPLETE_BATTLE' }),
    nextTurn: () => dispatch({ type: 'NEXT_TURN' }),
    resetGame: () => dispatch({ type: 'RESET_GAME' }),
    goToMenu: () => dispatch({ type: 'GO_TO_MENU' }),
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
