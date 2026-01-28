import { Food } from '../models/types';

/**
 * Food items available in the shop
 */
export const foodItems: Food[] = [
  // Tier 1 Foods
  {
    id: 'apple',
    name: 'Apple',
    tier: 1,
    effect: 'buff_both',
    value: 1,
    target: 'self',
    description: 'Give a pet +1/+1',
  },
  {
    id: 'honey',
    name: 'Honey',
    tier: 1,
    effect: 'buff_health',
    value: 2,
    target: 'self',
    description: 'Give a pet +2 health',
  },

  // Tier 2 Foods
  {
    id: 'meat',
    name: 'Meat',
    tier: 2,
    effect: 'buff_attack',
    value: 2,
    target: 'self',
    description: 'Give a pet +2 attack',
  },
  {
    id: 'cupcake',
    name: 'Cupcake',
    tier: 2,
    effect: 'buff_both',
    value: 2,
    target: 'self',
    description: 'Give a pet +2/+2 (temporary, this battle only)',
  },

  // Tier 3 Foods
  {
    id: 'salad',
    name: 'Salad',
    tier: 3,
    effect: 'buff_both',
    value: 1,
    target: 'all_allies',
    description: 'Give all pets +1/+1',
  },
  {
    id: 'pizza',
    name: 'Pizza',
    tier: 3,
    effect: 'buff_both',
    value: 2,
    target: 'random_ally',
    description: 'Give 2 random pets +2/+2',
  },

  // Tier 4 Foods
  {
    id: 'sushi',
    name: 'Sushi',
    tier: 4,
    effect: 'buff_both',
    value: 3,
    target: 'self',
    description: 'Give a pet +3/+3',
  },
  {
    id: 'chocolate',
    name: 'Chocolate',
    tier: 4,
    effect: 'buff_attack',
    value: 3,
    target: 'all_allies',
    description: 'Give all pets +3 attack',
  },

  // Tier 5 Foods
  {
    id: 'steak',
    name: 'Steak',
    tier: 5,
    effect: 'buff_both',
    value: 4,
    target: 'self',
    description: 'Give a pet +4/+4',
  },
  {
    id: 'cake',
    name: 'Cake',
    tier: 5,
    effect: 'buff_both',
    value: 2,
    target: 'all_allies',
    description: 'Give all pets +2/+2',
  },
];

/**
 * Get food items by tier
 */
export function getFoodsByTier(tier: number): Food[] {
  return foodItems.filter((food) => food.tier === tier);
}

/**
 * Get food items up to a certain tier
 */
export function getFoodsUpToTier(maxTier: number): Food[] {
  return foodItems.filter((food) => food.tier <= maxTier);
}

/**
 * Get a food item by ID
 */
export function getFoodById(id: string): Food | undefined {
  return foodItems.find((food) => food.id === id);
}
