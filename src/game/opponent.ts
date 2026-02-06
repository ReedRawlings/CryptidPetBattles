import { Player, Creature, GAME_CONSTANTS } from '../types';
import { getAvailableCreatures } from '../data/creatures';
import { getTierConfig, createCreatureFromTemplate, getPositionFromIndex, getSlotIndexFromTeamIndex } from './shop';

// Generate a random opponent based on turn and difficulty
export function generateOpponent(turn: number, playerWins: number): Player {
  const config = getTierConfig(turn);
  const availableCreatures = getAvailableCreatures(config.availableTiers);

  const teamSize = Math.min(Math.ceil(turn / 2) + playerWins, GAME_CONSTANTS.MAX_TEAM_SIZE);
  const team: (Creature | null)[] = [null, null, null, null, null];

  for (let i = 0; i < teamSize && i < GAME_CONSTANTS.MAX_TEAM_SIZE; i++) {
    if (availableCreatures.length > 0) {
      // Prefer higher tier creatures as game progresses
      const maxTier = config.availableTiers[config.availableTiers.length - 1];
      const tierPool = availableCreatures.filter((c) => {
        if (Math.random() < 0.5) {
          return c.shopTier === maxTier;
        }
        return true;
      });

      const pool = tierPool.length > 0 ? tierPool : availableCreatures;
      const template = pool[Math.floor(Math.random() * pool.length)];

      // Determine star level
      let star = 1;
      if (turn >= 10 && Math.random() < 0.15) {
        star = 3;
      } else if (turn >= 7 && Math.random() < 0.3) {
        star = 2;
      }

      const position = getPositionFromIndex(i);
      const slotIndex = getSlotIndexFromTeamIndex(i);
      const creature = createCreatureFromTemplate(template, star, position, slotIndex, i);

      // Give stat boosts based on turn number
      const statBonus = Math.floor(turn / 3);
      creature.currentAttack = Math.min(creature.currentAttack + statBonus, GAME_CONSTANTS.MAX_STAT);
      creature.currentHealth = Math.min(creature.currentHealth + statBonus, GAME_CONSTANTS.MAX_STAT);
      creature.maxHealth = creature.currentHealth;

      team[i] = creature;
    }
  }

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
