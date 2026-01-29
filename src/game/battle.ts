import { Pet, BattleEvent, BattleResult, GAME_CONSTANTS } from '../types';
import { SUMMONED_TEMPLATES } from '../data/pets';

// Deep clone a pet for battle
function clonePet(pet: Pet): Pet {
  return {
    ...pet,
    ability: { ...pet.ability },
    foodSlot: pet.foodSlot ? { ...pet.foodSlot } : null,
    tempAttackBonus: 0,
    armor: pet.armor || 0,
    hasRevived: false,
  };
}

// Get ability value based on pet level
function getAbilityValue(pet: Pet): number {
  const scaling = pet.ability.scaling;
  if (scaling && scaling.length >= pet.level) {
    return scaling[pet.level - 1];
  }
  return pet.ability.baseValue;
}

// Create a summoned pet with optional stat scaling based on summoner level
function createSummonedPet(templateId: string, position: number, statBonus: number = 0): Pet {
  const template = SUMMONED_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    throw new Error(`Unknown summoned pet template: ${templateId}`);
  }

  const attack = template.baseAttack + statBonus;
  const health = template.baseHealth + statBonus;

  return {
    id: `${templateId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    templateId: template.id,
    name: template.name,
    tier: template.tier,
    level: 1,
    experience: 0,
    baseAttack: attack,
    baseHealth: health,
    currentAttack: attack,
    currentHealth: health,
    maxHealth: health,
    ability: { ...template.ability },
    battlesParticipated: 0,
    foodSlot: null,
    position,
    emoji: template.emoji,
    tempAttackBonus: 0,
    armor: 0,
    hasRevived: false,
  };
}

// Battle state for tracking
interface BattleState {
  playerTeam: Pet[];
  opponentTeam: Pet[];
  events: BattleEvent[];
  timestamp: number;
}

// Add event to battle log
function addEvent(
  state: BattleState,
  type: BattleEvent['type'],
  source: string | null,
  target: string | null,
  value: number,
  description?: string
): void {
  state.events.push({
    type,
    source,
    target,
    value,
    timestamp: state.timestamp++,
    description,
  });
}

// Get current attack value including temp bonuses
function getAttack(pet: Pet): number {
  return Math.min(pet.currentAttack + (pet.tempAttackBonus || 0), GAME_CONSTANTS.MAX_STAT);
}

// Apply damage to pet, considering armor and passives
function applyDamage(
  pet: Pet,
  damage: number,
  state: BattleState,
  attacker?: Pet
): { damageDealt: number; killed: boolean } {
  let finalDamage = damage;

  // Golem's passive: reduce incoming damage
  if (pet.ability.trigger === 'passive' && pet.ability.effect === 'reduceIncomingDamage') {
    finalDamage = Math.max(1, finalDamage - getAbilityValue(pet));
  }

  // Apply armor
  if (pet.armor && pet.armor > 0) {
    finalDamage = Math.max(1, finalDamage - pet.armor);
  }

  pet.currentHealth -= finalDamage;

  addEvent(state, 'damage', attacker?.id || null, pet.id, finalDamage, `${pet.name} takes ${finalDamage} damage`);

  // Trigger onHurt abilities
  if (pet.ability.trigger === 'onHurt' && attacker) {
    triggerAbility(pet, state, attacker, pet === state.playerTeam[0] ? state.opponentTeam : state.playerTeam);
  }

  return {
    damageDealt: finalDamage,
    killed: pet.currentHealth <= 0,
  };
}

// Trigger a pet's ability
function triggerAbility(
  pet: Pet,
  state: BattleState,
  triggerSource: Pet | null,
  enemyTeam: Pet[]
): void {
  const value = getAbilityValue(pet);
  const isPlayerPet = state.playerTeam.includes(pet);
  const friendlyTeam = isPlayerPet ? state.playerTeam : state.opponentTeam;

  addEvent(state, 'ability', pet.id, null, value, `${pet.name}'s ability triggers`);

  switch (pet.ability.effect) {
    case 'gainAttack':
      if (pet.ability.target === 'self') {
        if (pet.ability.trigger === 'onAttack') {
          // Berserker: temp bonus
          pet.tempAttackBonus = (pet.tempAttackBonus || 0) + value;
          addEvent(state, 'buff', pet.id, pet.id, value, `${pet.name} gains +${value} ATK temporarily`);
        } else {
          // Battle-only gain (Crow on enemy faint)
          pet.currentAttack = Math.min(pet.currentAttack + value, GAME_CONSTANTS.MAX_STAT);
          addEvent(state, 'buff', pet.id, pet.id, value, `${pet.name} gains +${value} ATK`);
        }
      } else if (pet.ability.target === 'adjacentAllies') {
        // Wolf: buff adjacent allies
        const petIndex = friendlyTeam.indexOf(pet);
        const adjacentPets = [friendlyTeam[petIndex - 1], friendlyTeam[petIndex + 1]].filter(Boolean);
        adjacentPets.forEach((ally) => {
          ally.currentAttack = Math.min(ally.currentAttack + value, GAME_CONSTANTS.MAX_STAT);
          addEvent(state, 'buff', pet.id, ally.id, value, `${ally.name} gains +${value} ATK from ${pet.name}`);
        });
      }
      break;

    case 'dealDamage':
      if (pet.ability.target === 'attacker' && triggerSource) {
        // Crab: damage attacker
        applyDamage(triggerSource, value, state, pet);
      } else if (pet.ability.target === 'randomEnemy') {
        // Echo: damage random enemy based on battles participated
        const multiplier = pet.templateId === 'echo' ? pet.battlesParticipated : 1;
        const totalDamage = value * multiplier;
        if (enemyTeam.length > 0 && totalDamage > 0) {
          const target = enemyTeam[Math.floor(Math.random() * enemyTeam.length)];
          applyDamage(target, totalDamage, state, pet);
        }
      } else if (pet.ability.target === 'allEnemies') {
        // Dragon: damage all enemies
        enemyTeam.forEach((enemy) => {
          applyDamage(enemy, value, state, pet);
        });
      }
      break;

    case 'heal':
      if (pet.ability.target === 'allAllies') {
        // Pure: heal all allies
        friendlyTeam.forEach((ally) => {
          if (ally.currentHealth > 0) {
            const healAmount = Math.min(value, ally.maxHealth - ally.currentHealth);
            ally.currentHealth += healAmount;
            addEvent(state, 'heal', pet.id, ally.id, healAmount, `${ally.name} heals for ${healAmount} HP`);
          }
        });
      } else if (pet.ability.target === 'self') {
        // Vampire: heal flat amount on kill
        const healAmount = Math.min(value, pet.maxHealth - pet.currentHealth);
        pet.currentHealth += healAmount;
        addEvent(state, 'heal', pet.id, pet.id, healAmount, `${pet.name} heals for ${healAmount} HP`);
      }
      break;

    case 'summon': {
      // Bee or Hydra: summon pets
      const summonId = pet.templateId === 'bee' ? 'honeybee' : 'hydra-head';
      // Bee: scaling controls summon count (1, 1, 2 at levels 1, 2, 3)
      // Hydra: scaling controls summon count (2, 2, 3 at levels 1, 2, 3)
      const summonCount = value;
      // Bee: stats scale with level (1/1 at Lv1, 2/2 at Lv2, 3/3 at Lv3)
      const statBonus = pet.templateId === 'bee' ? pet.level - 1 : 0;

      // Find position to summon at (where the dying pet is)
      let petIndex = friendlyTeam.indexOf(pet);
      if (petIndex === -1) petIndex = friendlyTeam.length;

      for (let i = 0; i < summonCount; i++) {
        // Count only ALIVE pets for team size check (dying pets will be removed)
        const alivePetCount = friendlyTeam.filter(p => p.currentHealth > 0).length;
        if (alivePetCount >= GAME_CONSTANTS.MAX_TEAM_SIZE) break;

        const summoned = createSummonedPet(summonId, petIndex, statBonus);
        friendlyTeam.splice(petIndex, 0, summoned);
        addEvent(state, 'summon', pet.id, summoned.id, 1, `${pet.name} summons ${summoned.currentAttack}/${summoned.currentHealth} ${summoned.name}`);

        // Trigger onFriendSummoned for all ALIVE allies
        friendlyTeam.forEach((ally) => {
          if (ally.ability.trigger === 'onFriendSummoned' && ally.id !== summoned.id && ally.currentHealth > 0) {
            // Puppy gains stats
            ally.currentAttack = Math.min(ally.currentAttack + getAbilityValue(ally), GAME_CONSTANTS.MAX_STAT);
            ally.currentHealth = Math.min(ally.currentHealth + getAbilityValue(ally), GAME_CONSTANTS.MAX_STAT);
            ally.maxHealth = Math.min(ally.maxHealth + getAbilityValue(ally), GAME_CONSTANTS.MAX_STAT);
            addEvent(
              state,
              'buff',
              ally.id,
              ally.id,
              getAbilityValue(ally),
              `${ally.name} gains +${getAbilityValue(ally)}/+${getAbilityValue(ally)}`
            );
          }
        });
      }
      break;
    }

    case 'giveArmor': {
      // Turtle: give armor to pet behind
      // For player team: higher index = front, so behind = petIndex - 1
      // For opponent team: lower index = front, so behind = petIndex + 1
      const petIndex = friendlyTeam.indexOf(pet);
      const behindIndex = isPlayerPet ? petIndex - 1 : petIndex + 1;
      const petBehind = friendlyTeam[behindIndex];
      if (petBehind && petBehind.currentHealth > 0) {
        petBehind.armor = (petBehind.armor || 0) + value;
        addEvent(state, 'buff', pet.id, petBehind.id, value, `${petBehind.name} gains +${value} armor`);
      }
      break;
    }

    case 'revive':
      // Phoenix: handled in processFaints
      break;
  }
}

