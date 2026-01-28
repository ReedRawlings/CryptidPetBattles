import { v4 as uuidv4 } from 'uuid';
import { Pet, PetTemplate, Ability, Food } from './types';

// Constants
export const MAX_STAT = 50;
export const MAX_LEVEL = 3;
export const MAX_EXPERIENCE = 6;
export const EXP_TO_LEVEL_2 = 2;
export const EXP_TO_LEVEL_3 = 6;

/**
 * Create a new pet instance from a template
 */
export function createPet(template: PetTemplate): Pet {
  return {
    id: uuidv4(),
    templateId: template.id,
    name: template.name,
    tier: template.tier,
    level: 1,
    experience: 0,
    baseAttack: template.baseAttack,
    baseHealth: template.baseHealth,
    currentAttack: template.baseAttack,
    currentHealth: template.baseHealth,
    maxHealth: template.baseHealth,
    foodSlot: null,
    battlesParticipated: 0,
    ability: { ...template.ability },
    tempAttackBonus: 0,
    tempHealthBonus: 0,
    armor: 0,
    hasReborn: false,
  };
}

/**
 * Clone a pet for battle (to avoid mutating original)
 */
export function clonePet(pet: Pet): Pet {
  return {
    ...pet,
    ability: { ...pet.ability },
    foodSlot: pet.foodSlot ? { ...pet.foodSlot } : null,
  };
}

/**
 * Get the ability value based on pet level
 */
export function getAbilityValue(pet: Pet): number {
  const levelIndex = Math.min(pet.level, 3) - 1;
  return pet.ability.levelValues[levelIndex];
}

/**
 * Apply damage to a pet
 */
export function applyDamage(pet: Pet, damage: number): number {
  // Apply armor reduction
  const reducedDamage = Math.max(1, damage - pet.armor);
  pet.currentHealth -= reducedDamage;
  return reducedDamage;
}

/**
 * Heal a pet (capped at max HP)
 */
export function healPet(pet: Pet, amount: number): number {
  const maxHeal = Math.min(MAX_STAT, pet.maxHealth) - pet.currentHealth;
  const actualHeal = Math.min(amount, Math.max(0, maxHeal));
  pet.currentHealth += actualHeal;
  return actualHeal;
}

/**
 * Buff a pet's attack (capped at MAX_STAT)
 */
export function buffAttack(pet: Pet, amount: number, permanent: boolean = true): void {
  if (permanent) {
    pet.baseAttack = Math.min(MAX_STAT, pet.baseAttack + amount);
    pet.currentAttack = Math.min(MAX_STAT, pet.currentAttack + amount);
  } else {
    pet.tempAttackBonus += amount;
    pet.currentAttack = Math.min(MAX_STAT, pet.baseAttack + pet.tempAttackBonus);
  }
}

/**
 * Buff a pet's health (capped at MAX_STAT)
 */
export function buffHealth(pet: Pet, amount: number, permanent: boolean = true): void {
  if (permanent) {
    pet.baseHealth = Math.min(MAX_STAT, pet.baseHealth + amount);
    pet.maxHealth = Math.min(MAX_STAT, pet.maxHealth + amount);
    pet.currentHealth = Math.min(MAX_STAT, pet.currentHealth + amount);
  } else {
    pet.tempHealthBonus += amount;
    pet.currentHealth = Math.min(MAX_STAT, pet.currentHealth + amount);
    pet.maxHealth = Math.min(MAX_STAT, pet.maxHealth + amount);
  }
}

/**
 * Check if a pet has fainted
 */
export function hasFainted(pet: Pet): boolean {
  return pet.currentHealth <= 0;
}

/**
 * Add experience to a pet and check for level up
 */
export function addExperience(pet: Pet, amount: number = 1): boolean {
  if (pet.level >= MAX_LEVEL) {
    return false;
  }

  pet.experience += amount;
  let leveledUp = false;

  // Check for level up
  if (pet.level === 1 && pet.experience >= EXP_TO_LEVEL_2) {
    pet.level = 2;
    leveledUp = true;
  } else if (pet.level === 2 && pet.experience >= EXP_TO_LEVEL_3) {
    pet.level = 3;
    leveledUp = true;
  }

  return leveledUp;
}

/**
 * Combine two identical pets (for leveling)
 */
export function combinePets(target: Pet, source: Pet): boolean {
  if (target.templateId !== source.templateId) {
    return false;
  }

  // Add source stats to target
  const attackBonus = source.currentAttack - source.baseAttack + 1;
  const healthBonus = source.currentHealth - source.baseHealth + 1;

  buffAttack(target, attackBonus);
  buffHealth(target, healthBonus);

  // Add experience
  addExperience(target, 1 + source.experience);

  return true;
}

/**
 * Apply food to a pet
 */
export function applyFood(pet: Pet, food: Food): void {
  switch (food.effect) {
    case 'buff_attack':
      buffAttack(pet, food.value);
      break;
    case 'buff_health':
      buffHealth(pet, food.value);
      break;
    case 'buff_both':
      buffAttack(pet, food.value);
      buffHealth(pet, food.value);
      break;
    default:
      break;
  }
  pet.foodSlot = food;
}

/**
 * Reset temporary battle stats
 */
export function resetBattleStats(pet: Pet): void {
  pet.tempAttackBonus = 0;
  pet.tempHealthBonus = 0;
  pet.currentAttack = pet.baseAttack;
  pet.currentHealth = pet.maxHealth;
  pet.armor = 0;
  pet.hasReborn = false;
}

/**
 * Increment battles participated counter
 */
export function incrementBattlesParticipated(pet: Pet): void {
  pet.battlesParticipated += 1;
}

/**
 * Get effective attack value (base + temp bonus)
 */
export function getEffectiveAttack(pet: Pet): number {
  return Math.min(MAX_STAT, pet.currentAttack);
}

/**
 * Format pet stats for display
 */
export function formatPetStats(pet: Pet): string {
  return `${pet.name} (${pet.currentAttack}/${pet.currentHealth}) Lvl ${pet.level}`;
}
