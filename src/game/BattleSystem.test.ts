import { resolveBattle, simulateBattle, calculateDamageTaken } from './BattleSystem';
import { createPet } from '../models/Pet';
import { Pet, PetTemplate } from '../models/types';

// Mock pet templates for testing
const basicTemplate: PetTemplate = {
  id: 'basic',
  name: 'Basic Pet',
  tier: 1,
  baseAttack: 2,
  baseHealth: 3,
  ability: {
    id: 'none',
    name: 'None',
    trigger: 'passive',
    effect: 'buff_attack',
    baseValue: 0,
    target: 'self',
    description: 'No ability',
    levelValues: [0, 0, 0],
  },
};

const strongTemplate: PetTemplate = {
  id: 'strong',
  name: 'Strong Pet',
  tier: 2,
  baseAttack: 5,
  baseHealth: 5,
  ability: {
    id: 'none',
    name: 'None',
    trigger: 'passive',
    effect: 'buff_attack',
    baseValue: 0,
    target: 'self',
    description: 'No ability',
    levelValues: [0, 0, 0],
  },
};

describe('Battle System', () => {
  describe('resolveBattle', () => {
    it('should resolve a basic 1v1 battle', () => {
      const playerTeam = [createPet(basicTemplate)];
      const opponentTeam = [createPet(basicTemplate)];

      const result = resolveBattle(playerTeam, opponentTeam);

      expect(result).toHaveProperty('winner');
      expect(result).toHaveProperty('events');
      expect(result.events.length).toBeGreaterThan(0);
    });

    it('should declare the stronger pet as winner', () => {
      const playerTeam = [createPet(strongTemplate)];
      const opponentTeam = [createPet(basicTemplate)];

      const result = resolveBattle(playerTeam, opponentTeam);

      expect(result.winner).toBe('player');
      expect(result.playerTeamRemaining.length).toBe(1);
      expect(result.opponentTeamRemaining.length).toBe(0);
    });

    it('should handle empty teams', () => {
      const result = resolveBattle([], [createPet(basicTemplate)]);

      expect(result.winner).toBe('opponent');
    });

    it('should handle teams with null slots', () => {
      const playerTeam: (Pet | null)[] = [createPet(basicTemplate), null, createPet(basicTemplate)];
      const opponentTeam: (Pet | null)[] = [createPet(basicTemplate), null];

      const result = resolveBattle(playerTeam, opponentTeam);

      expect(result).toHaveProperty('winner');
    });

    it('should record battle events', () => {
      const playerTeam = [createPet(basicTemplate)];
      const opponentTeam = [createPet(basicTemplate)];

      const result = resolveBattle(playerTeam, opponentTeam);

      expect(result.events.some((e) => e.type === 'battle_start')).toBe(true);
      expect(result.events.some((e) => e.type === 'attack')).toBe(true);
      expect(result.events.some((e) => e.type === 'battle_end')).toBe(true);
    });

    it('should not mutate original teams', () => {
      const originalPet = createPet(basicTemplate);
      const originalHealth = originalPet.currentHealth;
      const playerTeam = [originalPet];
      const opponentTeam = [createPet(strongTemplate)];

      resolveBattle(playerTeam, opponentTeam);

      expect(originalPet.currentHealth).toBe(originalHealth);
    });
  });

  describe('simulateBattle', () => {
    it('should return simplified battle results', () => {
      const playerTeam = [createPet(strongTemplate)];
      const opponentTeam = [createPet(basicTemplate)];

      const result = simulateBattle(playerTeam, opponentTeam);

      expect(result).toHaveProperty('winner');
      expect(result).toHaveProperty('playerSurvivors');
      expect(result).toHaveProperty('opponentSurvivors');
    });

    it('should correctly count survivors', () => {
      const playerTeam = [createPet(strongTemplate), createPet(strongTemplate)];
      const opponentTeam = [createPet(basicTemplate)];

      const result = simulateBattle(playerTeam, opponentTeam);

      expect(result.winner).toBe('player');
      expect(result.playerSurvivors).toBeGreaterThan(0);
      expect(result.opponentSurvivors).toBe(0);
    });
  });

  describe('calculateDamageTaken', () => {
    it('should calculate damage based on pet tiers', () => {
      const pets = [
        { ...createPet(basicTemplate), tier: 1 },
        { ...createPet(basicTemplate), tier: 2 },
      ];

      const damage = calculateDamageTaken(pets);

      expect(damage).toBe(3); // 1 + 2
    });

    it('should return minimum 1 damage', () => {
      const damage = calculateDamageTaken([]);

      expect(damage).toBe(1);
    });

    it('should sum tier values correctly', () => {
      const pets = [
        { ...createPet(basicTemplate), tier: 3 },
        { ...createPet(basicTemplate), tier: 3 },
        { ...createPet(basicTemplate), tier: 3 },
      ];

      const damage = calculateDamageTaken(pets);

      expect(damage).toBe(9);
    });
  });

  describe('Battle with abilities', () => {
    it('should handle startOfBattle abilities', () => {
      const dragonTemplate: PetTemplate = {
        id: 'dragon',
        name: 'Dragon',
        tier: 5,
        baseAttack: 6,
        baseHealth: 6,
        ability: {
          id: 'dragon_breath',
          name: 'Dragon Breath',
          trigger: 'startOfBattle',
          effect: 'damage',
          baseValue: 5,
          target: 'all_enemies',
          description: 'Deal 5 damage to all enemies',
          levelValues: [5, 7, 10],
        },
      };

      const playerTeam = [createPet(dragonTemplate)];
      const opponentTeam = [createPet(basicTemplate)]; // 3 HP, will die to dragon breath

      const result = resolveBattle(playerTeam, opponentTeam);

      expect(result.winner).toBe('player');
      // Check that the ability triggered
      const abilityEvents = result.events.filter((e) => e.type === 'ability_trigger');
      expect(abilityEvents.length).toBeGreaterThan(0);
    });

    it('should handle onFaint abilities', () => {
      const beeTemplate: PetTemplate = {
        id: 'bee',
        name: 'Bee',
        tier: 1,
        baseAttack: 2,
        baseHealth: 1,
        ability: {
          id: 'hive_mind',
          name: 'Hive Mind',
          trigger: 'onFaint',
          effect: 'summon',
          baseValue: 1,
          target: 'self',
          description: 'Summon a Honeybee',
          levelValues: [1, 2, 3],
        },
      };

      const playerTeam = [createPet(beeTemplate)];
      const opponentTeam = [createPet(basicTemplate)];

      const result = resolveBattle(playerTeam, opponentTeam);

      // Check for summon events
      const summonEvents = result.events.filter((e) => e.type === 'summon');
      expect(summonEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Draw scenarios', () => {
    it('should handle draw when both teams are eliminated', () => {
      // Create two pets that will kill each other simultaneously
      const pet1 = createPet(basicTemplate);
      pet1.currentAttack = 10;
      pet1.currentHealth = 10;

      const pet2 = createPet(basicTemplate);
      pet2.currentAttack = 10;
      pet2.currentHealth = 10;

      const result = resolveBattle([pet1], [pet2]);

      expect(result.winner).toBe('draw');
    });
  });
});
