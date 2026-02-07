/**
 * CORS headers for API responses.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
}

/**
 * Handle CORS preflight request. Returns true if the request was a preflight
 * (and the response has been sent), false otherwise.
 */
export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}
