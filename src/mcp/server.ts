#!/usr/bin/env node

/**
 * MCP Server for Battle Pets Arena
 *
 * Exposes game actions as MCP tools so LLM clients can play the game.
 * Runs as a standalone stdio process. Stores game state in memory
 * (one game at a time per server instance).
 *
 * Usage:
 *   npx tsx src/mcp/server.ts
 *
 * MCP client config (e.g. in Claude Desktop):
 *   {
 *     "mcpServers": {
 *       "battle-pets": {
 *         "command": "npx",
 *         "args": ["tsx", "src/mcp/server.ts"],
 *         "cwd": "/path/to/CryptidPetBattles"
 *       }
 *     }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { GameState } from '../types/index.js';
import { createInitialGameState, runAction } from '../game/engine.js';
import { filterGameState } from '../game/stateFilter.js';
import type { ActionName } from '../game/engine.js';

// In-memory game store (one game per MCP session is typical)
const games = new Map<string, GameState>();

const server = new McpServer({
  name: 'battle-pets-arena',
  version: '1.0.0',
});

// ============================================================
// Tool: start_game
// ============================================================

server.tool(
  'start_game',
  'Start a new Battle Pets Arena game. Returns the initial game state with shop and available actions.',
  {},
  async () => {
    const state = createInitialGameState();
    const gameId = state.player.id;
    games.set(gameId, state);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(filterGameState(state, gameId), null, 2),
      }],
    };
  }
);

// ============================================================
// Tool: get_game_state
// ============================================================

server.tool(
  'get_game_state',
  'Get the current state of a game, including team, shop, gold, lives, wins, and available actions.',
  {
    gameId: z.string().describe('The game ID returned by start_game'),
  },
  async ({ gameId }) => {
    const state = games.get(gameId);
    if (!state) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ error: 'Game not found. Use start_game to create a new game.' }),
        }],
        isError: true,
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(filterGameState(state, gameId), null, 2),
      }],
    };
  }
);

// ============================================================
// Tool: take_action
// ============================================================

server.tool(
  'take_action',
  `Perform a game action. Actions depend on the current phase.

Shop phase actions:
- buy: Buy a creature from the shop. Params: shopIndex, teamIndex
- sell: Sell a creature from your team. Params: teamIndex
- roll: Reroll the shop for new creatures
- swap: Swap two creatures on your team. Params: indexA, indexB
- combine: Combine two identical creatures to level up. Params: sourceIndex, targetIndex
- freeze: Toggle freeze on a shop slot. Params: shopIndex
- end_turn: End shop phase and start battle

Result phase actions:
- next_turn: Process battle result and go to next shop phase

Team slots: 0-1 = frontline, 2-4 = backline`,
  {
    gameId: z.string().describe('The game ID'),
    action: z.enum([
      'buy', 'sell', 'roll', 'swap', 'combine', 'freeze', 'end_turn', 'next_turn',
    ]).describe('The action to perform'),
    shopIndex: z.number().optional().describe('Shop slot index (for buy, freeze)'),
    teamIndex: z.number().optional().describe('Team slot index (for buy, sell)'),
    indexA: z.number().optional().describe('First team slot (for swap)'),
    indexB: z.number().optional().describe('Second team slot (for swap)'),
    sourceIndex: z.number().optional().describe('Source team slot (for combine)'),
    targetIndex: z.number().optional().describe('Target team slot (for combine)'),
  },
  async ({ gameId, action, shopIndex, teamIndex, indexA, indexB, sourceIndex, targetIndex }) => {
    const state = games.get(gameId);
    if (!state) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ error: 'Game not found. Use start_game to create a new game.' }),
        }],
        isError: true,
      };
    }

    if (state.phase === 'gameOver') {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            error: 'Game is over. Start a new game with start_game.',
            state: filterGameState(state, gameId),
          }),
        }],
        isError: true,
      };
    }

    const params: Record<string, number | undefined> = {
      shopIndex,
      teamIndex,
      indexA,
      indexB,
      sourceIndex,
      targetIndex,
    };

    const result = runAction(state, action as ActionName, params);

    if (!result.success) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            error: result.error,
            state: filterGameState(result.state, gameId),
          }),
        }],
        isError: true,
      };
    }

    // Update stored state
    games.set(gameId, result.state);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(filterGameState(result.state, gameId), null, 2),
      }],
    };
  }
);

// ============================================================
// Tool: list_games
// ============================================================

server.tool(
  'list_games',
  'List all active games in this session.',
  {},
  async () => {
    const gameList = Array.from(games.entries()).map(([id, state]) => ({
      gameId: id,
      phase: state.phase,
      turn: state.player.currentTurn,
      wins: state.player.wins,
      lives: state.player.lives,
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(gameList, null, 2),
      }],
    };
  }
);

// ============================================================
// Start server
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('MCP server error:', error);
  process.exit(1);
});
