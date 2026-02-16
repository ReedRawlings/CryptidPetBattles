import type { Creature, Tribe } from '../../types';
import { ROGUELITE_CONSTANTS } from '../../types';
import { getCreaturesByTribe } from '../../data/creatures';
import { createCreatureFromTemplate } from '../shop';

/**
 * Generate a roguelite enemy team scaled to zone and map position.
 */
export function generateRogueliteOpponent(
  zoneId: number,
  nodeRow: number,
  isBoss: boolean,
  previewCount?: number
): Creature[] {
  const teamSize = previewCount ?? getTeamSize(nodeRow, isBoss);
  const team: Creature[] = [];

  // Pick creatures from the MVP tribes
  const tribes = ROGUELITE_CONSTANTS.STARTER_TRIBES;
  // Slight tribe bias for each encounter for thematic consistency
  const primaryTribe = tribes[Math.floor(Math.random() * tribes.length)];

  for (let i = 0; i < teamSize; i++) {
    // 60% chance to use primary tribe, 40% random
    const tribe = Math.random() < 0.6 ? primaryTribe : tribes[Math.floor(Math.random() * tribes.length)];
    const tier = getEnemyTier(zoneId, nodeRow, isBoss);
    const shopTierMax = tier; // Enemy creatures are from shopTier matching their combat tier

    const template = pickCreatureTemplate(tribe, shopTierMax);
    if (!template) continue;

    const position = i <= 1 ? 'frontline' : 'backline';
    const slotIndex = i <= 1 ? i : i - 2;

    const creature = createCreatureFromTemplate(template, tier, position as 'frontline' | 'backline', slotIndex, i);
    team.push(creature);
  }

  // All non-boss enemies are tanky but weak — 40% ATK, 120% HP
  // Difficulty scales through enemy count and tier, not raw stats
  if (!isBoss) {
    for (const creature of team) {
      creature.baseAttack = Math.max(1, Math.round(creature.baseAttack * 0.4));
      creature.currentAttack = Math.max(1, Math.round(creature.currentAttack * 0.4));
      creature.baseHealth = Math.max(1, Math.round(creature.baseHealth * 1.2));
      creature.currentHealth = Math.max(1, Math.round(creature.currentHealth * 1.2));
      creature.maxHealth = Math.max(1, Math.round(creature.maxHealth * 1.2));
    }
  }

  // Boss gets stat boost
  if (isBoss) {
    for (const creature of team) {
      creature.currentHealth = Math.round(creature.currentHealth * 1.3);
      creature.maxHealth = Math.round(creature.maxHealth * 1.3);
      creature.baseHealth = Math.round(creature.baseHealth * 1.3);
      creature.currentAttack = Math.round(creature.currentAttack * 1.2);
      creature.baseAttack = Math.round(creature.baseAttack * 1.2);
    }
  }

  return team;
}

function getTeamSize(nodeRow: number, isBoss: boolean): number {
  if (isBoss) return 2 + Math.floor(Math.random() * 2); // 2-3 (boss + 1-2 allies)
  if (nodeRow === 0) return 2; // First fight is always easy: max 2 enemies
  if (nodeRow <= 3) return 2 + Math.floor(Math.random() * 2); // 2-3
  if (nodeRow <= 8) return 3 + Math.floor(Math.random() * 2); // 3-4
  return 4 + Math.floor(Math.random() * 2); // 4-5
}

function getEnemyTier(zoneId: number, nodeRow: number, isBoss: boolean): number {
  if (zoneId === 1) {
    if (isBoss) return 2;
    if (nodeRow >= 11) return Math.random() < 0.5 ? 2 : 1;
    return 1;
  }
  // Future zones scale accordingly
  return Math.min(zoneId, 4);
}

function pickCreatureTemplate(tribe: Tribe, maxShopTier: number) {
  const allOfTribe = getCreaturesByTribe(tribe);
  const eligible = allOfTribe.filter((t) => t.shopTier <= maxShopTier);

  if (eligible.length === 0) {
    // Fallback: any creature from this tribe
    return allOfTribe.length > 0 ? allOfTribe[Math.floor(Math.random() * allOfTribe.length)] : null;
  }

  return eligible[Math.floor(Math.random() * eligible.length)];
}
