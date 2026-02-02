import { Pet, PetTemplate, Food, Shop, TIER_SCHEDULE, GAME_CONSTANTS } from '../types';
import { getAvailablePets } from '../data/pets';
import { getAvailableFoods } from '../data/foods';

// Generate a unique ID
function generateId(): string {
  return `pet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get tier configuration for a given turn
export function getTierConfig(turn: number) {
  return TIER_SCHEDULE.find(
    (config) => turn >= config.turns[0] && turn <= config.turns[1]
  ) || TIER_SCHEDULE[TIER_SCHEDULE.length - 1];
}

// Create a pet instance from a template
export function createPetFromTemplate(template: PetTemplate, position: number): Pet {
  return {
    id: generateId(),
    templateId: template.id,
    name: template.name,
    tier: template.tier,
    level: 1,
    experience: 0,
    baseAttack: template.baseAttack,
    baseHealth: template.baseHealth,
    currentAttack: template.baseAttack,
    currentHealth: template.baseHealth,
    maxHealth: template.baseHealth,
    ability: { ...template.ability },
    battlesParticipated: 0,
    foodSlot: null,
    position,
    emoji: template.emoji,
  };
}

// Generate a random shop based on turn, preserving frozen items from previous shop
export function generateShop(turn: number, previousShop?: Shop): Shop {
  const config = getTierConfig(turn);
  const availablePets = getAvailablePets(config.availableTiers);
  const availableFoods = getAvailableFoods(config.availableTiers);

  // Generate pet slots, preserving frozen pets from previous shop
  const pets: (PetTemplate | null)[] = [];
  const frozen: boolean[] = [];

  for (let i = 0; i < config.petSlots; i++) {
    // Check if this slot was frozen in the previous shop and had a pet
    if (previousShop && previousShop.frozen[i] && previousShop.pets[i]) {
      pets.push(previousShop.pets[i]);
      frozen.push(true);
    } else {
      if (availablePets.length > 0) {
        const randomIndex = Math.floor(Math.random() * availablePets.length);
        pets.push(availablePets[randomIndex]);
      } else {
        pets.push(null);
      }
      frozen.push(false);
    }
  }

  // Generate food slots, preserving frozen foods from previous shop
  const foods: (Food | null)[] = [];
  for (let i = 0; i < config.foodSlots; i++) {
    const prevFrozenIndex = previousShop ? previousShop.pets.length + i : -1;

    // Check if this slot was frozen in the previous shop and had food
    if (previousShop && previousShop.frozen[prevFrozenIndex] && previousShop.foods[i]) {
      foods.push(previousShop.foods[i]);
      frozen.push(true);
    } else {
      if (availableFoods.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableFoods.length);
        foods.push(availableFoods[randomIndex]);
      } else {
        foods.push(null);
      }
      frozen.push(false);
    }
  }

  return {
    pets,
    foods,
    frozen,
  };
}

// Roll the shop (costs 1 gold)
export function rollShop(shop: Shop, turn: number): Shop {
  const config = getTierConfig(turn);
  const availablePets = getAvailablePets(config.availableTiers);
  const availableFoods = getAvailableFoods(config.availableTiers);

  // Re-roll non-frozen pets
  const newPets = shop.pets.map((pet, index) => {
    if (shop.frozen[index]) {
      return pet;
    }
    if (availablePets.length > 0) {
      const randomIndex = Math.floor(Math.random() * availablePets.length);
      return availablePets[randomIndex];
    }
    return null;
  });

  // Re-roll non-frozen foods
  const newFoods = shop.foods.map((food, index) => {
    const frozenIndex = shop.pets.length + index;
    if (shop.frozen[frozenIndex]) {
      return food;
    }
    if (availableFoods.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableFoods.length);
      return availableFoods[randomIndex];
    }
    return null;
  });

  return {
    pets: newPets,
    foods: newFoods,
    frozen: shop.frozen,
  };
}

// Buy a pet from the shop
export function buyPet(
  shop: Shop,
  shopIndex: number,
  team: (Pet | null)[],
  teamIndex: number
): { success: boolean; pet: Pet | null; updatedShop: Shop; updatedTeam: (Pet | null)[] } {
  const template = shop.pets[shopIndex];

  if (!template) {
    return { success: false, pet: null, updatedShop: shop, updatedTeam: team };
  }

  // Check if team slot is available
  if (team[teamIndex] !== null) {
    // Try to combine if same pet
    const existingPet = team[teamIndex]!;
    if (existingPet.templateId === template.id && existingPet.level < 3) {
      // Combine pets (give XP and +1/+1 per XP gained)
      const updatedTeam = [...team];
      const combinedPet = { ...existingPet };

      // Shop pets give 1 XP when combined
      const xpGained = 1;
      combinedPet.experience += xpGained;

      // Add +1/+1 for each XP gained (SAP mechanic)
      combinedPet.currentAttack = Math.min(
        combinedPet.currentAttack + xpGained,
        GAME_CONSTANTS.MAX_STAT
      );
      combinedPet.currentHealth = Math.min(
        combinedPet.currentHealth + xpGained,
        GAME_CONSTANTS.MAX_STAT
      );
      combinedPet.maxHealth = Math.min(
        combinedPet.maxHealth + xpGained,
        GAME_CONSTANTS.MAX_STAT
      );

      // Check for level up
      if (combinedPet.experience >= GAME_CONSTANTS.XP_TO_LEVEL_3 && combinedPet.level < 3) {
        combinedPet.level = 3;
      } else if (combinedPet.experience >= GAME_CONSTANTS.XP_TO_LEVEL_2 && combinedPet.level < 2) {
        combinedPet.level = 2;
      }

      updatedTeam[teamIndex] = combinedPet;

      // Remove from shop and clear frozen flag
      const updatedShop = {
        ...shop,
        pets: shop.pets.map((p, i) => (i === shopIndex ? null : p)),
        frozen: shop.frozen.map((f, i) => (i === shopIndex ? false : f)),
      };

      return { success: true, pet: combinedPet, updatedShop, updatedTeam };
    }
    return { success: false, pet: null, updatedShop: shop, updatedTeam: team };
  }

  // Create new pet
  const newPet = createPetFromTemplate(template, teamIndex);

  // Update team
  const updatedTeam = [...team];
  updatedTeam[teamIndex] = newPet;

  // Remove from shop and clear frozen flag
  const updatedShop = {
    ...shop,
    pets: shop.pets.map((p, i) => (i === shopIndex ? null : p)),
    frozen: shop.frozen.map((f, i) => (i === shopIndex ? false : f)),
  };

  return { success: true, pet: newPet, updatedShop, updatedTeam };
}

// Sell a pet from the team
export function sellPet(
  team: (Pet | null)[],
  teamIndex: number
): { success: boolean; goldGained: number; updatedTeam: (Pet | null)[] } {
  const pet = team[teamIndex];

  if (!pet) {
    return { success: false, goldGained: 0, updatedTeam: team };
  }

  const updatedTeam = [...team];
  updatedTeam[teamIndex] = null;

  // Level affects sell value
  const goldGained = GAME_CONSTANTS.PET_SELL_VALUE * pet.level;

  return { success: true, goldGained, updatedTeam };
}

// Apply food to a pet
export function applyFood(
  shop: Shop,
  foodIndex: number,
  team: (Pet | null)[],
  teamIndex: number
): { success: boolean; updatedShop: Shop; updatedTeam: (Pet | null)[] } {
  const food = shop.foods[foodIndex];
  const pet = team[teamIndex];

  if (!food || !pet) {
    return { success: false, updatedShop: shop, updatedTeam: team };
  }

  const updatedTeam = [...team];
  const updatedPet = { ...pet };

  // Apply food effects
  updatedPet.currentAttack = Math.min(
    updatedPet.currentAttack + food.attackValue,
    GAME_CONSTANTS.MAX_STAT
  );
  updatedPet.currentHealth = Math.min(
    updatedPet.currentHealth + food.healthValue,
    GAME_CONSTANTS.MAX_STAT
  );
  updatedPet.maxHealth = Math.min(
    updatedPet.maxHealth + food.healthValue,
    GAME_CONSTANTS.MAX_STAT
  );

  updatedTeam[teamIndex] = updatedPet;

  // Remove food from shop and clear frozen flag
  const frozenIndex = shop.pets.length + foodIndex;
  const updatedShop = {
    ...shop,
    foods: shop.foods.map((f, i) => (i === foodIndex ? null : f)),
    frozen: shop.frozen.map((f, i) => (i === frozenIndex ? false : f)),
  };

  return { success: true, updatedShop, updatedTeam };
}

// Swap positions of two pets
export function swapPets(
  team: (Pet | null)[],
  indexA: number,
  indexB: number
): (Pet | null)[] {
  const updatedTeam = [...team];
  const temp = updatedTeam[indexA];
  updatedTeam[indexA] = updatedTeam[indexB];
  updatedTeam[indexB] = temp;

  // Update positions
  if (updatedTeam[indexA]) {
    updatedTeam[indexA] = { ...updatedTeam[indexA]!, position: indexA };
  }
  if (updatedTeam[indexB]) {
    updatedTeam[indexB] = { ...updatedTeam[indexB]!, position: indexB };
  }

  return updatedTeam;
}

// Combine two pets of the same type
export function combinePets(
  team: (Pet | null)[],
  sourceIndex: number,
  targetIndex: number
): { success: boolean; updatedTeam: (Pet | null)[]; leveledUp: boolean } {
  const source = team[sourceIndex];
  const target = team[targetIndex];

  if (!source || !target) {
    return { success: false, updatedTeam: team, leveledUp: false };
  }

  // Must be same type
  if (source.templateId !== target.templateId) {
    return { success: false, updatedTeam: team, leveledUp: false };
  }

  // Target can't already be max level
  if (target.level >= 3) {
    return { success: false, updatedTeam: team, leveledUp: false };
  }

  const updatedTeam = [...team];
  const combinedPet = { ...target };

  // Calculate XP gained (1 for the combine + source's existing XP)
  const xpGained = 1 + source.experience;

  // Add XP
  combinedPet.experience += xpGained;

  // Take higher stats first (like SAP)
  combinedPet.currentAttack = Math.max(source.currentAttack, target.currentAttack);
  combinedPet.currentHealth = Math.max(source.currentHealth, target.currentHealth);
  combinedPet.maxHealth = Math.max(source.maxHealth, target.maxHealth);

  // Then add +1/+1 for each XP gained (SAP mechanic)
  combinedPet.currentAttack = Math.min(
    combinedPet.currentAttack + xpGained,
    GAME_CONSTANTS.MAX_STAT
  );
  combinedPet.currentHealth = Math.min(
    combinedPet.currentHealth + xpGained,
    GAME_CONSTANTS.MAX_STAT
  );
  combinedPet.maxHealth = Math.min(
    combinedPet.maxHealth + xpGained,
    GAME_CONSTANTS.MAX_STAT
  );

  let leveledUp = false;

  // Check for level up
  if (combinedPet.experience >= GAME_CONSTANTS.XP_TO_LEVEL_3 && combinedPet.level < 3) {
    combinedPet.level = 3;
    leveledUp = true;
  } else if (combinedPet.experience >= GAME_CONSTANTS.XP_TO_LEVEL_2 && combinedPet.level < 2) {
    combinedPet.level = 2;
    leveledUp = true;
  }

  updatedTeam[targetIndex] = combinedPet;
  updatedTeam[sourceIndex] = null;

  return { success: true, updatedTeam, leveledUp };
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
