import type { RogueliteCreature, BattleResult, RelicInstance } from '../../types';
import { getRelicDefinition } from '../../data/relics';

/**
 * After a roguelite battle, update the team with surviving HP values.
 * Dead creatures (not in remaining) get isDead = true, currentHealth = 0.
 * Surviving creatures get their post-battle HP written back.
 */
export function applyBattleResultToTeam(
  team: (RogueliteCreature | null)[],
  battleResult: BattleResult
): (RogueliteCreature | null)[] {
  return team.map((creature) => {
    if (!creature || creature.isDead) return creature;

    // Find this creature in the surviving team by ID
    const surviving = battleResult.playerTeamRemaining.find(
      (c) => c.id === creature.id
    );

    if (surviving) {
      return {
        ...creature,
        currentHealth: surviving.currentHealth,
        currentAttack: surviving.currentAttack,
        currentSpeed: surviving.currentSpeed,
        battlesParticipated: creature.battlesParticipated + 1,
      };
    } else {
      // Creature died in battle
      return {
        ...creature,
        currentHealth: 0,
        isDead: true,
        battlesParticipated: creature.battlesParticipated + 1,
      };
    }
  });
}

/**
 * Process post-battle relic effects (e.g., Phoenix Down revive).
 * Returns updated team.
 */
export function processPostBattleRelics(
  team: (RogueliteCreature | null)[]
): (RogueliteCreature | null)[] {
  return team.map((creature) => {
    if (!creature) return null;

    // Phoenix Down: revive dead creature with 1 HP
    if (creature.isDead && creature.relic) {
      const relicDef = getRelicDefinition(creature.relic.definitionId);
      if (relicDef) {
        const reviveEffect = relicDef.effects.find(
          (e) => e.type === 'revive' && e.trigger === 'on_battle_end'
        );

        if (reviveEffect && (creature.relic.remainingUses === null || creature.relic.remainingUses > 0)) {
          const newRelic: RelicInstance = creature.relic.remainingUses !== null
            ? { ...creature.relic, remainingUses: creature.relic.remainingUses - 1 }
            : creature.relic;

          // Remove relic if uses exhausted
          const finalRelic = newRelic.remainingUses !== null && newRelic.remainingUses <= 0 ? undefined : newRelic;

          return {
            ...creature,
            currentHealth: reviveEffect.value ?? 1,
            isDead: false,
            relic: finalRelic,
          };
        }
      }
    }

    return creature;
  });
}

/**
 * Check if all team creatures are dead (run over).
 */
export function isTeamWiped(team: (RogueliteCreature | null)[]): boolean {
  return team.every((c) => c === null || c.isDead);
}

/**
 * Heal a creature by a percentage of their max HP.
 */
export function healCreature(
  creature: RogueliteCreature,
  percent: number
): RogueliteCreature {
  if (creature.isDead) return creature;

  const healAmount = Math.round(creature.maxHealth * percent);
  const newHealth = Math.min(creature.currentHealth + healAmount, creature.maxHealth);

  return {
    ...creature,
    currentHealth: newHealth,
  };
}

/**
 * Revive a dead creature at a percentage of max HP.
 */
export function reviveCreature(
  creature: RogueliteCreature,
  hpPercent: number
): RogueliteCreature {
  if (!creature.isDead) return creature;

  return {
    ...creature,
    currentHealth: Math.max(1, Math.round(creature.maxHealth * hpPercent)),
    isDead: false,
  };
}
