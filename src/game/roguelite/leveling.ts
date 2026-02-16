import type { RogueliteCreature, CreatureTemplate } from '../../types';
import { ROGUELITE_CONSTANTS } from '../../types';
import { getTierData, interpolateStats } from '../../data/tierScaling';

/**
 * Compute the tier for a given level.
 * 0-9 = T1, 10-19 = T2, 20-29 = T3, 30 = T4
 */
export function tierForLevel(level: number): number {
  if (level >= 30) return 4;
  if (level >= 20) return 3;
  if (level >= 10) return 2;
  return 1;
}

/**
 * Award XP to a roguelite creature. Handles level-ups and tier transitions.
 * Returns the updated creature (immutably).
 */
export function awardXP(
  creature: RogueliteCreature,
  template: CreatureTemplate,
  xpAmount: number
): RogueliteCreature {
  let result = { ...creature };
  let remainingXP = xpAmount;

  while (remainingXP > 0) {
    // Can't exceed max level for this creature's ceiling
    const maxLevel = result.tierCeiling * ROGUELITE_CONSTANTS.LEVELS_PER_TIER;
    if (result.level >= maxLevel) break;

    const xpNeeded = result.xpToNextLevel - result.xpCurrent;

    if (remainingXP >= xpNeeded) {
      // Level up!
      remainingXP -= xpNeeded;
      result.level += 1;
      result.xpCurrent = 0;
      result.xpToNextLevel = getXPToNextLevel(result.level);

      // Check for tier-up
      const newTier = tierForLevel(result.level);
      const oldTier = result.tier;

      if (newTier > oldTier && newTier <= result.tierCeiling) {
        result = applyTierUp(result, template, newTier);
      } else {
        // Apply stat interpolation within the current tier
        result = applyLevelStats(result, template);
      }

      // Small heal on level-up: 10% of max HP
      if (!result.isDead) {
        const healAmount = Math.floor(result.maxHealth * 0.1);
        result.currentHealth = Math.min(result.currentHealth + healAmount, result.maxHealth);
      }
    } else {
      result.xpCurrent += remainingXP;
      remainingXP = 0;
    }
  }

  return result;
}

/**
 * Apply a tier-up: set full tier stats and unlock new ability.
 */
function applyTierUp(
  creature: RogueliteCreature,
  template: CreatureTemplate,
  newTier: number
): RogueliteCreature {
  const tierData = getTierData(template, newTier);
  const hpDiff = tierData.baseStats.health - creature.baseHealth;

  return {
    ...creature,
    tier: newTier,
    baseAttack: tierData.baseStats.attack,
    baseHealth: tierData.baseStats.health,
    baseSpeed: tierData.baseStats.speed,
    currentAttack: tierData.baseStats.attack,
    // Preserve HP ratio on tier-up: add the HP difference to current
    currentHealth: Math.min(creature.currentHealth + Math.max(0, hpDiff), tierData.baseStats.health),
    currentSpeed: tierData.baseStats.speed,
    maxHealth: tierData.baseStats.health,
    ability: { ...tierData.ability },
    buffs: [], // Clear buffs on tier-up
  };
}

/**
 * Apply smooth stat interpolation within a tier based on level progress.
 */
function applyLevelStats(
  creature: RogueliteCreature,
  template: CreatureTemplate
): RogueliteCreature {
  const currentTier = tierForLevel(creature.level);
  const levelInTier = creature.level % ROGUELITE_CONSTANTS.LEVELS_PER_TIER;
  const progress = levelInTier / ROGUELITE_CONSTANTS.LEVELS_PER_TIER;

  const stats = interpolateStats(template, currentTier, progress);
  const hpDiff = stats.health - creature.baseHealth;

  return {
    ...creature,
    baseAttack: stats.attack,
    baseHealth: stats.health,
    baseSpeed: stats.speed,
    currentAttack: stats.attack,
    currentHealth: Math.min(creature.currentHealth + Math.max(0, hpDiff), stats.health),
    currentSpeed: stats.speed,
    maxHealth: stats.health,
  };
}

/**
 * Get XP needed for the next level. Can be tuned for difficulty curve.
 */
function getXPToNextLevel(_currentLevel: number): number {
  // Flat XP per level for simplicity; tune later
  return ROGUELITE_CONSTANTS.XP_PER_BATTLE * 2; // ~2 battles per level
}

/**
 * Create a fresh roguelite creature from a template at level 0.
 */
export function createRogueliteCreature(
  template: CreatureTemplate,
  tierCeiling: number,
  teamIndex: number
): RogueliteCreature {
  const tierData = template.tiers['1'];
  const position = teamIndex <= 1 ? 'frontline' : 'backline';
  const slotIndex = teamIndex <= 1 ? teamIndex : teamIndex - 2;
  const lifespanRange = ROGUELITE_CONSTANTS.LIFESPAN[1]; // T1 at creation
  const runsRemaining = lifespanRange.min + Math.floor(Math.random() * (lifespanRange.max - lifespanRange.min + 1));

  return {
    id: `rl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    templateId: template.id,
    name: template.name,
    type: template.type,
    role: template.role,
    shopTier: template.shopTier,
    tier: 1,
    experience: 0,
    baseAttack: tierData.baseStats.attack,
    baseHealth: tierData.baseStats.health,
    baseSpeed: tierData.baseStats.speed,
    currentAttack: tierData.baseStats.attack,
    currentHealth: tierData.baseStats.health,
    currentSpeed: tierData.baseStats.speed,
    maxHealth: tierData.baseStats.health,
    position,
    slotIndex,
    teamIndex,
    ability: { ...tierData.ability },
    buffs: [],
    battlesParticipated: 0,
    // Roguelite-specific
    level: 0,
    xpCurrent: 0,
    xpToNextLevel: getXPToNextLevel(0),
    runsRemaining,
    tierCeiling,
    isDead: false,
  };
}
