import { PetTemplate, Ability } from '../models/types';

/**
 * Ability definitions for all pets
 */
const abilities: Record<string, Ability> = {
  // Tier 1 Abilities
  puppy_ability: {
    id: 'puppy_ability',
    name: 'Pack Bond',
    trigger: 'onFriendSummoned',
    effect: 'buff_both',
    baseValue: 1,
    target: 'self',
    description: 'When a friendly pet is summoned, gain +1/+1',
    levelValues: [1, 2, 3],
  },
  crab_ability: {
    id: 'crab_ability',
    name: 'Pinch',
    trigger: 'onHurt',
    effect: 'reflect',
    baseValue: 1,
    target: 'attacker',
    description: 'When hurt, deal 1 damage to attacker',
    levelValues: [1, 2, 3],
  },
  bee_ability: {
    id: 'bee_ability',
    name: 'Hive Mind',
    trigger: 'onFaint',
    effect: 'summon',
    baseValue: 1,
    target: 'self',
    description: 'On faint, summon a 1/1 Honeybee',
    levelValues: [1, 2, 3],
  },

  // Tier 2 Abilities
  wolf_ability: {
    id: 'wolf_ability',
    name: 'Pack Leader',
    trigger: 'startOfBattle',
    effect: 'buff_attack',
    baseValue: 1,
    target: 'adjacent_allies',
    description: 'At start of battle, give adjacent allies +1 ATK',
    levelValues: [1, 2, 3],
  },
  turtle_ability: {
    id: 'turtle_ability',
    name: 'Shell Shield',
    trigger: 'onFaint',
    effect: 'armor',
    baseValue: 2,
    target: 'pet_behind',
    description: 'On faint, give pet behind +2 armor',
    levelValues: [2, 4, 6],
  },
  crow_ability: {
    id: 'crow_ability',
    name: 'Carrion Feeder',
    trigger: 'onEnemyFaint',
    effect: 'buff_attack',
    baseValue: 1,
    target: 'self',
    description: 'When an enemy faints, permanently gain +1 ATK',
    levelValues: [1, 2, 3],
  },

  // Tier 3 Abilities
  berserker_ability: {
    id: 'berserker_ability',
    name: 'Blood Rage',
    trigger: 'onAttack',
    effect: 'buff_attack',
    baseValue: 1,
    target: 'self',
    description: 'On attack, gain +1 ATK for this battle',
    levelValues: [1, 2, 3],
  },
  echo_ability: {
    id: 'echo_ability',
    name: 'Echoing Strike',
    trigger: 'startOfBattle',
    effect: 'damage',
    baseValue: 3,
    target: 'random_enemy',
    description: 'At start of battle, deal 3 damage × battles participated to a random enemy',
    levelValues: [3, 4, 5],
  },
  golem_ability: {
    id: 'golem_ability',
    name: 'Stone Skin',
    trigger: 'passive',
    effect: 'armor',
    baseValue: 2,
    target: 'self',
    description: 'Takes 2 less damage from all attacks (min 1)',
    levelValues: [2, 3, 4],
  },

  // Tier 4 Abilities
  pure_ability: {
    id: 'pure_ability',
    name: 'Purifying Light',
    trigger: 'onFaint',
    effect: 'heal',
    baseValue: 3,
    target: 'all_allies',
    description: 'On faint, heal all surviving allies for 3 HP',
    levelValues: [3, 5, 7],
  },
  vampire_ability: {
    id: 'vampire_ability',
    name: 'Life Drain',
    trigger: 'onKill',
    effect: 'heal',
    baseValue: 0, // Special: heals for killed enemy's ATK
    target: 'self',
    description: "On kill, heal for the killed enemy's ATK",
    levelValues: [1, 1, 1], // Multiplier for enemy ATK
  },
  snake_ability: {
    id: 'snake_ability',
    name: 'Venom Strike',
    trigger: 'onFriendAttack',
    effect: 'damage',
    baseValue: 3,
    target: 'random_enemy',
    description: 'When a friendly pet attacks, deal 3 damage to a random enemy',
    levelValues: [3, 5, 7],
  },

  // Tier 5 Abilities
  dragon_ability: {
    id: 'dragon_ability',
    name: 'Dragon Breath',
    trigger: 'startOfBattle',
    effect: 'damage',
    baseValue: 5,
    target: 'all_enemies',
    description: 'At start of battle, deal 5 damage to ALL enemies',
    levelValues: [5, 7, 10],
  },
  phoenix_ability: {
    id: 'phoenix_ability',
    name: 'Reborn',
    trigger: 'onFaint',
    effect: 'reborn',
    baseValue: 1,
    target: 'self',
    description: 'Revive once with 1 HP after fainting',
    levelValues: [1, 2, 3], // HP on revive
  },
  hydra_ability: {
    id: 'hydra_ability',
    name: 'Many Heads',
    trigger: 'onFaint',
    effect: 'summon',
    baseValue: 2,
    target: 'self',
    description: 'On faint, summon two 2/4 Hydra Heads',
    levelValues: [2, 2, 2],
  },
};

