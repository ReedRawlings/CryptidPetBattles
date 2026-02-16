import type { RelicDefinition } from '../types';

export const RELIC_DEFINITIONS: RelicDefinition[] = [
  {
    id: 'chain_lightning',
    name: 'Chain Lightning',
    description: 'Attacks chain to 1 extra enemy for 10% damage. Stacks up to 4x across team.',
    rarity: 'uncommon',
    consumable: false,
    shopCost: 5,
    effects: [{
      type: 'chain_damage',
      trigger: 'on_attack',
      value: 0.1, // 10% of attack damage
      target: 'random_enemy',
    }],
  },
  {
    id: 'red_meat',
    name: 'Red Meat',
    description: 'All Fauna allies gain +10% ATK.',
    rarity: 'common',
    consumable: false,
    shopCost: 4,
    effects: [{
      type: 'tribe_atk_percent',
      trigger: 'passive',
      value: 0.1,
      condition: { tribe: 'Fauna' },
    }],
  },
  {
    id: 'beast_master',
    name: 'Beast Master',
    description: 'Fauna tribe synergy thresholds reduced by 1.',
    rarity: 'rare',
    consumable: false,
    shopCost: 6,
    effects: [{
      type: 'tribe_threshold_reduce',
      trigger: 'passive',
      value: 1,
      condition: { tribe: 'Fauna' },
    }],
  },
  {
    id: 'rock_lobster',
    name: 'Rock Lobster',
    description: 'All frontline allies gain +20% max HP at battle start.',
    rarity: 'uncommon',
    consumable: false,
    shopCost: 5,
    effects: [{
      type: 'position_hp_percent',
      trigger: 'on_battle_start',
      value: 0.2,
      condition: { position: 'frontline' },
    }],
  },
  {
    id: 'phoenix_down',
    name: 'Phoenix Down',
    description: 'At end of battle, revive this creature with 1 HP. 3 uses per run.',
    rarity: 'rare',
    consumable: true,
    maxUses: 3,
    shopCost: 7,
    effects: [{
      type: 'revive',
      trigger: 'on_battle_end',
      value: 1, // 1 HP
      target: 'self',
    }],
  },
  {
    id: 'touch_grass',
    name: 'Touch Grass',
    description: 'All Flora allies gain Thorns 1 at battle start.',
    rarity: 'common',
    consumable: false,
    shopCost: 4,
    effects: [{
      type: 'tribe_buff',
      trigger: 'on_battle_start',
      buffType: 'thorns',
      value: 1,
      condition: { tribe: 'Flora' },
    }],
  },
  {
    id: 'mog',
    name: 'Mog',
    description: 'Creatures that start battle at full HP gain Haste 1.',
    rarity: 'common',
    consumable: false,
    shopCost: 4,
    effects: [{
      type: 'conditional_buff',
      trigger: 'on_battle_start',
      buffType: 'haste',
      value: 1,
      condition: { fullHealth: true },
    }],
  },
  // Synergy bridge / build-around relics
  {
    id: 'spirit_anchor',
    name: 'Spirit Anchor',
    description: 'When an ally faints, all allies gain Strengthen 1.',
    rarity: 'uncommon',
    consumable: false,
    shopCost: 5,
    effects: [{
      type: 'team_buff_on_faint',
      trigger: 'on_faint',
      buffType: 'strengthen',
      value: 1,
      target: 'all_allies',
    }],
  },
  {
    id: 'kami_charm',
    name: 'Kami Charm',
    description: 'Earn +2 bonus gold after each battle victory.',
    rarity: 'common',
    consumable: false,
    shopCost: 4,
    effects: [{
      type: 'bonus_gold',
      trigger: 'on_battle_end',
      value: 2,
    }],
  },
  {
    id: 'thorn_mail',
    name: 'Thorn Mail',
    description: 'Equipped creature gains Thorns 2 at battle start.',
    rarity: 'uncommon',
    consumable: false,
    shopCost: 5,
    effects: [{
      type: 'self_buff',
      trigger: 'on_battle_start',
      buffType: 'thorns',
      value: 2,
      target: 'self',
    }],
  },
  {
    id: 'vampiric_fang',
    name: 'Vampiric Fang',
    description: 'Equipped creature heals for 2 HP on kill.',
    rarity: 'uncommon',
    consumable: false,
    shopCost: 5,
    effects: [{
      type: 'heal_on_kill',
      trigger: 'on_kill',
      value: 2,
      target: 'self',
    }],
  },
];

export function getRelicDefinition(id: string): RelicDefinition | undefined {
  return RELIC_DEFINITIONS.find((r) => r.id === id);
}

export function getRelicsByRarity(rarity: RelicDefinition['rarity']): RelicDefinition[] {
  return RELIC_DEFINITIONS.filter((r) => r.rarity === rarity);
}
