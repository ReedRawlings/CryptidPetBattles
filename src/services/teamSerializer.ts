import type { Creature, Position } from '@/types';
import type { SerializedCreature } from '@/types/multiplayer';
import { getCreatureTemplate } from '@/data/creatures';

/**
 * Serialize a Creature instance for database storage.
 * Strips runtime-only fields and stores only the essential data needed to recreate the creature.
 */
export function serializeCreature(creature: Creature): SerializedCreature {
  return {
    templateId: creature.templateId,
    name: creature.name,
    star: creature.star,
    experience: creature.experience,
    currentAttack: creature.currentAttack,
    currentHealth: creature.currentHealth,
    currentSpeed: creature.currentSpeed,
    maxHealth: creature.maxHealth,
    position: creature.teamIndex,
    battlesParticipated: creature.battlesParticipated,
  };
}

/**
 * Get position and slot index from a team index.
 */
function getPositionFromTeamIndex(teamIndex: number): { position: Position; slotIndex: number } {
  if (teamIndex <= 1) {
    return { position: 'frontline', slotIndex: teamIndex };
  }
  return { position: 'backline', slotIndex: teamIndex - 2 };
}

/**
 * Deserialize a SerializedCreature back into a full Creature instance.
 * Looks up the template to restore ability, type, role, etc.
 */
export function deserializeCreature(data: SerializedCreature): Creature {
  const template = getCreatureTemplate(data.templateId);

  if (!template) {
    throw new Error(`Unknown creature template: ${data.templateId}`);
  }

  const starKey = String(data.star) as '1' | '2' | '3';
  const tierData = template.tiers[starKey] || template.tiers['1'];
  const { position, slotIndex } = getPositionFromTeamIndex(data.position);

  return {
    id: `creature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    templateId: data.templateId,
    name: data.name,
    type: template.type,
    role: template.role,
    shopTier: template.shopTier,
    star: data.star,
    experience: data.experience,
    baseAttack: tierData.baseStats.attack,
    baseHealth: tierData.baseStats.health,
    baseSpeed: tierData.baseStats.speed,
    currentAttack: data.currentAttack,
    currentHealth: data.currentHealth,
    currentSpeed: data.currentSpeed,
    maxHealth: data.maxHealth,
    position,
    slotIndex,
    teamIndex: data.position,
    ability: { ...tierData.ability },
    buffs: [],
    battlesParticipated: data.battlesParticipated,
  };
}

/**
 * Serialize a team (array of Creature or null) for database storage.
 */
export function serializeTeam(team: (Creature | null)[]): SerializedCreature[] {
  return team
    .filter((creature): creature is Creature => creature !== null)
    .map(serializeCreature);
}

/**
 * Deserialize a team from the database.
 * Returns a 5-slot array with nulls for empty positions.
 */
export function deserializeTeam(data: SerializedCreature[]): (Creature | null)[] {
  const team: (Creature | null)[] = [null, null, null, null, null];

  for (const creatureData of data) {
    if (creatureData.position >= 0 && creatureData.position < 5) {
      team[creatureData.position] = deserializeCreature(creatureData);
    }
  }

  return team;
}

/**
 * Calculate team power for matchmaking purposes.
 * Higher power = stronger team.
 */
export function calculateTeamPower(team: (Creature | null)[]): number {
  let power = 0;

  for (const creature of team) {
    if (!creature) continue;

    // Base stats contribute to power
    power += creature.currentAttack * 2;
    power += creature.maxHealth;

    // Star level provides a multiplier
    power += (creature.star - 1) * 10;

    // Shop tier indicates relative strength
    power += creature.shopTier * 3;
  }

  return power;
}
