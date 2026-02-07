/**
 * API key authentication middleware.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export function validateApiKey(req: VercelRequest, res: VercelResponse): boolean {
  const apiKey = process.env.GAME_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: 'API key not configured on server' });
    return false;
  }

  const provided = req.headers['x-api-key'];

  if (!provided || provided !== apiKey) {
    res.status(401).json({ error: 'Invalid or missing API key. Set X-API-Key header.' });
    return false;
  }

  return true;
}
