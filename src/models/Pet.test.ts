import {
  createPet,
  clonePet,
  applyDamage,
  healPet,
  buffAttack,
  buffHealth,
  hasFainted,
  addExperience,
  combinePets,
  MAX_STAT,
} from './Pet';
import { PetTemplate } from './types';

// Mock pet template for testing
const mockTemplate: PetTemplate = {
  id: 'test_pet',
  name: 'Test Pet',
  tier: 1,
  baseAttack: 3,
  baseHealth: 4,
  ability: {
    id: 'test_ability',
    name: 'Test Ability',
    trigger: 'onAttack',
    effect: 'buff_attack',
    baseValue: 1,
    target: 'self',
    description: 'Test ability description',
    levelValues: [1, 2, 3],
  },
};

describe('Pet Model', () => {
  describe('createPet', () => {
    it('should create a pet from template with correct initial values', () => {
      const pet = createPet(mockTemplate);

      expect(pet.templateId).toBe('test_pet');
      expect(pet.name).toBe('Test Pet');
      expect(pet.tier).toBe(1);
      expect(pet.level).toBe(1);
      expect(pet.experience).toBe(0);
      expect(pet.baseAttack).toBe(3);
      expect(pet.baseHealth).toBe(4);
      expect(pet.currentAttack).toBe(3);
      expect(pet.currentHealth).toBe(4);
      expect(pet.battlesParticipated).toBe(0);
    });

    it('should generate unique IDs for each pet', () => {
      const pet1 = createPet(mockTemplate);
      const pet2 = createPet(mockTemplate);

      expect(pet1.id).not.toBe(pet2.id);
    });
  });

  describe('clonePet', () => {
    it('should create a deep copy of the pet', () => {
      const original = createPet(mockTemplate);
      const clone = clonePet(original);

      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
      expect(clone.ability).not.toBe(original.ability);
    });
  });

  describe('applyDamage', () => {
    it('should reduce pet health by damage amount', () => {
      const pet = createPet(mockTemplate);
      applyDamage(pet, 2);

      expect(pet.currentHealth).toBe(2);
    });

    it('should respect armor reduction', () => {
      const pet = createPet(mockTemplate);
      pet.armor = 2;
      const actualDamage = applyDamage(pet, 3);

      expect(actualDamage).toBe(1);
      expect(pet.currentHealth).toBe(3);
    });

    it('should deal minimum 1 damage even with armor', () => {
      const pet = createPet(mockTemplate);
      pet.armor = 10;
      const actualDamage = applyDamage(pet, 2);

      expect(actualDamage).toBe(1);
      expect(pet.currentHealth).toBe(3);
    });
  });

  describe('healPet', () => {
    it('should increase pet health', () => {
      const pet = createPet(mockTemplate);
      pet.currentHealth = 2;
      const healed = healPet(pet, 1);

      expect(healed).toBe(1);
      expect(pet.currentHealth).toBe(3);
    });

    it('should not heal above max health', () => {
      const pet = createPet(mockTemplate);
      pet.currentHealth = 3;
      const healed = healPet(pet, 10);

      expect(healed).toBe(1);
      expect(pet.currentHealth).toBe(4);
    });

    it('should not heal above MAX_STAT', () => {
      const pet = createPet(mockTemplate);
      pet.maxHealth = 60;
      pet.currentHealth = 45;
      const healed = healPet(pet, 20);

      expect(healed).toBe(5);
      expect(pet.currentHealth).toBe(50);
    });
  });

  describe('buffAttack', () => {
    it('should increase attack permanently by default', () => {
      const pet = createPet(mockTemplate);
      buffAttack(pet, 2);

      expect(pet.baseAttack).toBe(5);
      expect(pet.currentAttack).toBe(5);
    });

    it('should increase attack temporarily when specified', () => {
      const pet = createPet(mockTemplate);
      buffAttack(pet, 2, false);

      expect(pet.baseAttack).toBe(3);
      expect(pet.currentAttack).toBe(5);
      expect(pet.tempAttackBonus).toBe(2);
    });

    it('should cap at MAX_STAT', () => {
      const pet = createPet(mockTemplate);
      buffAttack(pet, 100);

      expect(pet.baseAttack).toBe(MAX_STAT);
      expect(pet.currentAttack).toBe(MAX_STAT);
    });
  });

  describe('buffHealth', () => {
    it('should increase health permanently by default', () => {
      const pet = createPet(mockTemplate);
      buffHealth(pet, 2);

      expect(pet.baseHealth).toBe(6);
      expect(pet.currentHealth).toBe(6);
      expect(pet.maxHealth).toBe(6);
    });

    it('should cap at MAX_STAT', () => {
      const pet = createPet(mockTemplate);
      buffHealth(pet, 100);

      expect(pet.baseHealth).toBe(MAX_STAT);
      expect(pet.currentHealth).toBe(MAX_STAT);
      expect(pet.maxHealth).toBe(MAX_STAT);
    });
  });

  describe('hasFainted', () => {
    it('should return false for healthy pet', () => {
      const pet = createPet(mockTemplate);
      expect(hasFainted(pet)).toBe(false);
    });

    it('should return true when health is 0', () => {
      const pet = createPet(mockTemplate);
      pet.currentHealth = 0;
      expect(hasFainted(pet)).toBe(true);
    });

    it('should return true when health is negative', () => {
      const pet = createPet(mockTemplate);
      pet.currentHealth = -5;
      expect(hasFainted(pet)).toBe(true);
    });
  });

  describe('addExperience', () => {
    it('should add experience to pet', () => {
      const pet = createPet(mockTemplate);
      addExperience(pet, 1);

      expect(pet.experience).toBe(1);
      expect(pet.level).toBe(1);
    });

    it('should level up to 2 at 2 experience', () => {
      const pet = createPet(mockTemplate);
      const leveledUp = addExperience(pet, 2);

      expect(leveledUp).toBe(true);
      expect(pet.experience).toBe(2);
      expect(pet.level).toBe(2);
    });

    it('should level up to 3 at 6 experience', () => {
      const pet = createPet(mockTemplate);
      pet.level = 2;
      pet.experience = 5;
      const leveledUp = addExperience(pet, 1);

      expect(leveledUp).toBe(true);
      expect(pet.experience).toBe(6);
      expect(pet.level).toBe(3);
    });

    it('should not level up beyond 3', () => {
      const pet = createPet(mockTemplate);
      pet.level = 3;
      pet.experience = 6;
      const leveledUp = addExperience(pet, 1);

      expect(leveledUp).toBe(false);
      expect(pet.level).toBe(3);
    });
  });

  describe('combinePets', () => {
    it('should combine pets of the same type', () => {
      const target = createPet(mockTemplate);
      const source = createPet(mockTemplate);

      const result = combinePets(target, source);

      expect(result).toBe(true);
      expect(target.experience).toBeGreaterThan(0);
    });

    it('should not combine pets of different types', () => {
      const target = createPet(mockTemplate);
      const differentTemplate = { ...mockTemplate, id: 'different_pet' };
      const source = createPet(differentTemplate);

      const result = combinePets(target, source);

      expect(result).toBe(false);
    });

    it('should add stats from source to target', () => {
      const target = createPet(mockTemplate);
      const source = createPet(mockTemplate);
      source.currentAttack = 5;
      source.currentHealth = 6;

      combinePets(target, source);

      expect(target.currentAttack).toBeGreaterThan(3);
      expect(target.currentHealth).toBeGreaterThan(4);
    });
  });
});
