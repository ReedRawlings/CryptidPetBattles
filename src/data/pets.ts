import { PetTemplate } from '../types';

export const PET_TEMPLATES: PetTemplate[] = [
  // Tier 1
  {
    id: 'puppy',
    name: 'Puppy',
    tier: 1,
    baseAttack: 2,
    baseHealth: 3,
    emoji: '🐕',
    ability: {
      trigger: 'onFriendSummoned',
      effect: 'gainAttack',
      baseValue: 1,
      target: 'self',
      description: 'When a friend is summoned, gain +1/+1',
      scaling: [1, 2, 3],
    },
  },
  {
    id: 'crab',
    name: 'Crab',
    tier: 1,
    baseAttack: 2,
    baseHealth: 2,
    emoji: '🦀',
    ability: {
      trigger: 'onHurt',
      effect: 'dealDamage',
      baseValue: 1,
      target: 'attacker',
      description: 'When hurt, deal 1 damage to attacker',
      scaling: [1, 2, 3],
    },
  },
  {
    id: 'bee',
    name: 'Bee',
    tier: 1,
    baseAttack: 2,
    baseHealth: 1,
    emoji: '🐝',
    ability: {
      trigger: 'onFaint',
      effect: 'summon',
      baseValue: 1,
      target: 'self',
      description: 'On faint, summon 1 Honeybee (stats scale with level)',
      scaling: [1, 1, 2], // Summon count: 1, 1, 2. Stats: 1/1, 2/2, 3/3
    },
  },
  // Tier 2
  {
    id: 'wolf',
    name: 'Wolf',
    tier: 2,
    baseAttack: 3,
    baseHealth: 3,
    emoji: '🐺',
    ability: {
      trigger: 'startOfBattle',
      effect: 'gainAttack',
      baseValue: 1,
      target: 'adjacentAllies',
      description: 'Start of battle: give adjacent allies +1 ATK',
      scaling: [1, 2, 3],
    },
  },
  {
    id: 'turtle',
    name: 'Turtle',
    tier: 2,
    baseAttack: 2,
    baseHealth: 4,
    emoji: '🐢',
    ability: {
      trigger: 'onFaint',
      effect: 'giveArmor',
      baseValue: 2,
      target: 'petBehind',
      description: 'On faint, give pet behind +2 armor',
      scaling: [2, 3, 4],
    },
  },
  {
    id: 'crow',
    name: 'Crow',
    tier: 2,
    baseAttack: 3,
    baseHealth: 2,
    emoji: '🐦‍⬛',
    ability: {
      trigger: 'onEnemyFaint',
      effect: 'gainAttack',
      baseValue: 1,
      target: 'self',
      description: 'When an enemy faints, gain +1 ATK this battle',
      scaling: [1, 2, 3],
    },
  },
  // Tier 3
  {
    id: 'berserker',
    name: 'Berserker',
    tier: 3,
    baseAttack: 3,
    baseHealth: 4,
    emoji: '🪓',
    ability: {
      trigger: 'onAttack',
      effect: 'gainAttack',
      baseValue: 1,
      target: 'self',
      description: 'On attack, gain +1 ATK for this battle',
      scaling: [1, 2, 3],
    },
  },
  {
    id: 'echo',
    name: 'Echo',
    tier: 3,
    baseAttack: 2,
    baseHealth: 5,
    emoji: '🔮',
    ability: {
      trigger: 'startOfBattle',
      effect: 'dealDamage',
      baseValue: 3,
      target: 'randomEnemy',
      description: 'Start of battle: deal 3 damage × battles participated',
      scaling: [3, 4, 5],
    },
  },
  {
    id: 'golem',
    name: 'Golem',
    tier: 3,
    baseAttack: 2,
    baseHealth: 6,
    emoji: '🗿',
    ability: {
      trigger: 'passive',
      effect: 'reduceIncomingDamage',
      baseValue: 2,
      target: 'self',
      description: 'Takes 2 less damage from all attacks (min 1)',
      scaling: [2, 3, 4],
    },
  },
  // Tier 4
  {
    id: 'pure',
    name: 'Pure',
    tier: 4,
    baseAttack: 3,
    baseHealth: 4,
    emoji: '✨',
    ability: {
      trigger: 'onFaint',
      effect: 'heal',
      baseValue: 3,
      target: 'allAllies',
      description: 'On faint, heal all allies for 3 HP',
      scaling: [3, 5, 7],
    },
  },
  {
    id: 'vampire',
    name: 'Vampire',
    tier: 4,
    baseAttack: 4,
    baseHealth: 4,
    emoji: '🧛',
    ability: {
      trigger: 'onKill',
      effect: 'heal',
      baseValue: 2,
      target: 'self',
      description: 'On kill, heal +2 HP',
      scaling: [2, 3, 4],
    },
  },
  {
    id: 'snake',
    name: 'Snake',
    tier: 4,
    baseAttack: 5,
    baseHealth: 3,
    emoji: '🐍',
    ability: {
      trigger: 'onFriendAttack',
      effect: 'dealDamage',
      baseValue: 3,
      target: 'randomEnemy',
      description: 'When a friend attacks, deal 3 damage to random enemy',
      scaling: [3, 5, 7],
    },
  },
  // Tier 5
  {
    id: 'dragon',
    name: 'Dragon',
    tier: 5,
    baseAttack: 6,
    baseHealth: 6,
    emoji: '🐉',
    ability: {
      trigger: 'startOfBattle',
      effect: 'dealDamage',
      baseValue: 4,
      target: 'allEnemies',
      description: 'Start of battle: deal 4 damage to ALL enemies',
      scaling: [4, 5, 6],
    },
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    tier: 5,
    baseAttack: 5,
    baseHealth: 5,
    emoji: '🦅',
    ability: {
      trigger: 'onFaint',
      effect: 'revive',
      baseValue: 1,
      target: 'self',
      description: 'Revive once with 1 HP after fainting',
      scaling: [1, 2, 3], // HP on revive
    },
  },
  {
    id: 'hydra',
    name: 'Hydra',
    tier: 5,
    baseAttack: 4,
    baseHealth: 8,
    emoji: '🐲',
    ability: {
      trigger: 'onFaint',
      effect: 'summon',
      baseValue: 2,
      target: 'self',
      description: 'On faint, summon 2 Hydra Heads',
      scaling: [2, 2, 3],
    },
  },
];

// Summoned pet templates (not available in shop)
export const SUMMONED_TEMPLATES: PetTemplate[] = [
  {
    id: 'honeybee',
    name: 'Honeybee',
    tier: 0,
    baseAttack: 1,
    baseHealth: 1,
    emoji: '🐝',
    ability: {
      trigger: 'passive',
      effect: 'gainAttack',
      baseValue: 0,
      target: 'none',
      description: 'No ability',
    },
  },
  {
    id: 'hydra-head',
    name: 'Hydra Head',
    tier: 0,
    baseAttack: 2,
    baseHealth: 4,
    emoji: '🐲',
    ability: {
      trigger: 'passive',
      effect: 'gainAttack',
      baseValue: 0,
      target: 'none',
      description: 'No ability',
    },
  },
];

export function getPetTemplate(id: string): PetTemplate | undefined {
  return PET_TEMPLATES.find((p) => p.id === id) || SUMMONED_TEMPLATES.find((p) => p.id === id);
}

export function getPetsByTier(tier: number): PetTemplate[] {
  return PET_TEMPLATES.filter((p) => p.tier === tier);
}

export function getAvailablePets(tiers: number[]): PetTemplate[] {
  return PET_TEMPLATES.filter((p) => tiers.includes(p.tier));
}
