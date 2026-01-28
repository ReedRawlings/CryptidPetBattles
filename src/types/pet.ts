import type { AbilityInstance } from './ability';

// Pet tier (1-6)
export type PetTier = 1 | 2 | 3 | 4 | 5 | 6;

// Pet level (1-3)
export type PetLevel = 1 | 2 | 3;

// Pet template - the base definition of a pet type
export interface PetTemplate {
  id: string;
  name: string;
  tier: PetTier;
  baseAttack: number;
  baseHealth: number;
  abilityId: string;
}

// Pet instance - a specific pet owned by a player
export interface Pet {
  id: string;
  templateId: string;
  name: string;
  tier: PetTier;
  level: PetLevel;
  experience: number; // 0-6. 2 XP to Lvl 2, 6 XP to Lvl 3
  baseAttack: number;
  baseHealth: number;
  currentAttack: number;
  currentHealth: number;
  ability: AbilityInstance;
  battlesParticipated: number;
  // Temporary battle state
  temporaryAttackBonus?: number;
  armor?: number;
  hasReborn?: boolean;
}

// Food item that can be applied to pets
export interface Food {
  id: string;
  name: string;
  attackBonus: number;
  healthBonus: number;
  tier: PetTier;
}

// Maximum stat cap as per PRD
export const MAX_STAT = 50;

// Experience required for each level
export const LEVEL_XP_REQUIREMENTS: Record<PetLevel, number> = {
  1: 0,
  2: 2,
  3: 6,
};
