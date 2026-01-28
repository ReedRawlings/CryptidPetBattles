import type { PetTemplate, Food, PetTier } from './pet';

// Cost constants
export const ROLL_COST = 1;
export const PET_COST = 3;
export const SELL_VALUE = 1;

// Shop contents
export interface Shop {
  pets: (PetTemplate | null)[];
  food: (Food | null)[];
}

// Tier unlock schedule based on turn number
export interface TierSchedule {
  maxTier: PetTier;
  petSlots: number;
  foodSlots: number;
}

export const TIER_SCHEDULE: Record<number, TierSchedule> = {
  1: { maxTier: 1, petSlots: 3, foodSlots: 1 },
  2: { maxTier: 1, petSlots: 3, foodSlots: 1 },
  3: { maxTier: 2, petSlots: 3, foodSlots: 2 },
  4: { maxTier: 2, petSlots: 3, foodSlots: 2 },
  5: { maxTier: 3, petSlots: 4, foodSlots: 2 },
  6: { maxTier: 3, petSlots: 4, foodSlots: 2 },
  7: { maxTier: 4, petSlots: 4, foodSlots: 2 },
  8: { maxTier: 4, petSlots: 4, foodSlots: 2 },
  9: { maxTier: 5, petSlots: 5, foodSlots: 3 },
  10: { maxTier: 5, petSlots: 5, foodSlots: 3 },
};

// For turns 11+, use max tier 6
export function getTierSchedule(turn: number): TierSchedule {
  if (turn >= 11) {
    return { maxTier: 6, petSlots: 5, foodSlots: 3 };
  }
  return TIER_SCHEDULE[turn] || TIER_SCHEDULE[1];
}
