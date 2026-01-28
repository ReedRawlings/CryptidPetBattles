import {
  Pet,
  Ability,
  AbilityTrigger,
  BattleEvent,
  PetTemplate,
} from '../models/types';
import {
  getAbilityValue,
  applyDamage,
  healPet,
  buffAttack,
  buffHealth,
  hasFainted,
  clonePet,
} from '../models/Pet';

/**
 * Context for ability execution during battle
 */
export interface BattleContext {
  playerTeam: Pet[];
  opponentTeam: Pet[];
  events: BattleEvent[];
  timestamp: number;
  pendingSummons: { team: 'player' | 'opponent'; pet: Pet; position: number }[];
}

/**
 * Context for ability execution during shop phase
 */
export interface ShopContext {
  team: Pet[];
  trigger: AbilityTrigger;
  sourcePet: Pet;
  targetPet?: Pet;
}

/**
 * Create a battle event
 */
export function createBattleEvent(
  type: BattleEvent['type'],
  source: string | null,
  target: string | null,
  value: number,
  description: string,
  timestamp: number
): BattleEvent {
  return { type, source, target, value, timestamp, description };
}

/**
 * Get random pet from a team (that hasn't fainted)
 */
export function getRandomPet(team: Pet[]): Pet | null {
  const alive = team.filter((p) => !hasFainted(p));
  if (alive.length === 0) return null;
  return alive[Math.floor(Math.random() * alive.length)];
}

/**
 * Get adjacent allies (pets next to the source pet)
 */
export function getAdjacentAllies(team: Pet[], sourcePet: Pet): Pet[] {
  const index = team.findIndex((p) => p.id === sourcePet.id);
  if (index === -1) return [];

  const adjacent: Pet[] = [];
  if (index > 0 && team[index - 1] && !hasFainted(team[index - 1])) {
    adjacent.push(team[index - 1]);
  }
  if (index < team.length - 1 && team[index + 1] && !hasFainted(team[index + 1])) {
    adjacent.push(team[index + 1]);
  }
  return adjacent;
}

/**
 * Get pet behind (lower index = more to the back)
 */
export function getPetBehind(team: Pet[], sourcePet: Pet): Pet | null {
  const index = team.findIndex((p) => p.id === sourcePet.id);
  if (index === -1 || index === 0) return null;
  const behindPet = team[index - 1];
  return behindPet && !hasFainted(behindPet) ? behindPet : null;
}

/**
 * Execute an ability based on its trigger
 */
export function executeAbility(
  pet: Pet,
  trigger: AbilityTrigger,
  context: BattleContext,
  isPlayerTeam: boolean,
  additionalData?: { attacker?: Pet; killed?: Pet }
): void {
  if (pet.ability.trigger !== trigger && pet.ability.trigger !== 'passive') {
    return;
  }

  const abilityValue = getAbilityValue(pet);
  const myTeam = isPlayerTeam ? context.playerTeam : context.opponentTeam;
  const enemyTeam = isPlayerTeam ? context.opponentTeam : context.playerTeam;

  switch (pet.ability.effect) {
    case 'damage':
      executeDamageAbility(pet, abilityValue, context, myTeam, enemyTeam);
      break;
    case 'heal':
      executeHealAbility(pet, abilityValue, context, myTeam);
      break;
    case 'buff_attack':
      executeBuffAttackAbility(pet, abilityValue, context, myTeam, trigger);
      break;
    case 'buff_health':
      executeBuffHealthAbility(pet, abilityValue, context, myTeam);
      break;
    case 'buff_both':
      executeBuffBothAbility(pet, abilityValue, context, myTeam);
      break;
    case 'summon':
      executeSummonAbility(pet, context, isPlayerTeam);
      break;
    case 'armor':
      executeArmorAbility(pet, abilityValue, context, myTeam);
      break;
    case 'reflect':
      executeReflectAbility(pet, abilityValue, context, additionalData?.attacker);
      break;
  }
}

/**
 * Execute damage ability
 */
function executeDamageAbility(
  pet: Pet,
  value: number,
  context: BattleContext,
  myTeam: Pet[],
  enemyTeam: Pet[]
): void {
  const ability = pet.ability;

  // Special handling for Echo ability (damage × battles participated)
  let totalValue = value;
  if (pet.templateId === 'echo') {
    totalValue = value * Math.max(1, pet.battlesParticipated);
  }

  switch (ability.target) {
    case 'random_enemy': {
      const target = getRandomPet(enemyTeam);
      if (target) {
        const actualDamage = applyDamage(target, totalValue);
        context.events.push(
          createBattleEvent(
            'ability_trigger',
            pet.id,
            target.id,
            actualDamage,
            `${pet.name}'s ${ability.name} deals ${actualDamage} damage to ${target.name}`,
            context.timestamp++
          )
        );
      }
      break;
    }
    case 'all_enemies': {
      const aliveEnemies = enemyTeam.filter((p) => !hasFainted(p));
      for (const target of aliveEnemies) {
        const actualDamage = applyDamage(target, totalValue);
        context.events.push(
          createBattleEvent(
            'ability_trigger',
            pet.id,
            target.id,
            actualDamage,
            `${pet.name}'s ${ability.name} deals ${actualDamage} damage to ${target.name}`,
            context.timestamp++
          )
        );
      }
      break;
    }
    case 'attacker': {
      // This would be used for reflect damage
      break;
    }
  }
}

