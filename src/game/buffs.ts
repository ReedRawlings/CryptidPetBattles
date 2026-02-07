import {
  Creature,
  BuffType,
  BuffInstance,
  BattleEvent,
  BUFF_DEFINITIONS,
  GAME_CONSTANTS,
} from '../types';

// ============================================================
// Helpers
// ============================================================

function isBuffType(type: string): boolean {
  return type in BUFF_DEFINITIONS;
}

// ============================================================
// Permanent Buff Application (shop phase)
// ============================================================

/**
 * Apply a permanent buff to a creature (persists across battles).
 * Used for placement triggers during the shop phase.
 */
export function applyPermanentBuff(creature: Creature, buffType: BuffType, stacks: number): void {
  const def = BUFF_DEFINITIONS[buffType];
  const existing = creature.buffs.find((b) => b.type === buffType && b.permanent);

  if (existing && def.stackable) {
    existing.stacks = stacks; // Set to exact value (not additive, since we strip and re-apply)
  } else if (!existing) {
    creature.buffs.push({
      type: buffType,
      stacks,
      remainingTurns: null,
      sourceId: creature.id,
      permanent: true,
    });
  }

  // Gigantify: immediate HP boost
  if (buffType === 'gigantify') {
    const hpGain = stacks * GAME_CONSTANTS.GIGANTIFY_HP_PER_STACK;
    creature.maxHealth += hpGain;
    creature.currentHealth += hpGain;
  }
}

/**
 * Apply placement buffs based on creature's ability trigger and position.
 * Strips old permanent buffs first, then applies matching self-targeting effects.
 */
export function applyPlacementBuffs(creature: Creature): void {
  // Strip old permanent buffs
  creature.buffs = creature.buffs.filter((b) => !b.permanent);

  const trigger = creature.ability.trigger;
  const matchesPosition =
    trigger === 'on_placement' ||
    (trigger === 'frontline' && creature.position === 'frontline') ||
    (trigger === 'backline' && creature.position === 'backline');

  if (!matchesPosition) return;

  for (const effect of creature.ability.effects) {
    if (isBuffType(effect.type) && effect.target === 'self') {
      applyPermanentBuff(creature, effect.type as BuffType, effect.stacks ?? 1);
    }
  }
}

/**
 * Apply a buff/debuff to a creature. If the buff already exists and is stackable, add stacks.
 * Gigantify immediately increases HP.
 */
export function applyBuff(
  creature: Creature,
  buffType: BuffType,
  stacks: number,
  duration: number | null,
  sourceId: string,
  events: BattleEvent[],
  timestamp: number
): void {
  const def = BUFF_DEFINITIONS[buffType];
  const existing = creature.buffs.find((b) => b.type === buffType);

  if (existing && def.stackable) {
    existing.stacks += stacks;
    // Refresh duration if the new one is longer
    if (duration !== null && (existing.remainingTurns === null || duration > existing.remainingTurns)) {
      existing.remainingTurns = duration;
    }
  } else if (existing && !def.stackable) {
    // Refresh duration for non-stackable buffs (like taunt)
    if (duration !== null) {
      existing.remainingTurns = duration;
    }
  } else {
    const newBuff: BuffInstance = {
      type: buffType,
      stacks,
      remainingTurns: duration,
      sourceId,
    };
    creature.buffs.push(newBuff);
  }

  // Gigantify: immediately apply HP boost
  if (buffType === 'gigantify') {
    const hpGain = stacks * GAME_CONSTANTS.GIGANTIFY_HP_PER_STACK;
    creature.maxHealth += hpGain;
    creature.currentHealth += hpGain;
  }

  const eventType = def.category === 'buff' ? 'buff_applied' : 'debuff_applied';
  events.push({
    type: eventType,
    source: sourceId,
    target: creature.id,
    value: stacks,
    timestamp,
    description: `${creature.name} gains ${stacks} stack(s) of ${def.name}`,
    buffType,
  });
}

/**
 * Remove a specific buff type from a creature.
 */
export function removeBuff(
  creature: Creature,
  buffType: BuffType,
  events: BattleEvent[],
  timestamp: number
): void {
  const index = creature.buffs.findIndex((b) => b.type === buffType);
  if (index === -1) return;

  creature.buffs.splice(index, 1);

  events.push({
    type: 'buff_removed',
    source: null,
    target: creature.id,
    value: 0,
    timestamp,
    description: `${creature.name} loses ${BUFF_DEFINITIONS[buffType].name}`,
    buffType,
  });
}