// Remove fainted pets and trigger faint abilities
function processFaints(state: BattleState): void {
  const processTeam = (team: Pet[], enemyTeam: Pet[]): void => {
    const faintedPets = team.filter((p) => p.currentHealth <= 0);

    faintedPets.forEach((pet) => {
      // Phoenix revive check
      if (
        pet.ability.trigger === 'onFaint' &&
        pet.ability.effect === 'revive' &&
        !pet.hasRevived
      ) {
        pet.currentHealth = getAbilityValue(pet);
        pet.hasRevived = true;
        addEvent(state, 'ability', pet.id, pet.id, pet.currentHealth, `${pet.name} revives with ${pet.currentHealth} HP`);
        return;
      }

      addEvent(state, 'faint', pet.id, null, 0, `${pet.name} faints`);

      // Trigger onFaint abilities
      if (pet.ability.trigger === 'onFaint') {
        triggerAbility(pet, state, null, enemyTeam);
      }

      // Trigger onFriendFaint for allies
      team.forEach((ally) => {
        if (ally.id !== pet.id && ally.currentHealth > 0 && ally.ability.trigger === 'onFriendFaint') {
          triggerAbility(ally, state, pet, enemyTeam);
        }
      });

      // Trigger onEnemyFaint for enemies
      enemyTeam.forEach((enemy) => {
        if (enemy.currentHealth > 0 && enemy.ability.trigger === 'onEnemyFaint') {
          triggerAbility(enemy, state, pet, team);
        }
      });
    });

    // Remove dead pets (that didn't revive)
    const deadPets = team.filter((p) => p.currentHealth <= 0);
    deadPets.forEach((pet) => {
      const index = team.indexOf(pet);
      if (index > -1) {
        team.splice(index, 1);
      }
    });
  };

  // Process both teams
  processTeam(state.playerTeam, state.opponentTeam);
  processTeam(state.opponentTeam, state.playerTeam);
}

