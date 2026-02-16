import {
  Creature,
  BattleEvent,
  BattleResult,
  GAME_CONSTANTS,
  BuffType,
  BUFF_DEFINITIONS,
  CreatureAbility,
  EffectTarget,
} from '../types';
import {
  applyBuff,
  getEffectiveAttack,
  getEffectiveSpeed,
  getThornsStacks,
  hasTaunt,
  tickBuffs,
  cleanse,
} from './buffs';
import { SPIRIT_BONE_TEMPLATES } from '../data/creatures';
import { getRelicDefinition } from '../data/relics';
import {
  processRelicBattleStart,
  processRelicOnAttack,
  processRelicOnKill,
  processRelicOnFaint,
} from './relicEffects';

// ============================================================
// Battle State
// ============================================================

interface BattleState {
  playerTeam: Creature[];
  opponentTeam: Creature[];
  events: BattleEvent[];
  timestamp: number;
  triggerDepth: number;
}

// ============================================================
// Helpers
// ============================================================

function cloneCreature(c: Creature): Creature {
  return {
    ...c,
    ability: { ...c.ability, effects: c.ability.effects.map((e) => ({ ...e })) },
    buffs: [], // Start fresh — placement triggers re-fire at battle start
    lowHealthTriggered: false,
    relic: c.relic ? { ...c.relic } : undefined,
  };
}

function addEvent(
  state: BattleState,
  type: BattleEvent['type'],
  source: string | null,
  target: string | null,
  value: number,
  description?: string,
  buffType?: BuffType
): void {
  state.events.push({
    type,
    source,
    target,
    value,
    timestamp: state.timestamp++,
    description,
    buffType,
  });
}

function isAlive(c: Creature): boolean {
  return c.currentHealth > 0;
}

function getLivingCreatures(team: Creature[]): Creature[] {
  return team.filter(isAlive);
}

function getTeamFor(creature: Creature, state: BattleState): Creature[] {
  return state.playerTeam.includes(creature) ? state.playerTeam : state.opponentTeam;
}

function getEnemyTeamFor(creature: Creature, state: BattleState): Creature[] {
  return state.playerTeam.includes(creature) ? state.opponentTeam : state.playerTeam;
}

// ============================================================
// Targeting
// ============================================================

/**
 * Select attack target: Taunt > random frontline > random backline
 */
function selectTarget(enemyTeam: Creature[]): Creature | null {
  const living = getLivingCreatures(enemyTeam);
  if (living.length === 0) return null;

  // Priority 1: Taunt
  const taunters = living.filter(hasTaunt);
  if (taunters.length > 0) {
    return taunters[Math.floor(Math.random() * taunters.length)];
  }

  // Priority 2: Random frontline
  const frontline = living.filter((c) => c.position === 'frontline');
  if (frontline.length > 0) {
    return frontline[Math.floor(Math.random() * frontline.length)];
  }

  // Priority 3: Random backline
  const backline = living.filter((c) => c.position === 'backline');
  if (backline.length > 0) {
    return backline[Math.floor(Math.random() * backline.length)];
  }

  return living[Math.floor(Math.random() * living.length)];
}

/**
 * Resolve effect target string to an array of creatures.
 */