/**
 * Starter pet roster - 15 pets across 5 tiers
 */
export const petTemplates: PetTemplate[] = [
  // Tier 1 Pets
  {
    id: 'puppy',
    name: 'Puppy',
    tier: 1,
    baseAttack: 2,
    baseHealth: 3,
    ability: abilities.puppy_ability,
  },
  {
    id: 'crab',
    name: 'Crab',
    tier: 1,
    baseAttack: 2,
    baseHealth: 2,
    ability: abilities.crab_ability,
  },
  {
    id: 'bee',
    name: 'Bee',
    tier: 1,
    baseAttack: 2,
    baseHealth: 1,
    ability: abilities.bee_ability,
  },

  // Tier 2 Pets
  {
    id: 'wolf',
    name: 'Wolf',
    tier: 2,
    baseAttack: 3,
    baseHealth: 3,
    ability: abilities.wolf_ability,
  },
  {
    id: 'turtle',
    name: 'Turtle',
    tier: 2,
    baseAttack: 2,
    baseHealth: 4,
    ability: abilities.turtle_ability,
  },
  {
    id: 'crow',
    name: 'Crow',
    tier: 2,
    baseAttack: 3,
    baseHealth: 2,
    ability: abilities.crow_ability,
  },

  // Tier 3 Pets
  {
    id: 'berserker',
    name: 'Berserker',
    tier: 3,
    baseAttack: 3,
    baseHealth: 4,
    ability: abilities.berserker_ability,
  },
  {
    id: 'echo',
    name: 'Echo',
    tier: 3,
    baseAttack: 2,
    baseHealth: 5,
    ability: abilities.echo_ability,
  },
  {
    id: 'golem',
    name: 'Golem',
    tier: 3,
    baseAttack: 2,
    baseHealth: 6,
    ability: abilities.golem_ability,
  },

  // Tier 4 Pets
  {
    id: 'pure',
    name: 'Pure',
    tier: 4,
    baseAttack: 3,
    baseHealth: 4,
    ability: abilities.pure_ability,
  },
  {
    id: 'vampire',
    name: 'Vampire',
    tier: 4,
    baseAttack: 4,
    baseHealth: 4,
    ability: abilities.vampire_ability,
  },
  {
    id: 'snake',
    name: 'Snake',
    tier: 4,
    baseAttack: 5,
    baseHealth: 3,
    ability: abilities.snake_ability,
  },

  // Tier 5 Pets
  {
    id: 'dragon',
    name: 'Dragon',
    tier: 5,
    baseAttack: 6,
    baseHealth: 6,
    ability: abilities.dragon_ability,
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    tier: 5,
    baseAttack: 5,
    baseHealth: 5,
    ability: abilities.phoenix_ability,
  },
  {
    id: 'hydra',
    name: 'Hydra',
    tier: 5,
    baseAttack: 4,
    baseHealth: 8,
    ability: abilities.hydra_ability,
  },
];

/**
 * Get pet templates by tier
 */
export function getPetsByTier(tier: number): PetTemplate[] {
  return petTemplates.filter((pet) => pet.tier === tier);
}

/**
 * Get pet templates up to a certain tier
 */
export function getPetsUpToTier(maxTier: number): PetTemplate[] {
  return petTemplates.filter((pet) => pet.tier <= maxTier);
}

/**
 * Get a pet template by ID
 */
export function getPetTemplateById(id: string): PetTemplate | undefined {
  return petTemplates.find((pet) => pet.id === id);
}

/**
 * Get the max tier available for a given turn
 */
export function getMaxTierForTurn(turn: number): number {
  if (turn >= 11) return 6;
  if (turn >= 9) return 5;
  if (turn >= 7) return 4;
  if (turn >= 5) return 3;
  if (turn >= 3) return 2;
  return 1;
}

/**
 * Get shop slots configuration for a given turn
 */
export function getShopSlotsForTurn(turn: number): { petSlots: number; foodSlots: number } {
  if (turn >= 9) return { petSlots: 5, foodSlots: 3 };
  if (turn >= 5) return { petSlots: 4, foodSlots: 2 };
  if (turn >= 3) return { petSlots: 3, foodSlots: 2 };
  return { petSlots: 3, foodSlots: 1 };
}
