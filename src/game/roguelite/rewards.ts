import type { Creature, RewardChoice, RogueliteCreature } from '../../types';
import { ROGUELITE_CONSTANTS } from '../../types';
import { getCreatureTemplate } from '../../data/creatures';

/**
 * Generate 3 reward choices after a battle victory.
 * Always offers: 1 creature (from defeated enemies), 1 XP boost, 1 breeding item.
 */
export function generateRewardChoices(
  _zoneId: number,
  _nodeRow: number,
  currentTeam: (RogueliteCreature | null)[],
  enemyTeam: Creature[]
): RewardChoice[] {
  const choices: RewardChoice[] = [];

  // 1. Creature reward — pick from the enemy team
  const creatureTemplate = pickRewardCreatureFromEnemies(enemyTeam);
  if (creatureTemplate) {
    const teamFull = currentTeam.filter((c) => c !== null).length >= ROGUELITE_CONSTANTS.MAX_TEAM_SIZE;
    choices.push({
      type: 'creature',
      creature: creatureTemplate,
      description: teamFull
        ? `${creatureTemplate.name} (${creatureTemplate.type}) — must swap with an existing creature`
        : `${creatureTemplate.name} (${creatureTemplate.type}) — add to party`,
    });
  }

  // 2. XP boost
  choices.push({
    type: 'xp',
    xpAmount: ROGUELITE_CONSTANTS.XP_REWARD_AMOUNT,
    description: `+${ROGUELITE_CONSTANTS.XP_REWARD_AMOUNT} XP to one creature of your choice`,
  });

  // 3. Breeding item
  const breedingItem = pickBreedingItem();
  choices.push({
    type: 'breeding_item',
    breedingItemId: breedingItem.id,
    description: breedingItem.description,
  });

  return choices;
}

function pickRewardCreatureFromEnemies(enemyTeam: Creature[]) {
  if (enemyTeam.length === 0) return null;

  // Pick a random enemy from the battle
  const enemy = enemyTeam[Math.floor(Math.random() * enemyTeam.length)];
  return getCreatureTemplate(enemy.templateId) ?? null;
}

// Breeding items for MVP
const BREEDING_ITEMS = [
  { id: 'ability_reroll', description: 'Ability Reroll — reroll a tier 1 ability on offspring' },
  { id: 'lifespan_boost', description: 'Lifespan Boost — offspring gains +2 lifespan' },
];

function pickBreedingItem() {
  return BREEDING_ITEMS[Math.floor(Math.random() * BREEDING_ITEMS.length)];
}