function resolveTargets(
  source: Creature,
  targetStr: EffectTarget,
  state: BattleState,
  contextTarget?: Creature
): Creature[] {
  const friendlyTeam = getLivingCreatures(getTeamFor(source, state));
  const enemyTeam = getLivingCreatures(getEnemyTeamFor(source, state));

  switch (targetStr) {
    case 'self':
      return isAlive(source) ? [source] : [];

    case 'all_allies':
      return friendlyTeam;

    case 'all_enemies':
      return enemyTeam;

    case 'random_enemy': {
      if (enemyTeam.length === 0) return [];
      return [enemyTeam[Math.floor(Math.random() * enemyTeam.length)]];
    }

    case 'random_frontline_enemy': {
      const frontline = enemyTeam.filter((c) => c.position === 'frontline');
      const pool = frontline.length > 0 ? frontline : enemyTeam;
      if (pool.length === 0) return [];
      return [pool[Math.floor(Math.random() * pool.length)]];
    }

    case 'nearest_enemy': {
      // Nearest = frontline first, then backline
      const frontline = enemyTeam.filter((c) => c.position === 'frontline');
      if (frontline.length > 0) return [frontline[0]];
      if (enemyTeam.length > 0) return [enemyTeam[0]];
      return [];
    }

    case 'strongest_enemy': {
      if (enemyTeam.length === 0) return [];
      const sorted = [...enemyTeam].sort((a, b) => getEffectiveAttack(b) - getEffectiveAttack(a));
      return [sorted[0]];
    }

    case 'lowest_hp_ally': {
      if (friendlyTeam.length === 0) return [];
      const sorted = [...friendlyTeam].sort((a, b) => a.currentHealth - b.currentHealth);
      return [sorted[0]];
    }

    case 'self_and_nearest_ally': {
      const result: Creature[] = isAlive(source) ? [source] : [];
      const allies = friendlyTeam.filter((c) => c.id !== source.id);
      if (allies.length > 0) {
        // Nearest ally = same row first
        const sameRow = allies.filter((c) => c.position === source.position);
        if (sameRow.length > 0) result.push(sameRow[0]);
        else result.push(allies[0]);
      }
      return result;
    }

    case 'self_and_lowest_ally': {
      const result: Creature[] = isAlive(source) ? [source] : [];
      const allies = friendlyTeam.filter((c) => c.id !== source.id);
      if (allies.length > 0) {
        const sorted = [...allies].sort((a, b) => a.currentHealth - b.currentHealth);
        result.push(sorted[0]);
      }
      return result;
    }

    case 'attacker':
      return contextTarget && isAlive(contextTarget) ? [contextTarget] : [];

    default:
      return [];
  }
}

// ============================================================
// Ability Execution
// ============================================================

/**
 * Execute all effects of an ability on resolved targets.
 * Handles buff/debuff application, damage, healing, cleansing.
 * After applying buffs, checks on_buff/on_debuff triggers (with recursion guard).
 */
function executeAbilityEffects(
  source: Creature,
  ability: CreatureAbility,
  state: BattleState,
  contextTarget?: Creature
): void {
  for (const effect of ability.effects) {
    const targets = resolveTargets(source, effect.target, state, contextTarget);

    for (const target of targets) {
      if (!isAlive(target)) continue;

      const effectType = effect.type;

      // Buff/Debuff application effects
      if (isBuffType(effectType)) {
        const stacks = effect.stacks ?? 1;
        const duration = parseDuration(effect.duration);
        applyBuff(target, effectType as BuffType, stacks, duration, source.id, state.events, state.timestamp++);

        // Check on_buff / on_debuff triggers on the affected creature
        const category = BUFF_DEFINITIONS[effectType as BuffType].category;
        if (category === 'buff' && state.triggerDepth < GAME_CONSTANTS.MAX_TRIGGER_DEPTH) {
          checkAndFireTrigger(target, 'on_buff', state);
        } else if ((category === 'debuff' || category === 'dot') && state.triggerDepth < GAME_CONSTANTS.MAX_TRIGGER_DEPTH) {
          checkAndFireTrigger(target, 'on_debuff', state);
        }
        continue;
      }

      // Damage effects
      if (effectType === 'aoe' || effectType === 'deal_damage') {
        const damage = typeof effect.value === 'number' ? effect.value : 0;
        if (damage > 0) {
          applyDamage(target, damage, state, source);
        }
        continue;
      }

      // Stat modification effects
      if (effectType === 'increase_damage') {
        const value = typeof effect.value === 'number' ? effect.value : 0;
        target.currentAttack = Math.min(target.currentAttack + value, GAME_CONSTANTS.MAX_STAT);
        addEvent(state, 'buff', source.id, target.id, value, `${target.name} gains +${value} ATK`);
        continue;
      }

      if (effectType === 'increase_health') {
        const value = typeof effect.value === 'number' ? effect.value : 0;
        const healAmount = Math.min(value, target.maxHealth - target.currentHealth);
        if (healAmount > 0) {
          target.currentHealth += healAmount;
          addEvent(state, 'heal', source.id, target.id, healAmount, `${target.name} heals for ${healAmount} HP`);
        }
        continue;
      }

      // Cleanse effects
      if (effectType === 'cleanse' || effectType === 'cleanse_dot') {
        const count = effect.value === 'all' ? 'all' : (typeof effect.value === 'number' ? effect.value : 'all');
        cleanse(target, count, state.events, state.timestamp++);
        continue;
      }

      if (effectType === 'cleanse_aoe') {
        // Remove CC-type debuffs (taunt, slow)
        const ccDebuffs = target.buffs.filter(
          (b) => b.type === 'taunt' || b.type === 'slow' || b.type === 'weaken'
        );
        for (const buff of ccDebuffs) {
          const idx = target.buffs.indexOf(buff);
          if (idx !== -1) {
            target.buffs.splice(idx, 1);
            addEvent(state, 'buff_removed', source.id, target.id, 0,
              `${target.name} is cleansed of ${BUFF_DEFINITIONS[buff.type].name}`, buff.type);
          }
        }
        continue;
      }
    }
  }
}

