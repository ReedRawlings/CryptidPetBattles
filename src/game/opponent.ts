import { Player, Pet, GAME_CONSTANTS } from '../types';
import { getAvailablePets } from '../data/pets';
import { getTierConfig, createPetFromTemplate } from './shop';

// Generate a random opponent based on turn and difficulty
export function generateOpponent(turn: number, playerWins: number): Player {
  const config = getTierConfig(turn);
  const availablePets = getAvailablePets(config.availableTiers);

  // Opponent strength scales with turn and player wins
  const teamSize = Math.min(Math.ceil(turn / 2) + playerWins, GAME_CONSTANTS.MAX_TEAM_SIZE);
  const team: (Pet | null)[] = [null, null, null, null, null];

  for (let i = 0; i < teamSize && i < GAME_CONSTANTS.MAX_TEAM_SIZE; i++) {
    if (availablePets.length > 0) {
      // Prefer higher tier pets as game progresses
      const maxTier = config.availableTiers[config.availableTiers.length - 1];
      const tierPool = availablePets.filter((p) => {
        // 50% chance to pick from highest available tier
        if (Math.random() < 0.5) {
          return p.tier === maxTier;
        }
        return true;
      });

      const pool = tierPool.length > 0 ? tierPool : availablePets;
      const template = pool[Math.floor(Math.random() * pool.length)];
      const pet = createPetFromTemplate(template, i);

      // Give stat boosts based on turn number (simulating food/leveling)
      const statBonus = Math.floor(turn / 3);
      pet.currentAttack = Math.min(pet.currentAttack + statBonus, GAME_CONSTANTS.MAX_STAT);
      pet.currentHealth = Math.min(pet.currentHealth + statBonus, GAME_CONSTANTS.MAX_STAT);
      pet.maxHealth = pet.currentHealth;

      // Some chance of higher level
      if (turn >= 5 && Math.random() < 0.3) {
        pet.level = 2;
        pet.experience = 2;
      }
      if (turn >= 9 && Math.random() < 0.2) {
        pet.level = 3;
        pet.experience = 6;
      }

      team[i] = pet;
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

// Generate a random opponent name
function generateOpponentName(): string {
  const adjectives = [
    'Fierce',
    'Swift',
    'Cunning',
    'Wild',
    'Ancient',
    'Shadow',
    'Storm',
    'Iron',
    'Crystal',
    'Mystic',
  ];
  const nouns = [
    'Trainer',
    'Tamer',
    'Champion',
    'Warrior',
    'Master',
    'Guardian',
    'Hunter',
    'Seeker',
    'Knight',
    'Sage',
  ];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${adjective} ${noun}`;
}
