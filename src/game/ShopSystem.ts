import { Shop, Pet, PetTemplate, Food, Player } from '../models/types';
import { createPet, combinePets, applyFood, addExperience } from '../models/Pet';
import {
  spendGold,
  addGold,
  addPetToTeam,
  removePetFromTeam,
  hasTeamSpace,
  findPetByTemplateId,
  getActivePets,
  ROLL_COST,
  PET_COST,
  SELL_VALUE,
} from '../models/Player';
import {
  getPetsUpToTier,
  getMaxTierForTurn,
  getShopSlotsForTurn,
} from '../data/pets';
import { getFoodsUpToTier } from '../data/foods';

/**
 * Shop system - handles all shop phase mechanics
 */

// Food cost (same as pet cost in this implementation)
const FOOD_COST = 3;

/**
 * Create a new shop for a given turn
 */
export function createShop(turn: number): Shop {
  const maxTier = getMaxTierForTurn(turn);
  const { petSlots, foodSlots } = getShopSlotsForTurn(turn);

  const availablePets = getPetsUpToTier(maxTier);
  const availableFoods = getFoodsUpToTier(maxTier);

  // Generate random pet offerings
  const pets: (PetTemplate | null)[] = [];
  for (let i = 0; i < petSlots; i++) {
    if (availablePets.length > 0) {
      const randomIndex = Math.floor(Math.random() * availablePets.length);
      pets.push(availablePets[randomIndex]);
    } else {
      pets.push(null);
    }
  }

  // Generate random food offerings
  const foods: (Food | null)[] = [];
  for (let i = 0; i < foodSlots; i++) {
    if (availableFoods.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableFoods.length);
      foods.push(availableFoods[randomIndex]);
    } else {
      foods.push(null);
    }
  }

  return {
    pets,
    foods,
    frozen: new Array(petSlots + foodSlots).fill(false),
  };
}

/**
 * Roll the shop (reroll non-frozen slots)
 */
export function rollShop(player: Player, shop: Shop): boolean {
  if (!spendGold(player, ROLL_COST)) {
    return false;
  }

  const turn = player.currentTurn;
  const maxTier = getMaxTierForTurn(turn);
  const availablePets = getPetsUpToTier(maxTier);
  const availableFoods = getFoodsUpToTier(maxTier);

  // Reroll non-frozen pet slots
  for (let i = 0; i < shop.pets.length; i++) {
    if (!shop.frozen[i]) {
      if (availablePets.length > 0) {
        const randomIndex = Math.floor(Math.random() * availablePets.length);
        shop.pets[i] = availablePets[randomIndex];
      }
    }
  }

  // Reroll non-frozen food slots
  const foodStartIndex = shop.pets.length;
  for (let i = 0; i < shop.foods.length; i++) {
    if (!shop.frozen[foodStartIndex + i]) {
      if (availableFoods.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableFoods.length);
        shop.foods[i] = availableFoods[randomIndex];
      }
    }
  }

  return true;
}

/**
 * Toggle freeze on a shop slot
 */
export function toggleFreeze(shop: Shop, slotIndex: number): boolean {
  if (slotIndex < 0 || slotIndex >= shop.frozen.length) {
    return false;
  }
  shop.frozen[slotIndex] = !shop.frozen[slotIndex];
  return true;
}

/**
 * Buy a pet from the shop
 */
export function buyPet(
  player: Player,
  shop: Shop,
  shopIndex: number
): { success: boolean; pet?: Pet; leveledUp?: boolean; error?: string } {
  // Validate shop index
  if (shopIndex < 0 || shopIndex >= shop.pets.length) {
    return { success: false, error: 'Invalid shop slot' };
  }

  const template = shop.pets[shopIndex];
  if (!template) {
    return { success: false, error: 'No pet in this slot' };
  }

  // Check gold
  if (!spendGold(player, PET_COST)) {
    return { success: false, error: 'Not enough gold' };
  }

  // Check for existing pet to combine with
  const existingPet = findPetByTemplateId(player, template.id);

  if (existingPet && existingPet.level < 3) {
    // Combine pets (level up mechanic)
    const newPet = createPet(template);
    const leveledUp = combinePets(existingPet, newPet);

    // Remove from shop
    shop.pets[shopIndex] = null;
    shop.frozen[shopIndex] = false;

    // Trigger onBuy ability (on the existing pet since it gained stats)
    // This would be handled by the game state manager

    return { success: true, pet: existingPet, leveledUp };
  } else if (hasTeamSpace(player)) {
    // Add new pet to team
    const newPet = createPet(template);
    addPetToTeam(player, newPet);

    // Remove from shop
    shop.pets[shopIndex] = null;
    shop.frozen[shopIndex] = false;

    return { success: true, pet: newPet, leveledUp: false };
  } else {
    // Refund gold if no space and can't combine
    addGold(player, PET_COST);
    return { success: false, error: 'No space on team and cannot combine' };
  }
}