function isBuffType(type: string): boolean {
  return type in BUFF_DEFINITIONS;
}

function parseDuration(duration: number | string | undefined): number | null {
  if (duration === undefined || duration === 'this_combat') return null;
  if (typeof duration === 'number') return duration;
  // Parse "3_turns" -> 3
  const match = String(duration).match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// ============================================================
// Trigger System
// ============================================================

function checkAndFireTrigger(
  creature: Creature,
  triggerType: string,
  state: BattleState,
  contextTarget?: Creature
): void {
  if (!isAlive(creature)) return;
  if (creature.ability.trigger !== triggerType) return;

  state.triggerDepth++;
  addEvent(state, 'ability', creature.id, null, 0, `${creature.name}'s ${creature.ability.name} triggers`);
  executeAbilityEffects(creature, creature.ability, state, contextTarget);
  state.triggerDepth--;
}

// ============================================================
// Damage Application
// ============================================================

function applyDamage(
  target: Creature,
  damage: number,
  state: BattleState,
  attacker?: Creature
): void {
  const finalDamage = Math.max(1, damage);
  target.currentHealth -= finalDamage;

  addEvent(state, 'damage', attacker?.id ?? null, target.id, finalDamage,
    `${target.name} takes ${finalDamage} damage`);

  // Thorns reflection
  if (attacker && isAlive(attacker)) {
    const thorns = getThornsStacks(target);
    if (thorns > 0) {
      const thornsDamage = thorns * GAME_CONSTANTS.THORNS_PER_STACK;
      attacker.currentHealth -= thornsDamage;
      addEvent(state, 'thorns_damage', target.id, attacker.id, thornsDamage,
        `${attacker.name} takes ${thornsDamage} thorns damage`);
    }
  }

  // Check low_health trigger
  if (
    isAlive(target) &&
    !target.lowHealthTriggered &&
    target.currentHealth / target.maxHealth <= GAME_CONSTANTS.LOW_HEALTH_THRESHOLD
  ) {
    target.lowHealthTriggered = true;
    checkAndFireTrigger(target, 'low_health', state, attacker);
  }
}

// ============================================================
// Faint Processing
// ============================================================

function processFaints(state: BattleState): void {
  let hadFaints = true;

  // Loop to handle chain reactions (e.g. ally_dies triggers causing more faints)
  while (hadFaints) {
    hadFaints = false;

    for (const team of [state.playerTeam, state.opponentTeam]) {
      const enemyTeam = team === state.playerTeam ? state.opponentTeam : state.playerTeam;
      const fainted = team.filter((c) => c.currentHealth <= 0);

      for (const creature of fainted) {
        hadFaints = true;
        addEvent(state, 'faint', creature.id, null, 0, `${creature.name} faints`);

        // Relic on_faint effects (Spirit Anchor etc.)
        processRelicOnFaint(creature, team, state.events, state.timestamp);

        // Spirit passive: summon Bone on faint (only for non-summoned Spirit creatures)
        if (creature.type === 'Spirit' && creature.templateId !== 'bone') {
          const spiritCount = team.filter((c) => c.type === 'Spirit' && isAlive(c)).length +
            team.filter((c) => c.type === 'Spirit' && c.currentHealth <= 0 && c.id === creature.id).length;
          const boneStats = getBoneStats(spiritCount);
          if (boneStats) {
            const bone = createBoneSummon(boneStats, creature, state);
            const insertIdx = team.indexOf(creature);
            team.splice(insertIdx + 1, 0, bone);
            addEvent(state, 'summon', creature.id, bone.id, 0,
              `${creature.name} summons a Bone (${bone.currentAttack}/${bone.currentHealth})`);
          }
        }

        // Dessert passive: damage enemies on faint
        const dessertCount = team.filter((c) => c.type === 'Dessert').length;
        if (creature.type === 'Dessert') {
          const dessertDamage = getDessertFaintDamage(dessertCount);
          if (dessertDamage > 0) {
            const livingEnemies = getLivingCreatures(enemyTeam);
            if (dessertCount >= 5) {
              // Damage all enemies
              for (const enemy of livingEnemies) {
                applyDamage(enemy, dessertDamage, state, creature);
              }
            } else if (livingEnemies.length > 0) {
              // Damage random enemy
              const randomEnemy = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
              applyDamage(randomEnemy, dessertDamage, state, creature);
            }
          }
        }

        // Fire ally_dies triggers for living teammates
        const livingAllies = team.filter((c) => isAlive(c) && c.id !== creature.id);
        for (const ally of livingAllies) {
          checkAndFireTrigger(ally, 'ally_dies', state, creature);
        }

        // Remove dead creature from team
        const idx = team.indexOf(creature);
        if (idx !== -1) team.splice(idx, 1);
      }
    }
  }
}

function getBoneStats(spiritCount: number): { health: number; attack: number; speed: number } | null {
  if (spiritCount >= 5) return SPIRIT_BONE_TEMPLATES[5];
  if (spiritCount >= 3) return SPIRIT_BONE_TEMPLATES[3];
  if (spiritCount >= 2) return SPIRIT_BONE_TEMPLATES[2];
  return null;
}

function getDessertFaintDamage(dessertCount: number): number {
  if (dessertCount >= 5) return 5;
  if (dessertCount >= 3) return 3;
  if (dessertCount >= 2) return 2;
  return 0;
}

function createBoneSummon(
  stats: { health: number; attack: number; speed: number },
  summoner: Creature,
  _state: BattleState
): Creature {
  return {
    id: `bone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    templateId: 'bone',
    name: 'Bone',
    type: 'Spirit',
    role: 'brawler',
    shopTier: 0,
    tier: 1,
    experience: 0,
    baseAttack: stats.attack,
    baseHealth: stats.health,
    baseSpeed: stats.speed,
    currentAttack: stats.attack,
    currentHealth: stats.health,
    currentSpeed: stats.speed,
    maxHealth: stats.health,
    position: summoner.position,
    slotIndex: summoner.slotIndex,
    teamIndex: summoner.teamIndex,
    ability: {
      name: 'None',
      id: 'ability_bone',
      trigger: 'passive',
      description: 'No ability',
      effects: [],
    },
    buffs: [],
    battlesParticipated: 0,
  };
}

// ============================================================
// Tribe Passives (battle start)
// ============================================================

function getThresholdReductions(team: Creature[]): Record<string, number> {
  const reductions: Record<string, number> = {};
  for (const c of team) {
    if (!c.relic) continue;
    const relicDef = getRelicDefinition(c.relic.definitionId);
    if (!relicDef) continue;
    for (const effect of relicDef.effects) {
      if (effect.type === 'tribe_threshold_reduce' && effect.condition?.tribe) {
        const tribe = effect.condition.tribe;
        reductions[tribe] = (reductions[tribe] || 0) + (effect.value ?? 0);
      }
    }
  }
  return reductions;
}

function applyTribePassives(team: Creature[]): void {
  const tribeCounts: Record<string, number> = {};
  for (const c of team) {
    tribeCounts[c.type] = (tribeCounts[c.type] || 0) + 1;
  }

  const reductions = getThresholdReductions(team);

  // Flora: +HP to Flora creatures
  const floraCount = tribeCounts['Flora'] || 0;
  const floraThreshold = Math.max(1, 2 - (reductions['Flora'] || 0));
  if (floraCount >= floraThreshold) {
    const hpBonus = floraCount >= (floraThreshold + 1) ? 4 : 2;
    for (const c of team) {
      if (c.type === 'Flora') {
        c.currentHealth += hpBonus;
        c.maxHealth += hpBonus;
      }
    }
  }

  // Fauna: +ATK to Fauna creatures
  const faunaCount = tribeCounts['Fauna'] || 0;
  const faunaThreshold = Math.max(1, 2 - (reductions['Fauna'] || 0));
  if (faunaCount >= faunaThreshold) {
    const atkBonus = faunaCount >= 5 ? 3 : faunaCount >= 3 ? 2 : 1;
    for (const c of team) {
      if (c.type === 'Fauna') {
        c.currentAttack += atkBonus;
      }
    }
  }
}

// ============================================================
// Main Battle Resolution
// ============================================================

export function resolveBattle(playerTeam: Creature[], opponentTeam: Creature[]): BattleResult {
  // 1. Clone both teams
  const state: BattleState = {
    playerTeam: playerTeam.filter((c) => c !== null).map(cloneCreature),
    opponentTeam: opponentTeam.filter((c) => c !== null).map(cloneCreature),
    events: [],
    timestamp: 0,
    triggerDepth: 0,
  };

  addEvent(state, 'battleStart', null, null, 0, 'Battle begins!');

  // 2. Apply tribe passives
  applyTribePassives(state.playerTeam);
  applyTribePassives(state.opponentTeam);

  // 2b. Apply relic battle-start effects
  processRelicBattleStart(state.playerTeam, state.opponentTeam, state.events, state.timestamp);
  processRelicBattleStart(state.opponentTeam, state.playerTeam, state.events, state.timestamp);

  // 3. Fire position triggers (all creatures sorted by speed)
  const allCreatures = [...state.playerTeam, ...state.opponentTeam]
    .sort((a, b) => getEffectiveSpeed(b) - getEffectiveSpeed(a));

  for (const creature of allCreatures) {
    if (!isAlive(creature)) continue;
    // Fire position-based triggers
    if (creature.position === 'frontline') {
      checkAndFireTrigger(creature, 'frontline', state);
    } else {
      checkAndFireTrigger(creature, 'backline', state);
    }
    // Fire on_placement trigger (works for any position)
    checkAndFireTrigger(creature, 'on_placement', state);
  }

  // 4. Process faints from position triggers
  processFaints(state);

  // 5. Combat rounds
  for (let round = 0; round < GAME_CONSTANTS.MAX_BATTLE_ROUNDS; round++) {
    const livingPlayer = getLivingCreatures(state.playerTeam);
    const livingOpponent = getLivingCreatures(state.opponentTeam);

    if (livingPlayer.length === 0 || livingOpponent.length === 0) break;

    addEvent(state, 'round_start', null, null, round + 1, `Round ${round + 1}`);

    // 5a. Tick DoTs + buff durations
    for (const creature of [...state.playerTeam, ...state.opponentTeam]) {
      if (isAlive(creature)) {
        tickBuffs(creature, state.events, state.timestamp++);
      }
    }

    // 5b. Process faints from DoTs
    processFaints(state);
    if (getLivingCreatures(state.playerTeam).length === 0 || getLivingCreatures(state.opponentTeam).length === 0) break;

    // 5c. Fire passive triggers
    for (const creature of [...state.playerTeam, ...state.opponentTeam]) {
      if (isAlive(creature)) {
        checkAndFireTrigger(creature, 'passive', state);
      }
    }

    // 5d. Process faints from passives
    processFaints(state);
    if (getLivingCreatures(state.playerTeam).length === 0 || getLivingCreatures(state.opponentTeam).length === 0) break;

    // 5e. Build initiative queue
    const allLiving = [
      ...getLivingCreatures(state.playerTeam),
      ...getLivingCreatures(state.opponentTeam),
    ];

    // Assign random tiebreak values upfront for stable, unbiased sorting
    const tiebreaks = new Map<string, number>();
    for (const c of allLiving) {
      tiebreaks.set(c.id, Math.random());
    }

    allLiving.sort((a, b) => {
      const speedDiff = getEffectiveSpeed(b) - getEffectiveSpeed(a);
      if (speedDiff !== 0) return speedDiff;
      // Tiebreak: frontline > backline
      const posA = a.position === 'frontline' ? 1 : 0;
      const posB = b.position === 'frontline' ? 1 : 0;
      if (posB !== posA) return posB - posA;
      // Tiebreak: random (pre-assigned for stable sort)
      return (tiebreaks.get(a.id) ?? 0) - (tiebreaks.get(b.id) ?? 0);
    });

    addEvent(state, 'initiative', null, null, allLiving.length,
      `Initiative: ${allLiving.map((c) => c.name).join(', ')}`);

    // 5f. Each creature takes a turn
    for (const attacker of allLiving) {
      if (!isAlive(attacker)) continue;

      const enemyTeam = getEnemyTeamFor(attacker, state);
      const target = selectTarget(enemyTeam);
      if (!target) continue;

      // Attack
      const damage = getEffectiveAttack(attacker);
      addEvent(state, 'attack', attacker.id, target.id, damage,
        `${attacker.name} attacks ${target.name} for ${damage}`);

      applyDamage(target, damage, state, attacker);

      // Relic on_attack effects (Chain Lightning etc.)
      processRelicOnAttack(attacker, target, enemyTeam, state.events, state.timestamp);

      // Check for kill
      if (!isAlive(target)) {
        checkAndFireTrigger(attacker, 'on_kill', state, target);
        processRelicOnKill(attacker, state.events, state.timestamp);
      }

      // Process faints after each attack
      processFaints(state);

      if (getLivingCreatures(state.playerTeam).length === 0 || getLivingCreatures(state.opponentTeam).length === 0) break;
    }
  }

  // 6. Determine winner
  const livingPlayer = getLivingCreatures(state.playerTeam);
  const livingOpponent = getLivingCreatures(state.opponentTeam);

  let winner: 'player' | 'opponent' | 'draw';
  let damageDealt = 0;

  if (livingPlayer.length > 0 && livingOpponent.length === 0) {
    winner = 'player';
    damageDealt = livingPlayer.reduce((sum, c) => sum + c.shopTier, 0);
  } else if (livingOpponent.length > 0 && livingPlayer.length === 0) {
    winner = 'opponent';
    damageDealt = livingOpponent.reduce((sum, c) => sum + c.shopTier, 0);
  } else {
    winner = 'draw';
  }

  addEvent(state, 'battleEnd', null, null, damageDealt,
    winner === 'draw' ? 'Battle ends in a draw!' : `${winner === 'player' ? 'Player' : 'Opponent'} wins!`);

  return {
    winner,
    playerTeamRemaining: livingPlayer,
    opponentTeamRemaining: livingOpponent,
    events: state.events,
    damageDealt,
  };
}

/**
 * Increment battles participated for all creatures after battle.
 */
export function incrementBattlesParticipated(team: (Creature | null)[]): void {
  team.forEach((creature) => {
    if (creature) {
      creature.battlesParticipated++;
    }
  });
}
