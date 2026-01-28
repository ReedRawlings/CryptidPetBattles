import type { Food, PetTier } from '@/types';

// All food items in the game
export const FOOD_ITEMS: Food[] = [
  // Tier 1 food
  {
    id: 'apple',
    name: 'Apple',
    attackBonus: 1,
    healthBonus: 1,
    tier: 1,
  },
  {
    id: 'honey',
    name: 'Honey',
    attackBonus: 1,
    healthBonus: 0,
    tier: 1,
  },

  // Tier 2 food
  {
    id: 'meat',
    name: 'Meat',
    attackBonus: 2,
    healthBonus: 0,
    tier: 2,
  },
  {
    id: 'salad',
    name: 'Salad',
    attackBonus: 0,
    healthBonus: 2,
    tier: 2,
  },

  // Tier 3 food
  {
    id: 'steak',
    name: 'Steak',
    attackBonus: 2,
    healthBonus: 1,
    tier: 3,
  },
  {
    id: 'cake',
    name: 'Cake',
    attackBonus: 1,
    healthBonus: 2,
    tier: 3,
  },

  // Tier 4 food
  {
    id: 'roast',
    name: 'Roast',
    attackBonus: 3,
    healthBonus: 1,
    tier: 4,
  },
  {
    id: 'potion',
    name: 'Potion',
    attackBonus: 1,
    healthBonus: 3,
    tier: 4,
  },

  // Tier 5 food
  {
    id: 'feast',
    name: 'Feast',
    attackBonus: 3,
    healthBonus: 3,
    tier: 5,
  },
];

// Helper functions
export function getFood(id: string): Food | undefined {
  return FOOD_ITEMS.find((f) => f.id === id);
}

export function getFoodByTier(tier: PetTier): Food[] {
  return FOOD_ITEMS.filter((f) => f.tier === tier);
}

export function getFoodUpToTier(maxTier: PetTier): Food[] {
  return FOOD_ITEMS.filter((f) => f.tier <= maxTier);
}
