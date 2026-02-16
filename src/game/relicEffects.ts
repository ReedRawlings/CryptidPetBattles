import type { Creature, BattleEvent } from '../types';
import { getRelicDefinition } from '../data/relics';
import { applyBuff, getEffectiveAttack } from './buffs';

/**
 * Process relic effects at battle start for all creatures on a team.
 * Called after tribe passives in resolveBattle().
 */
export function processRelicBattleStart(
  team: Creature[],
  _enemyTeam: Creature[],
  events: BattleEvent[],
  timestamp: number
): void {
  // Collect all relics on the team
  const relicBearers = team.filter((c) => c.relic);

  for (const creature of relicBearers) {
    if (!creature.relic) continue;
    const relicDef = getRelicDefinition(creature.relic.definitionId);
    if (!relicDef) continue;

    for (const effect of relicDef.effects) {
      if (effect.trigger !== 'on_battle_start') continue;

      switch (effect.type) {
        case 'position_hp_percent': {
          // Rock Lobster: +20% HP to frontline
          const targetPos = effect.condition?.position;
          const targets = targetPos
            ? team.filter((c) => c.position === targetPos)
            : [creature];
          const percent = effect.value ?? 0;

          for (const target of targets) {
            const hpBoost = Math.round(target.maxHealth * percent);
            target.maxHealth += hpBoost;
            target.currentHealth += hpBoost;
            target.baseHealth += hpBoost;
            events.push({
              type: 'buff_applied',
              source: creature.id,
              target: target.id,
              value: hpBoost,
              timestamp: timestamp++,
              description: `${relicDef.name}: ${target.name} gains +${hpBoost} HP`,
            });
          }
          break;
        }
        case 'tribe_buff': {
          // Touch Grass: Flora allies gain Thorns 1
          const tribe = effect.condition?.tribe;
          const targets = tribe
            ? team.filter((c) => c.type === tribe)
            : [creature];

          for (const target of targets) {
            if (effect.buffType) {
              applyBuff(target, effect.buffType, effect.value ?? 1, null, creature.id, events, timestamp++);
            }
          }
          break;
        }
        case 'conditional_buff': {
          // Mog: full HP creatures gain Haste 1
          const targets = effect.condition?.fullHealth
            ? team.filter((c) => c.currentHealth >= c.maxHealth)
            : [creature];

          for (const target of targets) {
            if (effect.buffType) {
              applyBuff(target, effect.buffType, effect.value ?? 1, null, creature.id, events, timestamp++);
            }
          }
          break;
        }
        case 'self_buff': {
          // Thorn Mail: self gains Thorns 2
          if (effect.buffType) {
            applyBuff(creature, effect.buffType, effect.value ?? 1, null, creature.id, events, timestamp++);
          }
          break;
        }
      }
    }

    // Passive stat mods (Red Meat: +10% ATK to Fauna)
    for (const effect of relicDef.effects) {
      if (effect.trigger !== 'passive') continue;

      if (effect.type === 'tribe_atk_percent') {
        const tribe = effect.condition?.tribe;
        const targets = tribe ? team.filter((c) => c.type === tribe) : [creature];
        const percent = effect.value ?? 0;

        for (const target of targets) {
          const atkBoost = Math.round(target.baseAttack * percent);
          target.currentAttack += atkBoost;
          target.baseAttack += atkBoost;
        }
      }
    }
  }
}

/**
 * Process on_attack relic effects (e.g., Chain Lightning).
 * Called after each attack resolves in the battle loop.
 */
export function processRelicOnAttack(
  attacker: Creature,
  _target: Creature,
  enemyTeam: Creature[],
  events: BattleEvent[],
  timestamp: number
): void {
  if (!attacker.relic) return;

  const relicDef = getRelicDefinition(attacker.relic.definitionId);
  if (!relicDef) return;

  for (const effect of relicDef.effects) {
    if (effect.trigger !== 'on_attack') continue;

    if (effect.type === 'chain_damage') {
      // Chain Lightning: deal 10% of attack to a random enemy
      const livingEnemies = enemyTeam.filter((c) => c.currentHealth > 0 && c.id !== _target.id);
      if (livingEnemies.length === 0) continue;

      const chainTarget = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
      const chainDamage = Math.max(1, Math.round(getEffectiveAttack(attacker) * (effect.value ?? 0.1)));

      chainTarget.currentHealth -= chainDamage;

      events.push({
        type: 'damage',
        source: attacker.id,
        target: chainTarget.id,
        value: chainDamage,
        timestamp: timestamp++,
        description: `Chain Lightning: ${chainTarget.name} takes ${chainDamage} chain damage`,
      });
    }
  }
}

/**
 * Process on_kill relic effects (e.g., Vampiric Fang).
 */
export function processRelicOnKill(
  killer: Creature,
  events: BattleEvent[],
  timestamp: number
): void {
  if (!killer.relic) return;

  const relicDef = getRelicDefinition(killer.relic.definitionId);
  if (!relicDef) return;

  for (const effect of relicDef.effects) {
    if (effect.trigger !== 'on_kill') continue;

    if (effect.type === 'heal_on_kill') {
      const healAmount = effect.value ?? 0;
      killer.currentHealth = Math.min(killer.currentHealth + healAmount, killer.maxHealth);

      events.push({
        type: 'heal',
        source: killer.id,
        target: killer.id,
        value: healAmount,
        timestamp: timestamp++,
        description: `${relicDef.name}: ${killer.name} heals for ${healAmount}`,
      });
    }
  }
}

/**
 * Process on_faint relic effects (e.g., Spirit Anchor).
 */
export function processRelicOnFaint(
  _faintedCreature: Creature,
  team: Creature[],
  events: BattleEvent[],
  timestamp: number
): void {
  // Check all team relics for on_faint effects
  for (const ally of team) {
    if (!ally.relic || ally.currentHealth <= 0) continue;

    const relicDef = getRelicDefinition(ally.relic.definitionId);
    if (!relicDef) continue;

    for (const effect of relicDef.effects) {
      if (effect.trigger !== 'on_faint') continue;

      if (effect.type === 'team_buff_on_faint') {
        // Spirit Anchor: all allies gain Strengthen 1
        const targets = team.filter((c) => c.currentHealth > 0);
        for (const target of targets) {
          if (effect.buffType) {
            applyBuff(target, effect.buffType, effect.value ?? 1, null, ally.id, events, timestamp++);
          }
        }
      }
    }
  }
}
