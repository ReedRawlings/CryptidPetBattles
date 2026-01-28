import type { Ability } from '@/types';

// All ability definitions for the game
export const ABILITIES: Record<string, Ability> = {
  // Tier 1 abilities
  puppyAbility: {
    id: 'puppyAbility',
    name: 'Pack Bond',
    trigger: 'onFriendSummoned',
    effectType: 'buffBoth',
    target: 'self',
    baseValue: 1,
    description: 'Gain +1/+1 when a friend is summoned',
    scalingValues: [1, 2, 3],
  },
  crabAbility: {
    id: 'crabAbility',
    name: 'Pinch',
    trigger: 'onHurt',
    effectType: 'damage',
    target: 'attacker',
    baseValue: 1,
    description: 'Deal damage to attacker when hurt',
    scalingValues: [1, 2, 3],
  },
  beeAbility: {
    id: 'beeAbility',
    name: 'Honeybee Spawn',
    trigger: 'onFaint',
    effectType: 'summon',
    target: 'self',
    baseValue: 1, // Summons a 1/1 Honeybee
    description: 'Summon a 1/1 Honeybee on faint',
    scalingValues: [1, 2, 3], // Number of honeybees summoned
  },

  // Tier 2 abilities
  wolfAbility: {
    id: 'wolfAbility',
    name: 'Pack Leader',
    trigger: 'startOfBattle',
    effectType: 'buffAttack',
    target: 'adjacentAllies',
    baseValue: 1,
    description: 'Give adjacent allies +ATK at battle start',
    scalingValues: [1, 2, 3],
  },
  turtleAbility: {
    id: 'turtleAbility',
    name: 'Shell Shield',
    trigger: 'onFaint',
    effectType: 'armor',
    target: 'petBehind',
    baseValue: 2,
    description: 'Give pet behind armor on faint',
    scalingValues: [2, 4, 6],
  },
  crowAbility: {
    id: 'crowAbility',
    name: 'Carrion Feeder',
    trigger: 'onEnemyFaint',
    effectType: 'buffAttack',
    target: 'self',
    baseValue: 1,
    description: 'Permanently gain +ATK when an enemy faints',
    scalingValues: [1, 2, 3],
  },

  // Tier 3 abilities
  berserkerAbility: {
    id: 'berserkerAbility',
    name: 'Blood Frenzy',
    trigger: 'onAttack',
    effectType: 'buffAttack',
    target: 'self',
    baseValue: 1,
    description: 'Gain +ATK for this battle when attacking',
    scalingValues: [1, 2, 3],
  },
  echoAbility: {
    id: 'echoAbility',
    name: 'Echo Strike',
    trigger: 'startOfBattle',
    effectType: 'damage',
    target: 'randomEnemy',
    baseValue: 3,
    description: 'Deal damage to random enemy for each battle participated',
    scalingValues: [3, 4, 5],
  },
  golemAbility: {
    id: 'golemAbility',
    name: 'Stone Skin',
    trigger: 'passive',
    effectType: 'armor',
    target: 'self',
    baseValue: 2,
    description: 'Takes reduced damage from all attacks (min 1)',
    scalingValues: [2, 3, 4],
  },

  // Tier 4 abilities
  pureAbility: {
    id: 'pureAbility',
    name: 'Purifying Light',
    trigger: 'onFaint',
    effectType: 'heal',
    target: 'allAllies',
    baseValue: 3,
    description: 'Heal all surviving allies on faint',
    scalingValues: [3, 5, 7],
  },
  vampireAbility: {
    id: 'vampireAbility',
    name: 'Life Drain',
    trigger: 'onKill',
    effectType: 'heal',
    target: 'self',
    baseValue: 0, // Special: heals for killed enemy's ATK
    description: 'Heal for killed enemy\'s ATK',
    scalingValues: [1, 1, 1], // Multiplier for enemy ATK
  },
  snakeAbility: {
    id: 'snakeAbility',
    name: 'Venom Strike',
    trigger: 'onFriendAttack',
    effectType: 'damage',
    target: 'randomEnemy',
    baseValue: 3,
    description: 'Deal damage to random enemy when a friend attacks',
    scalingValues: [3, 5, 7],
  },

  // Tier 5 abilities
  dragonAbility: {
    id: 'dragonAbility',
    name: 'Dragon Breath',
    trigger: 'startOfBattle',
    effectType: 'damage',
    target: 'allEnemies',
    baseValue: 5,
    description: 'Deal damage to ALL enemies at battle start',
    scalingValues: [5, 7, 10],
  },
  phoenixAbility: {
    id: 'phoenixAbility',
    name: 'Reborn',
    trigger: 'onFaint',
    effectType: 'reborn',
    target: 'self',
    baseValue: 1,
    description: 'Revive once with 1 HP after fainting',
    scalingValues: [1, 2, 3], // HP on revive
  },
  hydraAbility: {
    id: 'hydraAbility',
    name: 'Hydra Heads',
    trigger: 'onFaint',
    effectType: 'summon',
    target: 'self',
    baseValue: 2, // Summons two 2/4 Hydra Heads
    description: 'Summon two 2/4 Hydra Heads on faint',
    scalingValues: [2, 3, 4], // Number of heads
  },
};

export function getAbility(id: string): Ability | undefined {
  return ABILITIES[id];
}
