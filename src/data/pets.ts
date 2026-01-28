import type { PetTemplate, PetTier } from '@/types';

// All pet templates for the game
export const PET_TEMPLATES: PetTemplate[] = [
  // Tier 1 pets
  {
    id: 'puppy',
    name: 'Puppy',
    tier: 1,
    baseAttack: 2,
    baseHealth: 3,
    abilityId: 'puppyAbility',
  },
  {
    id: 'crab',
    name: 'Crab',
    tier: 1,
    baseAttack: 2,
    baseHealth: 2,
    abilityId: 'crabAbility',
  },
  {
    id: 'bee',
    name: 'Bee',
    tier: 1,
    baseAttack: 2,
    baseHealth: 1,
    abilityId: 'beeAbility',
  },

  // Tier 2 pets
  {
    id: 'wolf',
    name: 'Wolf',
    tier: 2,
    baseAttack: 3,
    baseHealth: 3,
    abilityId: 'wolfAbility',
  },
  {
    id: 'turtle',
    name: 'Turtle',
    tier: 2,
    baseAttack: 2,
    baseHealth: 4,
    abilityId: 'turtleAbility',
  },
  {
    id: 'crow',
    name: 'Crow',
    tier: 2,
    baseAttack: 3,
    baseHealth: 2,
    abilityId: 'crowAbility',
  },

  // Tier 3 pets
  {
    id: 'berserker',
    name: 'Berserker',
    tier: 3,
    baseAttack: 3,
    baseHealth: 4,
    abilityId: 'berserkerAbility',
  },
  {
    id: 'echo',
    name: 'Echo',
    tier: 3,
    baseAttack: 2,
    baseHealth: 5,
    abilityId: 'echoAbility',
  },
  {
    id: 'golem',
    name: 'Golem',
    tier: 3,
    baseAttack: 2,
    baseHealth: 6,
    abilityId: 'golemAbility',
  },

  // Tier 4 pets
  {
    id: 'pure',
    name: 'Pure',
    tier: 4,
    baseAttack: 3,
    baseHealth: 4,
    abilityId: 'pureAbility',
  },
  {
    id: 'vampire',
    name: 'Vampire',
    tier: 4,
    baseAttack: 4,
    baseHealth: 4,
    abilityId: 'vampireAbility',
  },
  {
    id: 'snake',
    name: 'Snake',
    tier: 4,
    baseAttack: 5,
    baseHealth: 3,
    abilityId: 'snakeAbility',
  },

  // Tier 5 pets
  {
    id: 'dragon',
    name: 'Dragon',
    tier: 5,
    baseAttack: 6,
    baseHealth: 6,
    abilityId: 'dragonAbility',
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    tier: 5,
    baseAttack: 5,
    baseHealth: 5,
    abilityId: 'phoenixAbility',
  },
  {
    id: 'hydra',
    name: 'Hydra',
    tier: 5,
    baseAttack: 4,
    baseHealth: 8,
    abilityId: 'hydraAbility',
  },
];

// Summon pet templates (for abilities that summon new pets)
export const SUMMON_TEMPLATES: Record<string, PetTemplate> = {
  honeybee: {
    id: 'honeybee',
    name: 'Honeybee',
    tier: 1,
    baseAttack: 1,
    baseHealth: 1,
    abilityId: '', // No ability
  },
  hydraHead: {
    id: 'hydraHead',
    name: 'Hydra Head',
    tier: 5,
    baseAttack: 2,
    baseHealth: 4,
    abilityId: '', // No ability
  },
};

// Helper functions
export function getPetTemplate(id: string): PetTemplate | undefined {
  return PET_TEMPLATES.find((p) => p.id === id);
}

export function getPetsByTier(tier: PetTier): PetTemplate[] {
  return PET_TEMPLATES.filter((p) => p.tier === tier);
}

export function getPetsUpToTier(maxTier: PetTier): PetTemplate[] {
  return PET_TEMPLATES.filter((p) => p.tier <= maxTier);
}