/**
 * Cleanse debuffs/dots from a creature.
 * @param count number of debuffs to remove, or 'all'
 */
export function cleanse(
  creature: Creature,
  count: number | 'all',
  events: BattleEvent[],
  timestamp: number
): void {
  const debuffsAndDots = creature.buffs.filter(
    (b) => BUFF_DEFINITIONS[b.type].category === 'debuff' || BUFF_DEFINITIONS[b.type].category === 'dot'
  );

  const toRemove = count === 'all' ? debuffsAndDots : debuffsAndDots.slice(0, count);

  for (const buff of toRemove) {
    removeBuff(creature, buff.type, events, timestamp);
  }
}

/**
 * Get effective attack considering strengthen/weaken buffs.
 */
export function getEffectiveAttack(creature: Creature): number {
  let attack = creature.currentAttack;

  const strengthen = creature.buffs.find((b) => b.type === 'strengthen');
  if (strengthen) {
    attack += strengthen.stacks * GAME_CONSTANTS.STRENGTHEN_PER_STACK;
  }

  const weaken = creature.buffs.find((b) => b.type === 'weaken');
  if (weaken) {
    attack -= weaken.stacks * GAME_CONSTANTS.WEAKEN_PER_STACK;
  }

  return Math.max(1, attack);
}

/**
 * Get effective speed considering haste/slow buffs.
 */
export function getEffectiveSpeed(creature: Creature): number {
  let speed = creature.currentSpeed;

  const haste = creature.buffs.find((b) => b.type === 'haste');
  if (haste) {
    speed += haste.stacks * GAME_CONSTANTS.HASTE_PER_STACK;
  }

  const slow = creature.buffs.find((b) => b.type === 'slow');
  if (slow) {
    speed -= slow.stacks * GAME_CONSTANTS.SLOW_PER_STACK;
  }

  return Math.max(0.5, speed);
}

/**
 * Get thorns stack count for a creature.
 */
export function getThornsStacks(creature: Creature): number {
  const thorns = creature.buffs.find((b) => b.type === 'thorns');
  return thorns ? thorns.stacks : 0;
}

/**
 * Check if creature has an active taunt buff.
 */
export function hasTaunt(creature: Creature): boolean {
  return creature.buffs.some((b) => b.type === 'taunt');
}

/**
 * Process DoT damage and decrement buff durations.
 * Burns: stacks * 2 damage per turn
 * Poison: stacks * 2 damage per turn
 * Bleed: stacks * 0.5% maxHP per turn
 * Then decrement turn-based durations and remove expired buffs.
 */
export function tickBuffs(
  creature: Creature,
  events: BattleEvent[],
  timestamp: number
): void {
  // Process DoTs
  for (const buff of [...creature.buffs]) {
    if (buff.type === 'burn') {
      const damage = buff.stacks * GAME_CONSTANTS.BURN_PER_STACK;
      creature.currentHealth -= damage;
      events.push({
        type: 'dot_tick',
        source: buff.sourceId,
        target: creature.id,
        value: damage,
        timestamp,
        description: `${creature.name} takes ${damage} burn damage`,
        buffType: 'burn',
      });
    } else if (buff.type === 'poison') {
      const damage = buff.stacks * GAME_CONSTANTS.POISON_PER_STACK;
      creature.currentHealth -= damage;
      events.push({
        type: 'dot_tick',
        source: buff.sourceId,
        target: creature.id,
        value: damage,
        timestamp,
        description: `${creature.name} takes ${damage} poison damage`,
        buffType: 'poison',
      });
    } else if (buff.type === 'bleed') {
      const damage = Math.max(1, Math.floor(creature.maxHealth * buff.stacks * GAME_CONSTANTS.BLEED_PER_STACK));
      creature.currentHealth -= damage;
      events.push({
        type: 'dot_tick',
        source: buff.sourceId,
        target: creature.id,
        value: damage,
        timestamp,
        description: `${creature.name} takes ${damage} bleed damage`,
        buffType: 'bleed',
      });
    }
  }

  // Decrement turn-based durations and remove expired buffs
  const expired: BuffType[] = [];
  for (const buff of creature.buffs) {
    if (buff.remainingTurns !== null) {
      buff.remainingTurns--;
      if (buff.remainingTurns <= 0) {
        expired.push(buff.type);
      }
    }
  }

  for (const buffType of expired) {
    removeBuff(creature, buffType, events, timestamp);
  }
}
