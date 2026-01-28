import { useState, useCallback } from 'react';
import type { GameState, BattleResult } from '../types/game';

const API_BASE = '/api';

export function useGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

  const startGame = useCallback(async (username: string) => {
    setLoading(true);
    setError(null);
    setBattleResult(null);
    try {
      const res = await fetch(`${API_BASE}/game/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.success) {
        setGameState({
          player: data.data.player,
          shop: data.data.shop,
          phase: data.data.phase,
        });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to start game');
    } finally {
      setLoading(false);
    }
  }, []);

  const buyPet = useCallback(async (shopIndex: number) => {
    if (!gameState) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/shop/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: gameState.player.id,
          type: 'pet',
          shopIndex,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGameState(prev => prev ? {
          ...prev,
          player: data.data.player,
          shop: data.data.shop,
        } : null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to buy pet');
    } finally {
      setLoading(false);
    }
  }, [gameState]);

  const buyFood = useCallback(async (shopIndex: number, targetPetId: string) => {
    if (!gameState) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/shop/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: gameState.player.id,
          type: 'food',
          shopIndex,
          targetPetId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGameState(prev => prev ? {
          ...prev,
          player: data.data.player,
          shop: data.data.shop,
        } : null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to buy food');
    } finally {
      setLoading(false);
    }
  }, [gameState]);

  const rollShop = useCallback(async () => {
    if (!gameState) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/shop/roll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: gameState.player.id }),
      });
      const data = await res.json();
      if (data.success) {
        setGameState(prev => prev ? {
          ...prev,
          shop: data.data.shop,
          player: { ...prev.player, gold: data.data.gold },
        } : null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to roll shop');
    } finally {
      setLoading(false);
    }
  }, [gameState]);

  const freezeSlot = useCallback(async (slotIndex: number) => {
    if (!gameState) return;
    try {
      const res = await fetch(`${API_BASE}/shop/freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: gameState.player.id, slotIndex }),
      });
      const data = await res.json();
      if (data.success) {
        setGameState(prev => prev ? {
          ...prev,
          shop: data.data.shop,
        } : null);
      }
    } catch (err) {
      setError('Failed to freeze slot');
    }
  }, [gameState]);

  const sellPet = useCallback(async (petId: string) => {
    if (!gameState) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/team/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: gameState.player.id, petId }),
      });
      const data = await res.json();
      if (data.success) {
        setGameState(prev => prev ? {
          ...prev,
          player: data.data.player,
        } : null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to sell pet');
    } finally {
      setLoading(false);
    }
  }, [gameState]);

  const arrangeTeam = useCallback(async (newOrder: (string | null)[]) => {
    if (!gameState) return;
    try {
      const res = await fetch(`${API_BASE}/team/arrange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: gameState.player.id, newOrder }),
      });
      const data = await res.json();
      if (data.success) {
        setGameState(prev => prev ? {
          ...prev,
          player: { ...prev.player, team: data.data.team },
        } : null);
      }
    } catch (err) {
      setError('Failed to arrange team');
    }
  }, [gameState]);

  const startBattle = useCallback(async () => {
    if (!gameState) return;
    setLoading(true);
    setBattleResult(null);
    try {
      const res = await fetch(`${API_BASE}/battle/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: gameState.player.id }),
      });
      const data = await res.json();
      if (data.success) {
        setBattleResult(data.data.battleResult);
        if (data.data.gameOver) {
          setGameState(prev => prev ? {
            ...prev,
            phase: 'gameOver',
            gameOver: true,
            gameWon: false,
          } : null);
        } else if (data.data.gameWon) {
          setGameState(prev => prev ? {
            ...prev,
            phase: 'gameOver',
            gameOver: true,
            gameWon: true,
          } : null);
        } else if (data.data.nextTurn) {
          setGameState({
            player: data.data.nextTurn.player,
            shop: data.data.nextTurn.shop,
            phase: 'shop',
          });
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to start battle');
    } finally {
      setLoading(false);
    }
  }, [gameState]);

  const clearError = useCallback(() => setError(null), []);
  const clearBattleResult = useCallback(() => setBattleResult(null), []);

  return {
    gameState,
    loading,
    error,
    battleResult,
    startGame,
    buyPet,
    buyFood,
    rollShop,
    freezeSlot,
    sellPet,
    arrangeTeam,
    startBattle,
    clearError,
    clearBattleResult,
  };
}
