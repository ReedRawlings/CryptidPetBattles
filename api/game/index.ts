/**
 * POST /api/game - Start a new game
 * GET /api/game - Not supported (use /api/game/[id])
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateApiKey } from '../_lib/auth';
import { saveGameState } from '../_lib/gameStore';
import { createInitialGameState } from '../../src/game/engine';
import { filterGameState } from '../../src/game/stateFilter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateApiKey(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST to create a new game.' });
    return;
  }

  const state = createInitialGameState();
  const gameId = state.player.id;

  const saved = await saveGameState(gameId, state);
  if (!saved) {
    res.status(500).json({ error: 'Failed to save game state' });
    return;
  }

  res.status(201).json(filterGameState(state, gameId));
}
