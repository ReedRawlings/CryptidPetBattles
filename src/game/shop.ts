import { Creature, CreatureTemplate, Shop, Position, TIER_SCHEDULE, GAME_CONSTANTS, RelicDefinition } from '../types';
import { getAvailableCreatures, getCreatureTemplate } from '../data/creatures';
import { applyPlacementBuffs } from './buffs';
import { RELIC_DEFINITIONS } from '../data/relics';

// Generate a unique ID
function generateId(): string {
  return `creature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get tier configuration for a given turn
export function getTierConfig(turn: number) {
  return TIER_SCHEDULE.find(
    (config) => turn >= config.turns[0] && turn <= config.turns[1]
  ) || TIER_SCHEDULE[TIER_SCHEDULE.length - 1];
}

// Get position from team index: 0-1 = frontline, 2-4 = backline
export function getPositionFromIndex(index: number): Position {
  return index < GAME_CONSTANTS.FRONTLINE_SLOTS ? 'frontline' : 'backline';
}

// Get slot index within the row from team index
export function getSlotIndexFromTeamIndex(index: number): number {
  return index < GAME_CONSTANTS.FRONTLINE_SLOTS ? index : index - GAME_CONSTANTS.FRONTLINE_SLOTS;
}

// Sync all position/slotIndex fields on a team
export function updateTeamPositions(team: (Creature | null)[]): (Creature | null)[] {
  return team.map((creature, index) => {
    if (!creature) return null;
    return {
      ...creature,
      position: getPositionFromIndex(index),
      slotIndex: getSlotIndexFromTeamIndex(index),
      teamIndex: index,
    };
  });
}

// Create a creature instance from a template
export function createCreatureFromTemplate(
  template: CreatureTemplate,
  tier: number,
  position: Position,
  slotIndex: number,
  teamIndex: number
): Creature {
  const tierKey = String(tier) as '1' | '2' | '3';
  const tierData = template.tiers[tierKey];

  return {
    id: generateId(),
    templateId: template.id,
    name: template.name,
    type: template.type,
    role: template.role,
    shopTier: template.shopTier,
    tier,
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
    ability: {
      ...tierData.ability,
      effects: tierData.ability.effects.map((e) => ({ ...e })),
    },
    buffs: [],
    battlesParticipated: 0,
  };
}

// Pick a random relic weighted by rarity
function randomRelic(): RelicDefinition {
  const roll = Math.random();
  let pool: RelicDefinition[];
  if (roll < 0.1) {
    pool = RELIC_DEFINITIONS.filter((r) => r.rarity === 'rare');
  } else if (roll < 0.4) {
    pool = RELIC_DEFINITIONS.filter((r) => r.rarity === 'uncommon');
  } else {
    pool = RELIC_DEFINITIONS.filter((r) => r.rarity === 'common');
  }
  if (pool.length === 0) pool = RELIC_DEFINITIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Generate relic slots for a shop (1-2 slots from turn 3+)
function generateRelicSlots(turn: number, previousShop?: Shop): { relics: (RelicDefinition | null)[]; relicFrozen: boolean[] } {
  if (turn < 3) return { relics: [], relicFrozen: [] };

  const slotCount = turn >= 5 ? 2 : 1;
  const relics: (RelicDefinition | null)[] = [];
  const relicFrozen: boolean[] = [];

  for (let i = 0; i < slotCount; i++) {
    if (previousShop?.relicFrozen?.[i] && previousShop.relics?.[i]) {
      relics.push(previousShop.relics[i]);
      relicFrozen.push(true);
    } else {
      relics.push(randomRelic());
      relicFrozen.push(false);
    }
  }

  return { relics, relicFrozen };
}

// Generate a random shop based on turn, preserving frozen items
export function generateShop(turn: number, previousShop?: Shop): Shop {
  const config = getTierConfig(turn);
  const availableCreatures = getAvailableCreatures(config.availableTiers);

  const creatures: (CreatureTemplate | null)[] = [];
  const frozen: boolean[] = [];

  for (let i = 0; i < config.creatureSlots; i++) {
    if (previousShop && previousShop.frozen[i] && previousShop.creatures[i]) {
      creatures.push(previousShop.creatures[i]);
      frozen.push(true);
    } else {
      if (availableCreatures.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableCreatures.length);
        creatures.push(availableCreatures[randomIndex]);
      } else {
        creatures.push(null);
      }
      frozen.push(false);
    }
  }

  const { relics, relicFrozen } = generateRelicSlots(turn, previousShop);

  return { creatures, frozen, relics, relicFrozen };
}

// Roll the shop (costs 1 gold)
export function rollShop(shop: Shop, turn: number): Shop {
  const config = getTierConfig(turn);
  const availableCreatures = getAvailableCreatures(config.availableTiers);

  const newCreatures = shop.creatures.map((creature, index) => {
    if (shop.frozen[index]) return creature;
    if (availableCreatures.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCreatures.length);
      return availableCreatures[randomIndex];
    }
    return null;
  });

  // Re-roll unfrozen relic slots
  const newRelics = (shop.relics ?? []).map((relic, index) => {
    if (shop.relicFrozen?.[index]) return relic;
    return turn >= 3 ? randomRelic() : null;
  });

  return {
    creatures: newCreatures,
    frozen: shop.frozen,
    relics: newRelics,
    relicFrozen: shop.relicFrozen ?? [],
  };
}

// Buy a creature from the shop
export function buyCreature(
  shop: Shop,
  shopIndex: number,
  team: (Creature | null)[],
  teamIndex: number
): { success: boolean; creature: Creature | null; updatedShop: Shop; updatedTeam: (Creature | null)[] } {
  const template = shop.creatures[shopIndex];

  if (!template) {
    return { success: false, creature: null, updatedShop: shop, updatedTeam: team };
  }

  // Check if team slot is available
  if (team[teamIndex] !== null) {
    // Try to combine if same creature (shop creatures are always tier 1, feeds into any tier)
    const existing = team[teamIndex]!;
    if (existing.templateId === template.id && existing.tier < GAME_CONSTANTS.MAX_TIERS) {
      const updatedTeam = [...team];
      const combined = combineWithTemplate(existing, template);
      updatedTeam[teamIndex] = combined;

      const updatedShop = {
        ...shop,
        creatures: shop.creatures.map((c, i) => (i === shopIndex ? null : c)),
        frozen: shop.frozen.map((f, i) => (i === shopIndex ? false : f)),
      };

      return { success: true, creature: combined, updatedShop, updatedTeam };
    }
    return { success: false, creature: null, updatedShop: shop, updatedTeam: team };
  }

  // Create new creature
  const position = getPositionFromIndex(teamIndex);
  const slotIndex = getSlotIndexFromTeamIndex(teamIndex);
  const newCreature = createCreatureFromTemplate(template, 1, position, slotIndex, teamIndex);
  applyPlacementBuffs(newCreature);

  const updatedTeam = [...team];
  updatedTeam[teamIndex] = newCreature;

  const updatedShop = {
    ...shop,
    creatures: shop.creatures.map((c, i) => (i === shopIndex ? null : c)),
    frozen: shop.frozen.map((f, i) => (i === shopIndex ? false : f)),
  };

  return { success: true, creature: newCreature, updatedShop, updatedTeam };
}

// XP needed to tier up at a given tier level
function getXpThreshold(tier: number): number {
  return tier === 1 ? 2 : 3;
}

// Apply incremental stat bonus for each XP point toward the next tier
function applyXpBonus(creature: Creature, template: CreatureTemplate): Creature {
  const currKey = String(creature.tier) as '1' | '2' | '3';
  const nextKey = String(creature.tier + 1) as '1' | '2' | '3';
  const curr = template.tiers[currKey].baseStats;
  const next = template.tiers[nextKey].baseStats;
  const threshold = getXpThreshold(creature.tier);
  const atkBonus = Math.floor((next.attack - curr.attack) / threshold);
  const hpBonus = Math.floor((next.health - curr.health) / threshold);
  const spdBonus = Math.floor((next.speed - curr.speed) / threshold);
  return {
    ...creature,
    baseAttack: creature.baseAttack + atkBonus,
    baseHealth: creature.baseHealth + hpBonus,
    baseSpeed: creature.baseSpeed + spdBonus,
    currentAttack: creature.currentAttack + atkBonus,
    currentHealth: creature.currentHealth + hpBonus,
    currentSpeed: creature.currentSpeed + spdBonus,
    maxHealth: creature.maxHealth + hpBonus,
  };
}

// Helper: combine a shop template into an existing creature
// Each combine adds +1 experience; at threshold XP → tier up (reset to 0)
function combineWithTemplate(existing: Creature, template: CreatureTemplate): Creature {
  const newExp = existing.experience + 1;

  if (newExp >= getXpThreshold(existing.tier)) {
    // Tier up! Carry over bonus stats accumulated from food/buffs/XP
    const newTier = Math.min(existing.tier + 1, GAME_CONSTANTS.MAX_TIERS);
    const tierKey = String(newTier) as '1' | '2' | '3';
    const tierData = template.tiers[tierKey];

    const oldBase = template.tiers[String(existing.tier) as '1' | '2' | '3'].baseStats;
    const bonusAttack = Math.max(0, existing.baseAttack - oldBase.attack);
    const bonusHealth = Math.max(0, existing.baseHealth - oldBase.health);

    const newAttack = tierData.baseStats.attack + bonusAttack;
    const newHealth = tierData.baseStats.health + bonusHealth;

    const combined: Creature = {
      ...existing,
      tier: newTier,
      experience: 0,
      baseAttack: newAttack,
      baseHealth: newHealth,
      baseSpeed: tierData.baseStats.speed,
      currentAttack: newAttack,
      currentHealth: newHealth,
      currentSpeed: tierData.baseStats.speed,
      maxHealth: newHealth,
      ability: {
        ...tierData.ability,
        effects: tierData.ability.effects.map((e) => ({ ...e })),
      },
      buffs: [], // Clear — ability may have changed at new tier
    };
    applyPlacementBuffs(combined);
    return combined;
  }

  // Not enough copies yet — increment experience and apply stat bonus
  return applyXpBonus({
    ...existing,
    experience: newExp,
  }, template);
}

// Sell a creature from the team
export function sellCreature(
  team: (Creature | null)[],
  teamIndex: number
): { success: boolean; goldGained: number; updatedTeam: (Creature | null)[] } {
  const creature = team[teamIndex];

  if (!creature) {
    return { success: false, goldGained: 0, updatedTeam: team };
  }

  const updatedTeam = [...team];
  updatedTeam[teamIndex] = null;

  const goldGained = GAME_CONSTANTS.CREATURE_SELL_VALUE * creature.tier;

  return { success: true, goldGained, updatedTeam };
}

// Swap positions of two creatures
export function swapCreatures(
  team: (Creature | null)[],
  indexA: number,
  indexB: number
): (Creature | null)[] {
  const updatedTeam = [...team];
  const temp = updatedTeam[indexA];
  updatedTeam[indexA] = updatedTeam[indexB];
  updatedTeam[indexB] = temp;

  const result = updateTeamPositions(updatedTeam);

  // Re-apply placement buffs since positions may have changed
  for (const creature of result) {
    if (creature) applyPlacementBuffs(creature);
  }

  return result;
}

// Combine two identical creatures on the team
// Both must be the same templateId, source tier ≤ target tier.
// Each combine adds +1 experience; at threshold XP the creature tiers up.
export function combineCreatures(
  team: (Creature | null)[],
  sourceIndex: number,
  targetIndex: number
): { success: boolean; updatedTeam: (Creature | null)[]; tieredUp: boolean } {
  const source = team[sourceIndex];
  const target = team[targetIndex];

  if (!source || !target) {
    return { success: false, updatedTeam: team, tieredUp: false };
  }

  if (source.templateId !== target.templateId) {
    return { success: false, updatedTeam: team, tieredUp: false };
  }

  // Source tier must be ≤ target tier (can't merge higher into lower)
  if (source.tier > target.tier) {
    return { success: false, updatedTeam: team, tieredUp: false };
  }

  if (target.tier >= GAME_CONSTANTS.MAX_TIERS) {
    return { success: false, updatedTeam: team, tieredUp: false };
  }

  const newExp = target.experience + 1;
  const updatedTeam = [...team];

  if (newExp >= getXpThreshold(target.tier)) {
    // Tier up!
    const newTier = Math.min(target.tier + 1, GAME_CONSTANTS.MAX_TIERS);
    const template = getCreatureTemplate(target.templateId);

    if (!template) {
      return { success: false, updatedTeam: team, tieredUp: false };
    }

    const tierKey = String(newTier) as '1' | '2' | '3';
    const tierData = template.tiers[tierKey];

    // Carry over bonus stats from both creatures (stats above their old base)
    const oldBase = template.tiers[String(target.tier) as '1' | '2' | '3'].baseStats;
    const targetBonusAttack = Math.max(0, target.baseAttack - oldBase.attack);
    const targetBonusHealth = Math.max(0, target.baseHealth - oldBase.health);
    const sourceBonusAttack = Math.max(0, source.baseAttack - oldBase.attack);
    const sourceBonusHealth = Math.max(0, source.baseHealth - oldBase.health);

    const newAttack = tierData.baseStats.attack + targetBonusAttack + sourceBonusAttack;
    const newHealth = tierData.baseStats.health + targetBonusHealth + sourceBonusHealth;

    const combined: Creature = {
      ...target,
      tier: newTier,
      experience: 0,
      baseAttack: newAttack,
      baseHealth: newHealth,
      baseSpeed: tierData.baseStats.speed,
      currentAttack: newAttack,
      currentHealth: newHealth,
      currentSpeed: tierData.baseStats.speed,
      maxHealth: newHealth,
      ability: {
        ...tierData.ability,
        effects: tierData.ability.effects.map((e) => ({ ...e })),
      },
      buffs: [], // Clear — ability may have changed at new tier
    };
    applyPlacementBuffs(combined);
    updatedTeam[targetIndex] = combined;
    updatedTeam[sourceIndex] = null;

    return { success: true, updatedTeam, tieredUp: true };
  }

  // Not enough copies yet — absorb, increment experience, and apply stat bonus
  const template = getCreatureTemplate(target.templateId);
  if (!template) {
    return { success: false, updatedTeam: team, tieredUp: false };
  }

  updatedTeam[targetIndex] = applyXpBonus({
    ...target,
    experience: newExp,
  }, template);
  updatedTeam[sourceIndex] = null;

  return { success: true, updatedTeam, tieredUp: false };
}

// Toggle freeze on a shop slot
export function toggleFreeze(shop: Shop, index: number): Shop {
  const updatedFrozen = [...shop.frozen];
  updatedFrozen[index] = !updatedFrozen[index];

  return {
    ...shop,
    frozen: updatedFrozen,
  };
}

// Toggle freeze on a relic shop slot
export function toggleRelicFreeze(shop: Shop, index: number): Shop {
  const relicFrozen = [...(shop.relicFrozen ?? [])];
  relicFrozen[index] = !relicFrozen[index];

  return {
    ...shop,
    relicFrozen,
  };
}

// Buy a relic from the shop and equip it on a creature
export function buyRelic(
  shop: Shop,
  relicIndex: number,
  team: (Creature | null)[],
  teamIndex: number
): { success: boolean; updatedShop: Shop; updatedTeam: (Creature | null)[] } {
  const relicDef = shop.relics?.[relicIndex];
  if (!relicDef) {
    return { success: false, updatedShop: shop, updatedTeam: team };
  }

  const creature = team[teamIndex];
  if (!creature) {
    return { success: false, updatedShop: shop, updatedTeam: team };
  }

  // Equip relic (replace existing if any)
  const updatedTeam = [...team];
  updatedTeam[teamIndex] = {
    ...creature,
    relic: {
      definitionId: relicDef.id,
      remainingUses: relicDef.consumable ? (relicDef.maxUses ?? 1) : null,
    },
  };

  // Remove from shop
  const updatedRelics = [...(shop.relics ?? [])];
  updatedRelics[relicIndex] = null;
  const updatedRelicFrozen = [...(shop.relicFrozen ?? [])];
  updatedRelicFrozen[relicIndex] = false;

  return {
    success: true,
    updatedShop: { ...shop, relics: updatedRelics, relicFrozen: updatedRelicFrozen },
    updatedTeam,
  };
}

// Unequip a relic from a creature (relic is lost)
export function unequipRelic(
  team: (Creature | null)[],
  teamIndex: number
): { success: boolean; updatedTeam: (Creature | null)[] } {
  const creature = team[teamIndex];
  if (!creature || !creature.relic) {
    return { success: false, updatedTeam: team };
  }

  const updatedTeam = [...team];
  const { relic: _removed, ...rest } = creature;
  updatedTeam[teamIndex] = rest as Creature;

  return { success: true, updatedTeam };
}
