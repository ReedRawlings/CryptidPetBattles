import type { Pet, Food } from '@/types';
import type { SerializedPet } from '@/types/multiplayer';
import { PET_TEMPLATES, SUMMONED_TEMPLATES } from '@/data/pets';
import { FOOD_ITEMS } from '@/data/foods';

/**
 * Serialize a Pet instance for database storage.
 * Strips runtime-only fields and stores only the essential data needed to recreate the pet.
 */
export function serializePet(pet: Pet): SerializedPet {
  return {
    templateId: pet.templateId,
    name: pet.name,
    tier: pet.tier,
    level: pet.level,
    experience: pet.experience,
    currentAttack: pet.currentAttack,
    currentHealth: pet.currentHealth,
    maxHealth: pet.maxHealth,
    position: pet.position,
    battlesParticipated: pet.battlesParticipated,
    foodSlotId: pet.foodSlot?.id ?? null,
    foodAttackBonus: pet.foodSlot?.attackValue ?? 0,
    foodHealthBonus: pet.foodSlot?.healthValue ?? 0,
  };
}

/**
 * Deserialize a SerializedPet back into a full Pet instance.
 * Looks up the template to restore ability and base stats.
 */
export function deserializePet(data: SerializedPet): Pet {
  // Find the pet template
  const template = PET_TEMPLATES.find((p) => p.id === data.templateId)
    ?? SUMMONED_TEMPLATES.find((p) => p.id === data.templateId);

  if (!template) {
    throw new Error(`Unknown pet template: ${data.templateId}`);
  }

  // Reconstruct food if present
  let foodSlot: Food | null = null;
  if (data.foodSlotId) {
    const foodTemplate = FOOD_ITEMS.find((f) => f.id === data.foodSlotId);
    if (foodTemplate) {
      foodSlot = {
        ...foodTemplate,
        attackValue: data.foodAttackBonus,
        healthValue: data.foodHealthBonus,
      };
    }
  }

  return {
    id: `pet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    templateId: data.templateId,
    name: data.name,
    tier: data.tier,
    level: data.level,
    experience: data.experience,
    baseAttack: template.baseAttack,
    baseHealth: template.baseHealth,
    currentAttack: data.currentAttack,
    currentHealth: data.currentHealth,
    maxHealth: data.maxHealth,
    ability: { ...template.ability },
    battlesParticipated: data.battlesParticipated,
    foodSlot,
    position: data.position,
    emoji: template.emoji,
    tempAttackBonus: 0,
    armor: 0,
    hasRevived: false,
  };
}

/**
 * Serialize a team (array of Pet or null) for database storage.
 */
export function serializeTeam(team: (Pet | null)[]): SerializedPet[] {
  return team
    .filter((pet): pet is Pet => pet !== null)
    .map(serializePet);
}

/**
 * Deserialize a team from the database.
 * Returns a 5-slot array with nulls for empty positions.
 */
export function deserializeTeam(data: SerializedPet[]): (Pet | null)[] {
  const team: (Pet | null)[] = [null, null, null, null, null];

  for (const petData of data) {
    if (petData.position >= 0 && petData.position < 5) {
      team[petData.position] = deserializePet(petData);
    }
  }

  return team;
}

/**
 * Calculate team power for matchmaking purposes.
 * Higher power = stronger team.
 */
export function calculateTeamPower(team: (Pet | null)[]): number {
  let power = 0;

  for (const pet of team) {
    if (!pet) continue;

    // Base stats contribute to power
    power += pet.currentAttack * 2;
    power += pet.maxHealth;

    // Level provides a multiplier
    power += (pet.level - 1) * 5;

    // Tier indicates relative strength
    power += pet.tier * 3;
  }

  return power;
}
