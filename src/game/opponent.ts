import { Player, Creature, CreatureTemplate, Tribe, GAME_CONSTANTS } from '../types';
import { getAvailableCreatures } from '../data/creatures';
import { getTierConfig, createCreatureFromTemplate, getPositionFromIndex, getSlotIndexFromTeamIndex } from './shop';
import { applyPlacementBuffs } from './buffs';

// Generate a random opponent based on turn and difficulty
export function generateOpponent(turn: number, playerWins: number): Player {
  const config = getTierConfig(turn);
  const availableCreatures = getAvailableCreatures(config.availableTiers);

  // Team size: start with 2, scale up faster
  const teamSize = Math.min(
    Math.max(2, turn + Math.floor(playerWins / 2)),
    GAME_CONSTANTS.MAX_TEAM_SIZE
  );
  const team: (Creature | null)[] = [null, null, null, null, null];

  if (availableCreatures.length === 0) {
    return makePlayer(team, playerWins, turn);
  }

  // 50% chance to build around a tribe for synergy
  const buildTribe = Math.random() < 0.5;
  const tribes: Tribe[] = ['Spirit', 'Flora', 'Fauna', 'Kami', 'Dessert'];
  const chosenTribe = tribes[Math.floor(Math.random() * tribes.length)];

  for (let i = 0; i < teamSize && i < GAME_CONSTANTS.MAX_TEAM_SIZE; i++) {
    const template = pickTemplate(availableCreatures, config.availableTiers, buildTribe ? chosenTribe : null, turn);

    // Determine tier level
    let tier = 1;
    if (turn >= 8 && Math.random() < 0.15) {
      tier = 3;
    } else if (turn >= 5 && Math.random() < 0.25) {
      tier = 2;
    } else if (turn >= 3 && Math.random() < 0.2) {
      tier = 2;
    }

    const position = getPositionFromIndex(i);
    const slotIndex = getSlotIndexFromTeamIndex(i);
    const creature = createCreatureFromTemplate(template, tier, position, slotIndex, i);

    applyPlacementBuffs(creature);
    team[i] = creature;
  }

  return makePlayer(team, playerWins, turn);
}

function makePlayer(team: (Creature | null)[], playerWins: number, turn: number): Player {
  return {
    id: `opponent-${Date.now()}`,
    username: generateOpponentName(),
    team,
    gold: 0,
    lives: GAME_CONSTANTS.STARTING_LIVES,
    wins: playerWins,
    currentTurn: turn,
    mmr: 1000 + playerWins * 50,
  };
}

/**
 * Pick a creature template with optional tribe bias and tier weighting.
 */
function pickTemplate(
  available: CreatureTemplate[],
  availableTiers: number[],
  preferTribe: Tribe | null,
  turn: number
): CreatureTemplate {
  const maxTier = availableTiers[availableTiers.length - 1];

  // Build a weighted pool
  let pool = available;

  // Tribe bias: 70% chance to pick from preferred tribe if available
  if (preferTribe && Math.random() < 0.7) {
    const tribePool = available.filter((c) => c.type === preferTribe);
    if (tribePool.length > 0) pool = tribePool;
  }

  // Tier bias: prefer higher tiers as game progresses
  if (turn >= 5 && Math.random() < 0.6) {
    const highTier = pool.filter((c) => c.shopTier === maxTier);
    if (highTier.length > 0) pool = highTier;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

function generateOpponentName(): string {
  const adjectives = [
    'Fierce', 'Swift', 'Cunning', 'Wild', 'Ancient',
    'Shadow', 'Storm', 'Iron', 'Crystal', 'Mystic',
  ];
  const nouns = [
    'Trainer', 'Tamer', 'Champion', 'Warrior', 'Master',
    'Guardian', 'Hunter', 'Seeker', 'Knight', 'Sage',
  ];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${adjective} ${noun}`;
}
