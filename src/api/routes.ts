import { Router, Request, Response } from 'express';
import {
  createGame,
  getGameState,
  handleRoll,
  handleBuyPet,
  handleBuyFood,
  handleSellPet,
  handleFreeze,
  handleArrangeTeam,
  handleEndTurn,
  endGame,
} from '../game/GameManager';
import { getShopState } from '../game/ShopSystem';

const router = Router();

/**
 * POST /api/game/start
 * Start a new game session
 */
router.post('/game/start', (req: Request, res: Response) => {
  const { username } = req.body;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }

  try {
    const gameState = createGame(username);

    res.json({
      success: true,
      data: {
        playerId: gameState.player.id,
        player: {
          id: gameState.player.id,
          username: gameState.player.username,
          team: gameState.player.team,
          gold: gameState.player.gold,
          lives: gameState.player.lives,
          wins: gameState.player.wins,
          turn: gameState.player.currentTurn,
        },
        shop: getShopState(gameState.shop),
        phase: gameState.phase,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create game' });
  }
});

/**
 * GET /api/game/:playerId
 * Get current game state
 */
router.get('/game/:playerId', (req: Request, res: Response) => {
  const { playerId } = req.params;

  const result = getGameState(playerId);

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.json({
    success: true,
    data: result.state,
  });
});

/**
 * GET /api/shop
 * Get current shop contents (requires playerId query param)
 */
router.get('/shop', (req: Request, res: Response) => {
  const playerId = req.query.playerId as string;

  if (!playerId) {
    return res.status(400).json({ success: false, error: 'playerId is required' });
  }

  const result = getGameState(playerId);

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.json({
    success: true,
    data: {
      shop: result.state?.shop,
      gold: result.state?.player.gold,
    },
  });
});

/**
 * POST /api/shop/buy
 * Purchase a pet or food item from the shop
 */
router.post('/shop/buy', (req: Request, res: Response) => {
  const { playerId, type, shopIndex, targetPetId } = req.body;

  if (!playerId) {
    return res.status(400).json({ success: false, error: 'playerId is required' });
  }

  if (type !== 'pet' && type !== 'food') {
    return res.status(400).json({ success: false, error: 'type must be "pet" or "food"' });
  }

  if (typeof shopIndex !== 'number') {
    return res.status(400).json({ success: false, error: 'shopIndex is required' });
  }

  try {
    let result;

    if (type === 'pet') {
      result = handleBuyPet(playerId, shopIndex);
    } else {
      if (!targetPetId) {
        return res.status(400).json({ success: false, error: 'targetPetId is required for food' });
      }
      result = handleBuyFood(playerId, shopIndex, targetPetId);
    }

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Get updated game state
    const gameState = getGameState(playerId);

    res.json({
      success: true,
      data: {
        ...result,
        player: gameState.state?.player,
        shop: gameState.state?.shop,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to process purchase' });
  }
});

/**
 * POST /api/shop/roll
 * Roll the shop (costs 1 gold)
 */
router.post('/shop/roll', (req: Request, res: Response) => {
  const { playerId } = req.body;

  if (!playerId) {
    return res.status(400).json({ success: false, error: 'playerId is required' });
  }

  try {
    const result = handleRoll(playerId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Get updated game state
    const gameState = getGameState(playerId);

    res.json({
      success: true,
      data: {
        shop: gameState.state?.shop,
        gold: gameState.state?.player.gold,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to roll shop' });
  }
});

/**
 * POST /api/shop/freeze
 * Toggle freeze on a shop slot
 */
router.post('/shop/freeze', (req: Request, res: Response) => {
  const { playerId, slotIndex } = req.body;

  if (!playerId) {
    return res.status(400).json({ success: false, error: 'playerId is required' });
  }

  if (typeof slotIndex !== 'number') {
    return res.status(400).json({ success: false, error: 'slotIndex is required' });
  }

  try {
    const result = handleFreeze(playerId, slotIndex);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Get updated game state
    const gameState = getGameState(playerId);

    res.json({
      success: true,
      data: {
        shop: gameState.state?.shop,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to freeze slot' });
  }
});

/**
 * POST /api/team/arrange
 * Update team positions
 */
router.post('/team/arrange', (req: Request, res: Response) => {
  const { playerId, newOrder } = req.body;

  if (!playerId) {
    return res.status(400).json({ success: false, error: 'playerId is required' });
  }

  if (!Array.isArray(newOrder)) {
    return res.status(400).json({ success: false, error: 'newOrder must be an array' });
  }

  try {
    const result = handleArrangeTeam(playerId, newOrder);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Get updated game state
    const gameState = getGameState(playerId);

    res.json({
      success: true,
      data: {
        team: gameState.state?.player.team,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to arrange team' });
  }
});

/**
 * POST /api/team/sell
 * Sell a pet from team
 */
router.post('/team/sell', (req: Request, res: Response) => {
  const { playerId, petId } = req.body;

  if (!playerId) {
    return res.status(400).json({ success: false, error: 'playerId is required' });
  }

  if (!petId) {
    return res.status(400).json({ success: false, error: 'petId is required' });
  }

  try {
    const result = handleSellPet(playerId, petId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Get updated game state
    const gameState = getGameState(playerId);

    res.json({
      success: true,
      data: {
        goldReceived: result.gold,
        player: gameState.state?.player,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to sell pet' });
  }
});

/**
 * POST /api/battle/ready
 * End shop phase and enter battle
 */
router.post('/battle/ready', (req: Request, res: Response) => {
  const { playerId } = req.body;

  if (!playerId) {
    return res.status(400).json({ success: false, error: 'playerId is required' });
  }

  try {
    const result = handleEndTurn(playerId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Get updated game state (if game is not over)
    let gameState = null;
    if (!result.gameOver && !result.gameWon) {
      gameState = getGameState(playerId);
    }

    res.json({
      success: true,
      data: {
        battleResult: result.battleResult,
        gameOver: result.gameOver,
        gameWon: result.gameWon,
        nextTurn: gameState?.state,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to start battle' });
  }
});

/**
 * GET /api/battle/result
 * Get the last battle result (for replay purposes)
 */
router.get('/battle/result', (req: Request, res: Response) => {
  const playerId = req.query.playerId as string;

  if (!playerId) {
    return res.status(400).json({ success: false, error: 'playerId is required' });
  }

  // In a full implementation, this would retrieve saved battle results
  // For now, just return the current game state
  const result = getGameState(playerId);

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.json({
    success: true,
    data: {
      message: 'Battle results are returned with /battle/ready response',
    },
  });
});

/**
 * DELETE /api/game/:playerId
 * End a game session
 */
router.delete('/game/:playerId', (req: Request, res: Response) => {
  const { playerId } = req.params;

  const deleted = endGame(playerId);

  res.json({
    success: true,
    data: {
      deleted,
    },
  });
});

export default router;
