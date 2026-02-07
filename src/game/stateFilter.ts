/**
 * State Visibility Filter
 *
 * Strips internal/opponent data from game state before returning to API consumers.
 * Used by both the REST API and MCP server.
 */

import { GameState, Creature, CreatureTemplate, GAME_CONSTANTS } from '../types';
import type { ActionName } from './engine';

// ============================================================
// Filtered types returned to API consumers
// ============================================================

export interface FilteredCreature {
  id: string;
  templateId: string;
  name: string;
  type: string;
  role: string;
  shopTier: number;
  star: number;
  currentAttack: number;
  currentHealth: number;
  currentSpeed: number;
  maxHealth: number;
  position: string;
  teamIndex: number;
  abilityName: string;
  abilityDescription: string;
}

export interface FilteredShopSlot {
  index: number;
  creature: {
    id: string;
    name: string;
    type: string;
    role: string;
    shopTier: number;
    description: string;
    abilityName: string;
    abilityDescription: string;
    stats: { attack: number; health: number; speed: number };
  } | null;
  frozen: boolean;
}

export interface FilteredBattleResult {
  outcome: 'win' | 'loss' | 'draw';
  damageDealt: number;
}

export interface AvailableAction {
  name: ActionName;
  description: string;
  params?: Record<string, string>;
}

export interface FilteredGameState {
  gameId: string;
  phase: string;
  turn: number;
  gold: number;
  lives: number;
  wins: number;
  winsNeeded: number;
  team: (FilteredCreature | null)[];
  shop: FilteredShopSlot[] | null;
  lastBattleResult: FilteredBattleResult | null;
  availableActions: AvailableAction[];
  gameOver: {
    result: 'victory' | 'defeat';
    finalWins: number;
    finalLives: number;
  } | null;
}

// ============================================================
// Filter functions
// ============================================================

function filterCreature(creature: Creature): FilteredCreature {
  return {
    id: creature.id,
    templateId: creature.templateId,
    name: creature.name,
    type: creature.type,
    role: creature.role,
    shopTier: creature.shopTier,
    star: creature.star,
    currentAttack: creature.currentAttack,
    currentHealth: creature.currentHealth,
    currentSpeed: creature.currentSpeed,
    maxHealth: creature.maxHealth,
    position: creature.position,
    teamIndex: creature.teamIndex,
    abilityName: creature.ability.name,
    abilityDescription: creature.ability.description,
  };
}

function filterShopSlot(
  template: CreatureTemplate | null,
  index: number,
  frozen: boolean
): FilteredShopSlot {
  if (!template) {
    return { index, creature: null, frozen };
  }

  const tier1 = template.tiers['1'];
  return {
    index,
    creature: {
      id: template.id,
      name: template.name,
      type: template.type,
      role: template.role,
      shopTier: template.shopTier,
      description: template.description,
      abilityName: tier1.ability.name,
      abilityDescription: tier1.ability.description,
      stats: {
        attack: tier1.baseStats.attack,
        health: tier1.baseStats.health,
        speed: tier1.baseStats.speed,
      },
    },
    frozen,
  };
}

function getAvailableActions(state: GameState): AvailableAction[] {
  const actions: AvailableAction[] = [];

  if (state.phase === 'shop') {
    actions.push({
      name: 'buy',
      description: `Buy a creature from the shop (costs ${GAME_CONSTANTS.CREATURE_BUY_COST} gold)`,
      params: {
        shopIndex: 'Index of shop slot (0-based)',
        teamIndex: `Team slot to place creature (0-${GAME_CONSTANTS.FRONTLINE_SLOTS - 1} = frontline, ${GAME_CONSTANTS.FRONTLINE_SLOTS}-${GAME_CONSTANTS.MAX_TEAM_SIZE - 1} = backline)`,
      },
    });
    actions.push({
      name: 'sell',
      description: 'Sell a creature from your team (gain gold = star level)',
      params: { teamIndex: 'Team slot of creature to sell' },
    });
    actions.push({
      name: 'roll',
      description: `Reroll the shop for new creatures (costs ${GAME_CONSTANTS.ROLL_COST} gold)`,
    });
    actions.push({
      name: 'swap',
      description: 'Swap two creatures on your team (free)',
      params: { indexA: 'First team slot', indexB: 'Second team slot' },
    });
    actions.push({
      name: 'combine',
      description: 'Combine two identical creatures to level up (free)',
      params: {
        sourceIndex: 'Team slot of creature to sacrifice',
        targetIndex: 'Team slot of creature to upgrade',
      },
    });
    actions.push({
      name: 'freeze',
      description: 'Toggle freeze on a shop slot (persists through rerolls)',
      params: { shopIndex: 'Index of shop slot to freeze/unfreeze' },
    });
    actions.push({
      name: 'end_turn',
      description: 'End shop phase and start battle',
    });
  } else if (state.phase === 'result') {
    actions.push({
      name: 'next_turn',
      description: 'Process battle result and advance to next shop phase',
    });
  }

  return actions;
}

// ============================================================
// Main filter
// ============================================================

export function filterGameState(state: GameState, gameId: string): FilteredGameState {
  const team = state.player.team.map((c) => (c ? filterCreature(c) : null));

  const shop = state.phase === 'shop'
    ? state.shop.creatures.map((template, i) =>
        filterShopSlot(template, i, state.shop.frozen[i])
      )
    : null;

  let lastBattleResult: FilteredBattleResult | null = null;
  if (state.lastBattleResult) {
    lastBattleResult = {
      outcome: state.lastBattleResult.winner === 'player' ? 'win'
        : state.lastBattleResult.winner === 'opponent' ? 'loss'
        : 'draw',
      damageDealt: state.lastBattleResult.damageDealt,
    };
  }

  let gameOver: FilteredGameState['gameOver'] = null;
  if (state.phase === 'gameOver') {
    gameOver = {
      result: state.player.wins >= GAME_CONSTANTS.WINS_TO_WIN ? 'victory' : 'defeat',
      finalWins: state.player.wins,
      finalLives: state.player.lives,
    };
  }

  return {
    gameId,
    phase: state.phase,
    turn: state.player.currentTurn,
    gold: state.player.gold,
    lives: state.player.lives,
    wins: state.player.wins,
    winsNeeded: GAME_CONSTANTS.WINS_TO_WIN,
    team,
    shop,
    lastBattleResult,
    availableActions: getAvailableActions(state),
    gameOver,
  };
}
