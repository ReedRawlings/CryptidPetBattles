import { Food } from '../types';

export const FOOD_ITEMS: Food[] = [
  // Tier 1 Foods
  {
    id: 'apple',
    name: 'Apple',
    tier: 1,
    effect: 'healthBoost',
    attackValue: 0,
    healthValue: 1,
  },
  {
    id: 'meat',
    name: 'Meat',
    tier: 1,
    effect: 'attackBoost',
    attackValue: 1,
    healthValue: 0,
  },
  // Tier 2 Foods
  {
    id: 'honey',
    name: 'Honey',
    tier: 2,
    effect: 'both',
    attackValue: 1,
    healthValue: 1,
  },
  {
    id: 'cupcake',
    name: 'Cupcake',
    tier: 2,
    effect: 'healthBoost',
    attackValue: 0,
    healthValue: 2,
  },
  // Tier 3 Foods
  {
    id: 'salad',
    name: 'Salad',
    tier: 3,
    effect: 'both',
    attackValue: 1,
    healthValue: 2,
  },
  {
    id: 'steak',
    name: 'Steak',
    tier: 3,
    effect: 'attackBoost',
    attackValue: 2,
    healthValue: 0,
  },
  // Tier 4 Foods
  {
    id: 'pizza',
    name: 'Pizza',
    tier: 4,
    effect: 'both',
    attackValue: 2,
    healthValue: 2,
  },
  // Tier 5 Foods
  {
    id: 'chocolate',
    name: 'Chocolate',
    tier: 5,
    effect: 'both',
    attackValue: 3,
    healthValue: 3,
  },
];

export function getFoodsByTier(tier: number): Food[] {
  return FOOD_ITEMS.filter((f) => f.tier === tier);
}

export function getAvailableFoods(tiers: number[]): Food[] {
  return FOOD_ITEMS.filter((f) => tiers.includes(f.tier));
}
