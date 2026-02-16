import type { CreatureTemplate, CreatureTierData } from '../types';

/**
 * Compute tier 4 stats by extrapolating the tier 1→2→3 progression.
 * Uses the average stat growth between tiers to project tier 4.
 */
export function computeTier4Data(template: CreatureTemplate): CreatureTierData {
  const t1 = template.tiers['1'].baseStats;
  const t3 = template.tiers['3'].baseStats;

  // Average growth per tier step
  const growthHealth = Math.round((t3.health - t1.health) / 2);
  const growthAttack = Math.round((t3.attack - t1.attack) / 2);
  const growthSpeed = Math.round((t3.speed - t1.speed) / 2);

  return {
    tier: 4,
    stars: '★★★★',
    baseStats: {
      health: t3.health + growthHealth,
      attack: t3.attack + growthAttack,
      speed: t3.speed + growthSpeed,
    },
    // Tier 4 ability defaults to tier 3 ability; overridden per-creature in creatures.json if present
    ability: { ...template.tiers['3'].ability },
  };
}

/**
 * Get tier data for any tier 1-4.
 * Falls back to computed tier 4 if not explicitly defined in the template.
 */
export function getTierData(template: CreatureTemplate, tier: number): CreatureTierData {
  if (tier <= 3) {
    return template.tiers[String(tier) as '1' | '2' | '3'];
  }
  if (template.tiers['4']) {
    return template.tiers['4'];
  }
  return computeTier4Data(template);
}

/**
 * Interpolate stats between two tiers based on progress (0.0 to 1.0).
 * Used by the roguelite leveling system to smoothly scale stats within a tier.
 */
export function interpolateStats(
  template: CreatureTemplate,
  currentTier: number,
  progress: number // 0.0 = start of tier, 1.0 = end of tier (about to tier up)
): { health: number; attack: number; speed: number } {
  const current = getTierData(template, currentTier).baseStats;
  const nextTier = Math.min(currentTier + 1, 4);
  const next = getTierData(template, nextTier).baseStats;

  return {
    health: Math.round(current.health + (next.health - current.health) * progress),
    attack: Math.round(current.attack + (next.attack - current.attack) * progress),
    speed: Math.round(current.speed + (next.speed - current.speed) * progress),
  };
}