/**
 * Buy food from the shop
 */
export function buyFood(
  player: Player,
  shop: Shop,
  shopIndex: number,
  targetPetId: string
): { success: boolean; error?: string } {
  // Validate shop index
  if (shopIndex < 0 || shopIndex >= shop.foods.length) {
    return { success: false, error: 'Invalid shop slot' };
  }

  const food = shop.foods[shopIndex];
  if (!food) {
    return { success: false, error: 'No food in this slot' };
  }

  // Find target pet
  const targetPet = player.team.find((p) => p?.id === targetPetId);
  if (!targetPet) {
    return { success: false, error: 'Target pet not found' };
  }

  // Check gold
  if (!spendGold(player, FOOD_COST)) {
    return { success: false, error: 'Not enough gold' };
  }

  // Apply food based on target type
  if (food.target === 'self') {
    applyFood(targetPet, food);
  } else if (food.target === 'all_allies') {
    const activePets = getActivePets(player);
    for (const pet of activePets) {
      applyFood(pet, food);
    }
  } else if (food.target === 'random_ally') {
    // Apply to 2 random pets
    const activePets = getActivePets(player);
    const shuffled = [...activePets].sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, 2);
    for (const pet of targets) {
      applyFood(pet, food);
    }
  }

  // Remove from shop
  shop.foods[shopIndex] = null;
  const foodSlotIndex = shop.pets.length + shopIndex;
  shop.frozen[foodSlotIndex] = false;

  return { success: true };
}

/**
 * Sell a pet from the team
 */
export function sellPet(
  player: Player,
  petId: string
): { success: boolean; gold?: number; error?: string } {
  const pet = removePetFromTeam(player, petId);
  if (!pet) {
    return { success: false, error: 'Pet not found on team' };
  }

  // Calculate sell value (base + level bonus)
  const sellValue = SELL_VALUE + (pet.level - 1);
  addGold(player, sellValue);

  return { success: true, gold: sellValue };
}

/**
 * Drag and drop a pet from shop to team position
 */
export function dragPetToTeam(
  player: Player,
  shop: Shop,
  shopIndex: number,
  teamPosition: number
): { success: boolean; pet?: Pet; leveledUp?: boolean; error?: string } {
  // First try to buy the pet normally
  const result = buyPet(player, shop, shopIndex);

  if (result.success && result.pet && !result.leveledUp) {
    // If we added a new pet, move it to the desired position
    // The pet is currently at the first empty slot, we need to move it
    const currentPos = player.team.findIndex((p) => p?.id === result.pet?.id);
    if (currentPos !== -1 && currentPos !== teamPosition) {
      // Swap positions
      const temp = player.team[teamPosition];
      player.team[teamPosition] = player.team[currentPos];
      player.team[currentPos] = temp;
    }
  }

  return result;
}

/**
 * Combine two pets on the team (manual merge)
 */
export function combinePetsOnTeam(
  player: Player,
  targetPetId: string,
  sourcePetId: string
): { success: boolean; leveledUp?: boolean; error?: string } {
  const targetIndex = player.team.findIndex((p) => p?.id === targetPetId);
  const sourceIndex = player.team.findIndex((p) => p?.id === sourcePetId);

  if (targetIndex === -1 || sourceIndex === -1) {
    return { success: false, error: 'Pet not found' };
  }

  const targetPet = player.team[targetIndex]!;
  const sourcePet = player.team[sourceIndex]!;

  if (targetPet.templateId !== sourcePet.templateId) {
    return { success: false, error: 'Pets must be the same type to combine' };
  }

  if (targetPet.level >= 3) {
    return { success: false, error: 'Target pet is already max level' };
  }

  // Combine the pets
  const leveledUp = combinePets(targetPet, sourcePet);

  // Remove source pet from team
  player.team[sourceIndex] = null;

  return { success: true, leveledUp };
}

/**
 * Get shop state for display
 */
export function getShopState(shop: Shop): {
  pets: { template: PetTemplate | null; frozen: boolean }[];
  foods: { item: Food | null; frozen: boolean }[];
} {
  const petStates = shop.pets.map((template, index) => ({
    template,
    frozen: shop.frozen[index],
  }));

  const foodStates = shop.foods.map((item, index) => ({
    item,
    frozen: shop.frozen[shop.pets.length + index],
  }));

  return { pets: petStates, foods: foodStates };
}
