import type { CreatureTemplate } from '../types';
import creaturesData from '../../creatures.json';

// Extract creature templates from the JSON data
const rawCreatures = creaturesData.creatures as CreatureTemplate[];

export const CREATURE_TEMPLATES: CreatureTemplate[] = rawCreatures;

// Spirit Bone summon templates by tribe count threshold
export const SPIRIT_BONE_TEMPLATES: Record<number, { health: number; attack: number; speed: number }> = {
  2: { health: 10, attack: 5, speed: 1 },
  3: { health: 15, attack: 8, speed: 1 },
  5: { health: 20, attack: 10, speed: 1 },
};

export function getCreatureTemplate(id: string): CreatureTemplate | undefined {
  return CREATURE_TEMPLATES.find((c) => c.id === id);
}

export function getCreaturesByShopTier(tier: number): CreatureTemplate[] {
  return CREATURE_TEMPLATES.filter((c) => c.shopTier === tier);
}

export function getAvailableCreatures(tiers: number[]): CreatureTemplate[] {
  return CREATURE_TEMPLATES.filter((c) => tiers.includes(c.shopTier));
}

export function getCreaturesByTribe(tribe: string): CreatureTemplate[] {
  return CREATURE_TEMPLATES.filter((c) => c.type === tribe);
}
