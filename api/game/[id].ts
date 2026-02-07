/**
 * GET /api/game/[id] - Get current game state
 * DELETE /api/game/[id] - Delete a game
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_lib/cors';
import { validateApiKey } from '../_lib/auth';
import { loadGameState, deleteGameState } from '../_lib/gameStore';
import { filterGameState } from '../../src/game/stateFilter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (!validateApiKey(req, res)) return;

  const gameId = req.query.id as string;

  if (req.method === 'GET') {
    const state = await loadGameState(gameId);
    if (!state) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    res.status(200).json(filterGameState(state, gameId));
    return;
  }

  if (req.method === 'DELETE') {
    const deleted = await deleteGameState(gameId);
    if (!deleted) {
      res.status(500).json({ error: 'Failed to delete game' });
      return;
    }

    res.status(200).json({ message: 'Game deleted' });
    return;
  }

  res.status(405).json({ error: 'Method not allowed. Use GET or DELETE.' });
}
