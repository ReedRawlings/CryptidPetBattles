/**
 * POST /api/game/[id]/action - Perform a game action
 *
 * Request body:
 * {
 *   "action": "buy" | "sell" | "roll" | "swap" | "combine" | "freeze" | "end_turn" | "next_turn",
 *   "params": { ... }  // optional, action-specific parameters
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateApiKey } from '../../_lib/auth';
import { loadGameState, saveGameState } from '../../_lib/gameStore';
import { runAction } from '../../../src/game/engine';
import type { ActionName } from '../../../src/game/engine';
import { filterGameState } from '../../../src/game/stateFilter';

const VALID_ACTIONS: ActionName[] = [
  'buy', 'sell', 'roll', 'swap', 'combine', 'freeze', 'end_turn', 'next_turn',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateApiKey(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  const gameId = req.query.id as string;

  const state = await loadGameState(gameId);
  if (!state) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  if (state.phase === 'gameOver') {
    res.status(400).json({
      error: 'Game is over. No more actions can be taken.',
      state: filterGameState(state, gameId),
    });
    return;
  }

  const body = req.body;
  if (!body || !body.action) {
    res.status(400).json({
      error: 'Request body must include "action"',
      validActions: VALID_ACTIONS,
    });
    return;
  }

  const actionName = body.action as ActionName;
  if (!VALID_ACTIONS.includes(actionName)) {
    res.status(400).json({
      error: `Invalid action: "${actionName}"`,
      validActions: VALID_ACTIONS,
    });
    return;
  }

  const params = body.params || {};
  const result = runAction(state, actionName, params);

  if (!result.success) {
    res.status(400).json({
      error: result.error,
      state: filterGameState(result.state, gameId),
    });
    return;
  }

  const saved = await saveGameState(gameId, result.state);
  if (!saved) {
    res.status(500).json({ error: 'Failed to save game state' });
    return;
  }

  res.status(200).json(filterGameState(result.state, gameId));
}