/**
 * Execute heal ability
 */
function executeHealAbility(
  pet: Pet,
  value: number,
  context: BattleContext,
  myTeam: Pet[]
): void {
  const ability = pet.ability;

  switch (ability.target) {
    case 'self': {
      const actualHeal = healPet(pet, value);
      if (actualHeal > 0) {
        context.events.push(
          createBattleEvent(
            'heal',
            pet.id,
            pet.id,
            actualHeal,
            `${pet.name} heals for ${actualHeal} HP`,
            context.timestamp++
          )
        );
      }
      break;
    }
    case 'all_allies': {
      const aliveAllies = myTeam.filter((p) => !hasFainted(p) && p.id !== pet.id);
      for (const ally of aliveAllies) {
        const actualHeal = healPet(ally, value);
        if (actualHeal > 0) {
          context.events.push(
            createBattleEvent(
              'heal',
              pet.id,
              ally.id,
              actualHeal,
              `${pet.name}'s ${ability.name} heals ${ally.name} for ${actualHeal} HP`,
              context.timestamp++
            )
          );
        }
      }
      break;
    }
    case 'random_ally': {
      const target = getRandomPet(myTeam.filter((p) => p.id !== pet.id));
      if (target) {
        const actualHeal = healPet(target, value);
        if (actualHeal > 0) {
          context.events.push(
            createBattleEvent(
              'heal',
              pet.id,
              target.id,
              actualHeal,
              `${pet.name}'s ${ability.name} heals ${target.name} for ${actualHeal} HP`,
              context.timestamp++
            )
          );
        }
      }
      break;
    }
  }
}

/**
 * Execute buff attack ability
 */
function executeBuffAttackAbility(
  pet: Pet,
  value: number,
  context: BattleContext,
  myTeam: Pet[],
  trigger: AbilityTrigger
): void {
  const ability = pet.ability;
  // onAttack buffs are temporary (for the battle)
  const permanent = trigger !== 'onAttack' && trigger !== 'onKill';

  switch (ability.target) {
    case 'self': {
      buffAttack(pet, value, permanent);
      context.events.push(
        createBattleEvent(
          'buff',
          pet.id,
          pet.id,
          value,
          `${pet.name} gains +${value} ATK`,
          context.timestamp++
        )
      );
      break;
    }
    case 'adjacent_allies': {
      const adjacent = getAdjacentAllies(myTeam, pet);
      for (const ally of adjacent) {
        buffAttack(ally, value, permanent);
        context.events.push(
          createBattleEvent(
            'buff',
            pet.id,
            ally.id,
            value,
            `${pet.name}'s ${ability.name} gives ${ally.name} +${value} ATK`,
            context.timestamp++
          )
        );
      }
      break;
    }
    case 'random_ally': {
      const target = getRandomPet(myTeam.filter((p) => p.id !== pet.id));
      if (target) {
        buffAttack(target, value, permanent);
        context.events.push(
          createBattleEvent(
            'buff',
            pet.id,
            target.id,
            value,
            `${pet.name}'s ${ability.name} gives ${target.name} +${value} ATK`,
            context.timestamp++
          )
        );
      }
      break;
    }
  }
}

/**
 * Execute buff health ability
 */
function executeBuffHealthAbility(
  pet: Pet,
  value: number,
  context: BattleContext,
  myTeam: Pet[]
): void {
  const ability = pet.ability;

  switch (ability.target) {
    case 'self': {
      buffHealth(pet, value);
      context.events.push(
        createBattleEvent(
          'buff',
          pet.id,
          pet.id,
          value,
          `${pet.name} gains +${value} HP`,
          context.timestamp++
        )
      );
      break;
    }
    case 'pet_behind': {
      const behind = getPetBehind(myTeam, pet);
      if (behind) {
        buffHealth(behind, value);
        context.events.push(
          createBattleEvent(
            'buff',
            pet.id,
            behind.id,
            value,
            `${pet.name}'s ${ability.name} gives ${behind.name} +${value} HP`,
            context.timestamp++
          )
        );
      }
      break;
    }
  }
}

/**
 * Execute buff both (attack and health) ability
 */
function executeBuffBothAbility(
  pet: Pet,
  value: number,
  context: BattleContext,
  myTeam: Pet[]
): void {
  const ability = pet.ability;

  switch (ability.target) {
    case 'self': {
      buffAttack(pet, value);
      buffHealth(pet, value);
      context.events.push(
        createBattleEvent(
          'buff',
          pet.id,
          pet.id,
          value,
          `${pet.name} gains +${value}/+${value}`,
          context.timestamp++
        )
      );
      break;
    }
  }
}

/**
 * Execute summon ability
 */
