import type { RogueliteCreature, CreatureTemplate, CreatureAbility } from '../../types';
import { ROGUELITE_CONSTANTS } from '../../types';
import { getCreatureTemplate } from '../../data/creatures';
import { getTierData } from '../../data/tierScaling';

/**
 * Check if two creatures can breed.
 * Both must be the same species and at max tier for their ceiling.
 */
export function canBreed(a: RogueliteCreature, b: RogueliteCreature): boolean {
  if (a.templateId !== b.templateId) return false;
  if (a.isDead || b.isDead) return false;

  // Both must be at max tier for their ceiling
  const aTierCap = a.tierCeiling;
  const bTierCap = b.tierCeiling;
  if (a.tier < aTierCap) return false;
  if (b.tier < bTierCap) return false;

  return true;
}

/**
 * Compute offspring tier ceiling from parent ceilings.
 * Two maxed T2s → T3 offspring, Two maxed T3s → T4 offspring, etc.
 * If parents are mismatched, the offspring's ceiling is one below what it would be.
 */
export function computeOffspringCeiling(parentACeiling: number, parentBCeiling: number): number {
  const maxParent = Math.max(parentACeiling, parentBCeiling);

  // Both parents same ceiling → offspring ceiling = parent ceiling + 1
  if (parentACeiling === parentBCeiling) {
    return Math.min(maxParent + 1, ROGUELITE_CONSTANTS.MAX_TIER_ROGUELITE);
  }

  // Mismatched: ceiling is one lower than the better case
  return Math.min(maxParent, ROGUELITE_CONSTANTS.MAX_TIER_ROGUELITE);
}

/**
 * Get the abilities available to inherit at each tier from parents.
 * Returns a map of tier → [parentA ability, parentB ability] for tiers both parents reached.
 * The frontier tier (only offspring can reach) will get a random ability.
 */
export function getInheritableAbilities(
  parentA: RogueliteCreature,
  parentB: RogueliteCreature,
  template: CreatureTemplate
): Record<number, { parentA: CreatureAbility | null; parentB: CreatureAbility | null }> {
  const result: Record<number, { parentA: CreatureAbility | null; parentB: CreatureAbility | null }> = {};

  // For each tier up to the max parent tier
  const maxTier = Math.max(parentA.tierCeiling, parentB.tierCeiling);
  for (let t = 1; t <= maxTier; t++) {
    const aAbility = t <= parentA.tier ? getTierData(template, t).ability : null;
    const bAbility = t <= parentB.tier ? getTierData(template, t).ability : null;
    result[t] = { parentA: aAbility, parentB: bAbility };
  }

  return result;
}

/**
 * Breed two creatures. Both parents are consumed.
 * abilityChoices: map of tier → 'a' | 'b' for inherited tiers (player's selection)
 * Returns the offspring with the chosen abilities set.
 */
export function breedCreatures(
  parentA: RogueliteCreature,
  parentB: RogueliteCreature,
  _abilityChoices: Record<number, 'a' | 'b'>
): RogueliteCreature | null {
  if (!canBreed(parentA, parentB)) return null;

  const template = getCreatureTemplate(parentA.templateId);
  if (!template) return null;

  const offspringCeiling = computeOffspringCeiling(parentA.tierCeiling, parentB.tierCeiling);

  // Determine lifespan based on caught/created tier
  // Offspring effectively "starts" at T1 but with higher ceiling
  const lifespanRange = ROGUELITE_CONSTANTS.LIFESPAN[offspringCeiling] ?? ROGUELITE_CONSTANTS.LIFESPAN[1];
  const runsRemaining = lifespanRange.min + Math.floor(Math.random() * (lifespanRange.max - lifespanRange.min + 1));

  const t1Data = template.tiers['1'];

  const offspring: RogueliteCreature = {
    id: `bred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    templateId: template.id,
    name: template.name,
    type: template.type,
    role: template.role,
    shopTier: template.shopTier,
    tier: 1,
    experience: 0,
    baseAttack: t1Data.baseStats.attack,
    baseHealth: t1Data.baseStats.health,
    baseSpeed: t1Data.baseStats.speed,
    currentAttack: t1Data.baseStats.attack,
    currentHealth: t1Data.baseStats.health,
    currentSpeed: t1Data.baseStats.speed,
    maxHealth: t1Data.baseStats.health,
    position: 'frontline',
    slotIndex: 0,
    teamIndex: 0,
    ability: { ...t1Data.ability }, // Starts with T1 ability (will be overridden when tier reached)
    buffs: [],
    battlesParticipated: 0,
    // Roguelite fields
    level: 0,
    xpCurrent: 0,
    xpToNextLevel: 6, // ~2 battles
    runsRemaining,
    tierCeiling: offspringCeiling,
    isDead: false,
    bredFrom: { parentAId: parentA.id, parentBId: parentB.id },
  };

  return offspring;
}