// Main battle resolution
export function resolveBattle(playerTeam: Pet[], opponentTeam: Pet[]): BattleResult {
  // Clone teams
  const state: BattleState = {
    playerTeam: playerTeam.filter((p) => p !== null).map(clonePet),
    opponentTeam: opponentTeam.filter((p) => p !== null).map(clonePet),
    events: [],
    timestamp: 0,
  };

  addEvent(state, 'battleStart', null, null, 0, 'Battle begins!');

  // Step 2: Trigger startOfBattle abilities (sorted by ATK, highest first)
  const allPets = [...state.playerTeam, ...state.opponentTeam].sort(
    (a, b) => getAttack(b) - getAttack(a)
  );

  allPets.forEach((pet) => {
    if (pet.ability.trigger === 'startOfBattle') {
      const enemyTeam = state.playerTeam.includes(pet) ? state.opponentTeam : state.playerTeam;
      triggerAbility(pet, state, null, enemyTeam);
    }
  });

  // Process any faints from startOfBattle
  processFaints(state);

  // Step 3: Combat loop
  let maxIterations = 100; // Safety limit
  while (state.playerTeam.length > 0 && state.opponentTeam.length > 0 && maxIterations-- > 0) {
    // Select attackers: rightmost player pet vs leftmost opponent pet
    const playerAttacker = state.playerTeam[state.playerTeam.length - 1];
    const opponentAttacker = state.opponentTeam[0];

    // Trigger beforeAttack abilities
    [playerAttacker, opponentAttacker].forEach((pet) => {
      if (pet.ability.trigger === 'beforeAttack') {
        const enemyTeam = state.playerTeam.includes(pet) ? state.opponentTeam : state.playerTeam;
        triggerAbility(pet, state, null, enemyTeam);
      }
    });

    // Apply damage simultaneously
    const playerDamage = getAttack(playerAttacker);
    const opponentDamage = getAttack(opponentAttacker);

    addEvent(
      state,
      'attack',
      playerAttacker.id,
      opponentAttacker.id,
      playerDamage,
      `${playerAttacker.name} attacks ${opponentAttacker.name}`
    );
    addEvent(
      state,
      'attack',
      opponentAttacker.id,
      playerAttacker.id,
      opponentDamage,
      `${opponentAttacker.name} attacks ${playerAttacker.name}`
    );

    const playerResult = applyDamage(opponentAttacker, playerDamage, state, playerAttacker);
    const opponentResult = applyDamage(playerAttacker, opponentDamage, state, opponentAttacker);

    // Trigger onAttack abilities
    [playerAttacker, opponentAttacker].forEach((pet) => {
      if (pet.currentHealth > 0 && pet.ability.trigger === 'onAttack') {
        const enemyTeam = state.playerTeam.includes(pet) ? state.opponentTeam : state.playerTeam;
        triggerAbility(pet, state, null, enemyTeam);
      }
    });

    // Trigger onFriendAttack abilities (Snake)
    state.playerTeam.forEach((pet) => {
      if (pet.id !== playerAttacker.id && pet.ability.trigger === 'onFriendAttack') {
        triggerAbility(pet, state, playerAttacker, state.opponentTeam);
      }
    });
    state.opponentTeam.forEach((pet) => {
      if (pet.id !== opponentAttacker.id && pet.ability.trigger === 'onFriendAttack') {
        triggerAbility(pet, state, opponentAttacker, state.playerTeam);
      }
    });

    // Trigger afterAttack abilities
    [playerAttacker, opponentAttacker].forEach((pet) => {
      if (pet.currentHealth > 0 && pet.ability.trigger === 'afterAttack') {
        const enemyTeam = state.playerTeam.includes(pet) ? state.opponentTeam : state.playerTeam;
        triggerAbility(pet, state, null, enemyTeam);
      }
    });

    // Handle kills and onKill abilities
    if (playerResult.killed && playerAttacker.ability.trigger === 'onKill') {
      triggerAbility(playerAttacker, state, opponentAttacker, state.opponentTeam);
    }
    if (opponentResult.killed && opponentAttacker.ability.trigger === 'onKill') {
      triggerAbility(opponentAttacker, state, playerAttacker, state.playerTeam);
    }

    // Process faints
    processFaints(state);
  }

  // Step 4: Determine winner
  let winner: 'player' | 'opponent' | 'draw';
  let damageDealt = 0;

  if (state.playerTeam.length > 0 && state.opponentTeam.length === 0) {
    winner = 'player';
    damageDealt = state.playerTeam.reduce((sum, pet) => sum + pet.tier, 0);
  } else if (state.opponentTeam.length > 0 && state.playerTeam.length === 0) {
    winner = 'opponent';
    damageDealt = state.opponentTeam.reduce((sum, pet) => sum + pet.tier, 0);
  } else {
    winner = 'draw';
  }

  addEvent(
    state,
    'battleEnd',
    null,
    null,
    damageDealt,
    winner === 'draw' ? 'Battle ends in a draw!' : `${winner === 'player' ? 'Player' : 'Opponent'} wins!`
  );

  return {
    winner,
    playerTeamRemaining: state.playerTeam,
    opponentTeamRemaining: state.opponentTeam,
    events: state.events,
    damageDealt,
  };
}

// Increment battles participated for all pets after battle
export function incrementBattlesParticipated(team: (Pet | null)[]): void {
  team.forEach((pet) => {
    if (pet) {
      pet.battlesParticipated++;
    }
  });
}