function executeSummonAbility(
  pet: Pet,
  context: BattleContext,
  isPlayerTeam: boolean
): void {
  const myTeam = isPlayerTeam ? context.playerTeam : context.opponentTeam;
  const index = myTeam.findIndex((p) => p.id === pet.id);

  // Define summon data based on pet template
  const summonData = getSummonData(pet.templateId, pet.level);

  for (const summon of summonData) {
    const summonedPet: Pet = {
      id: `${pet.id}-summon-${context.timestamp}`,
      templateId: summon.templateId,
      name: summon.name,
      tier: 1,
      level: 1,
      experience: 0,
      baseAttack: summon.attack,
      baseHealth: summon.health,
      currentAttack: summon.attack,
      currentHealth: summon.health,
      maxHealth: summon.health,
      foodSlot: null,
      battlesParticipated: 0,
      ability: {
        id: 'none',
        name: 'None',
        trigger: 'passive',
        effect: 'buff_attack',
        baseValue: 0,
        target: 'self',
        description: 'No ability',
        levelValues: [0, 0, 0],
      },
      tempAttackBonus: 0,
      tempHealthBonus: 0,
      armor: 0,
      hasReborn: false,
    };

    context.pendingSummons.push({
      team: isPlayerTeam ? 'player' : 'opponent',
      pet: summonedPet,
      position: index,
    });

    context.events.push(
      createBattleEvent(
        'summon',
        pet.id,
        summonedPet.id,
        0,
        `${pet.name} summons a ${summonedPet.name}`,
        context.timestamp++
      )
    );
  }
}

/**
 * Get summon data based on pet template
 */
function getSummonData(
  templateId: string,
  level: number
): { templateId: string; name: string; attack: number; health: number }[] {
  switch (templateId) {
    case 'bee':
      return [
        {
          templateId: 'honeybee',
          name: 'Honeybee',
          attack: level,
          health: level,
        },
      ];
    case 'hydra':
      return [
        {
          templateId: 'hydra_head',
          name: 'Hydra Head',
          attack: level + 1,
          health: level + 3,
        },
        {
          templateId: 'hydra_head',
          name: 'Hydra Head',
          attack: level + 1,
          health: level + 3,
        },
      ];
    default:
      return [];
  }
}

/**
 * Execute armor ability
 */
function executeArmorAbility(
  pet: Pet,
  value: number,
  context: BattleContext,
  myTeam: Pet[]
): void {
  const ability = pet.ability;

  switch (ability.target) {
    case 'pet_behind': {
      const behind = getPetBehind(myTeam, pet);
      if (behind) {
        behind.armor += value;
        context.events.push(
          createBattleEvent(
            'buff',
            pet.id,
            behind.id,
            value,
            `${pet.name}'s ${ability.name} gives ${behind.name} +${value} armor`,
            context.timestamp++
          )
        );
      }
      break;
    }
  }
}

/**
 * Execute reflect damage ability
 */
function executeReflectAbility(
  pet: Pet,
  value: number,
  context: BattleContext,
  attacker?: Pet
): void {
  if (!attacker || hasFainted(attacker)) return;

  const actualDamage = applyDamage(attacker, value);
  context.events.push(
    createBattleEvent(
      'damage',
      pet.id,
      attacker.id,
      actualDamage,
      `${pet.name} reflects ${actualDamage} damage to ${attacker.name}`,
      context.timestamp++
    )
  );
}

/**
 * Handle reborn ability (Phoenix)
 */
export function handleReborn(
  pet: Pet,
  context: BattleContext
): boolean {
  if (pet.templateId === 'phoenix' && !pet.hasReborn) {
    pet.hasReborn = true;
    pet.currentHealth = 1;
    context.events.push(
      createBattleEvent(
        'ability_trigger',
        pet.id,
        pet.id,
        1,
        `${pet.name} is reborn with 1 HP!`,
        context.timestamp++
      )
    );
    return true;
  }
  return false;
}

/**
 * Apply passive abilities (like Golem's damage reduction)
 */
export function applyPassiveAbility(
  pet: Pet,
  incomingDamage: number
): number {
  if (pet.ability.trigger === 'passive' && pet.templateId === 'golem') {
    const reduction = getAbilityValue(pet);
    return Math.max(1, incomingDamage - reduction);
  }
  return incomingDamage;
}

/**
 * Trigger abilities for all pets with a specific trigger
 */
export function triggerAbilitiesForTeam(
  team: Pet[],
  trigger: AbilityTrigger,
  context: BattleContext,
  isPlayerTeam: boolean,
  additionalData?: { attacker?: Pet; killed?: Pet }
): void {
  // Sort by attack (highest first) for consistent ordering
  const sortedTeam = [...team]
    .filter((p) => !hasFainted(p))
    .sort((a, b) => b.currentAttack - a.currentAttack);

  for (const pet of sortedTeam) {
    if (pet.ability.trigger === trigger) {
      executeAbility(pet, trigger, context, isPlayerTeam, additionalData);
    }
  }
}
