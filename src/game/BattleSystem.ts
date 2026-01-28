import { Pet, Player, BattleResult, BattleEvent } from '../models/types';
import { clonePet, hasFainted, applyDamage, healPet, getAbilityValue } from '../models/Pet';
import {
  BattleContext,
  createBattleEvent,
  executeAbility,
  triggerAbilitiesForTeam,
  handleReborn,
  applyPassiveAbility,
  getRandomPet,
} from './AbilitySystem';

/**
 * Main battle resolution system
 * Battles are resolved deterministically using the algorithm from the PRD
 */

/**
 * Clone a team of pets for battle (to avoid mutating original state)
 */
function cloneTeam(team: (Pet | null)[]): Pet[] {
  return team
    .filter((p): p is Pet => p !== null)
    .map((p) => clonePet(p));
}

/**
 * Get the rightmost (attacking) pet from a team
 * In our array, rightmost = highest index (front line)
 */
function getRightmostPet(team: Pet[]): Pet | null {
  for (let i = team.length - 1; i >= 0; i--) {
    if (!hasFainted(team[i])) {
      return team[i];
    }
  }
  return null;
}

/**
 * Get the leftmost (defending) pet from a team
 * In our array, leftmost = lowest index among alive pets
 */
function getLeftmostPet(team: Pet[]): Pet | null {
  for (let i = 0; i < team.length; i++) {
    if (!hasFainted(team[i])) {
      return team[i];
    }
  }
  return null;
}

/**
 * Remove fainted pets from a team and compact
 */
function removeFaintedPets(team: Pet[]): Pet[] {
  return team.filter((p) => !hasFainted(p));
}

/**
 * Process pending summons after faints
 */
function processSummons(context: BattleContext): void {
  for (const summon of context.pendingSummons) {
    const team = summon.team === 'player' ? context.playerTeam : context.opponentTeam;

    // Insert at the position of the fainted pet (or at end if no space)
    if (team.length < 5) {
      // Find the best position to insert
      const insertPos = Math.min(summon.position, team.length);
      team.splice(insertPos, 0, summon.pet);

      // Trigger onSummon for all pets
      triggerAbilitiesForTeam(team, 'onSummon', context, summon.team === 'player');

      // Trigger onFriendSummoned for allies
      for (const pet of team) {
        if (pet.id !== summon.pet.id && pet.ability.trigger === 'onFriendSummoned') {
          executeAbility(pet, 'onFriendSummoned', context, summon.team === 'player');
        }
      }
    }
  }
  context.pendingSummons = [];
}

/**
 * Check and process faints for both teams
 */
function processFaints(
  context: BattleContext,
  recentlyDamaged: { player: Pet[]; opponent: Pet[] }
): void {
  // Check player team faints
  for (const pet of recentlyDamaged.player) {
    if (hasFainted(pet) && !handleReborn(pet, context)) {
      // Trigger onFaint for the fainted pet
      executeAbility(pet, 'onFaint', context, true);

      // Trigger onFriendFaint for allies
      for (const ally of context.playerTeam) {
        if (ally.id !== pet.id && !hasFainted(ally) && ally.ability.trigger === 'onFriendFaint') {
          executeAbility(ally, 'onFriendFaint', context, true);
        }
      }

      // Trigger onEnemyFaint for opponents
      triggerAbilitiesForTeam(context.opponentTeam, 'onEnemyFaint', context, false);

      context.events.push(
        createBattleEvent('faint', pet.id, null, 0, `${pet.name} has fainted!`, context.timestamp++)
      );
    }
  }

  // Check opponent team faints
  for (const pet of recentlyDamaged.opponent) {
    if (hasFainted(pet) && !handleReborn(pet, context)) {
      // Trigger onFaint for the fainted pet
      executeAbility(pet, 'onFaint', context, false);

      // Trigger onFriendFaint for allies
      for (const ally of context.opponentTeam) {
        if (ally.id !== pet.id && !hasFainted(ally) && ally.ability.trigger === 'onFriendFaint') {
          executeAbility(ally, 'onFriendFaint', context, false);
        }
      }

      // Trigger onEnemyFaint for opponents
      triggerAbilitiesForTeam(context.playerTeam, 'onEnemyFaint', context, true);

      context.events.push(
        createBattleEvent('faint', pet.id, null, 0, `${pet.name} has fainted!`, context.timestamp++)
      );
    }
  }

  // Process any pending summons from onFaint abilities
  processSummons(context);

  // Remove fainted pets
  context.playerTeam = removeFaintedPets(context.playerTeam);
  context.opponentTeam = removeFaintedPets(context.opponentTeam);
}

/**
 * Execute a single attack between two pets
 */
function executeAttack(
  attacker: Pet,
  defender: Pet,
  context: BattleContext,
  attackerIsPlayer: boolean
): { attackerDied: boolean; defenderDied: boolean; defenderKilled?: Pet } {
  const attackerTeam = attackerIsPlayer ? context.playerTeam : context.opponentTeam;
  const defenderTeam = attackerIsPlayer ? context.opponentTeam : context.playerTeam;

  // Trigger beforeAttack
  executeAbility(attacker, 'beforeAttack', context, attackerIsPlayer);

  // Apply passive damage reduction (e.g., Golem)
  const damageToDefender = applyPassiveAbility(defender, attacker.currentAttack);
  const damageToAttacker = applyPassiveAbility(attacker, defender.currentAttack);

  // Apply damage simultaneously
  const actualDamageToDefender = applyDamage(defender, damageToDefender);
  const actualDamageToAttacker = applyDamage(attacker, damageToAttacker);

  // Log attack events
  context.events.push(
    createBattleEvent(
      'attack',
      attacker.id,
      defender.id,
      actualDamageToDefender,
      `${attacker.name} attacks ${defender.name} for ${actualDamageToDefender} damage`,
      context.timestamp++
    )
  );

  context.events.push(
    createBattleEvent(
      'damage',
      defender.id,
      attacker.id,
      actualDamageToAttacker,
      `${defender.name} deals ${actualDamageToAttacker} damage to ${attacker.name}`,
      context.timestamp++
    )
  );

  // Trigger onAttack for attacker
  executeAbility(attacker, 'onAttack', context, attackerIsPlayer);

  // Trigger onFriendAttack for attacker's allies (Snake ability)
  for (const ally of attackerTeam) {
    if (ally.id !== attacker.id && !hasFainted(ally) && ally.ability.trigger === 'onFriendAttack') {
      executeAbility(ally, 'onFriendAttack', context, attackerIsPlayer);
    }
  }

  // Trigger afterAttack
  executeAbility(attacker, 'afterAttack', context, attackerIsPlayer);

  // Trigger onHurt for both if they took damage
  if (actualDamageToDefender > 0) {
    executeAbility(defender, 'onHurt', context, !attackerIsPlayer, { attacker });
  }
  if (actualDamageToAttacker > 0) {
    executeAbility(attacker, 'onHurt', context, attackerIsPlayer, { attacker: defender });
  }

  const defenderDied = hasFainted(defender);
  const attackerDied = hasFainted(attacker);

  // Trigger onKill if defender died
  if (defenderDied && !attackerDied) {
    // Special handling for Vampire's heal on kill
    if (attacker.ability.trigger === 'onKill' && attacker.templateId === 'vampire') {
      const healAmount = defender.currentAttack > 0 ? defender.currentAttack : defender.baseAttack;
      const actualHeal = healPet(attacker, healAmount);
      if (actualHeal > 0) {
        context.events.push(
          createBattleEvent(
            'heal',
            attacker.id,
            attacker.id,
            actualHeal,
            `${attacker.name} drains ${actualHeal} HP from ${defender.name}`,
            context.timestamp++
          )
        );
      }
    } else {
      executeAbility(attacker, 'onKill', context, attackerIsPlayer, { killed: defender });
    }
  }

  return {
    attackerDied,
    defenderDied,
    defenderKilled: defenderDied ? defender : undefined
  };
}

/**
 * Resolve a complete battle between two teams
 */
export function resolveBattle(playerTeam: (Pet | null)[], opponentTeam: (Pet | null)[]): BattleResult {
  // Step 1: Clone both teams
  const clonedPlayerTeam = cloneTeam(playerTeam);
  const clonedOpponentTeam = cloneTeam(opponentTeam);

  const context: BattleContext = {
    playerTeam: clonedPlayerTeam,
    opponentTeam: clonedOpponentTeam,
    events: [],
    timestamp: 0,
    pendingSummons: [],
  };

  // Add battle start event
  context.events.push(
    createBattleEvent('battle_start', null, null, 0, 'Battle begins!', context.timestamp++)
  );

  // Step 2: Trigger startOfBattle abilities (highest ATK first)
  const allPets = [
    ...clonedPlayerTeam.map((p) => ({ pet: p, isPlayer: true })),
    ...clonedOpponentTeam.map((p) => ({ pet: p, isPlayer: false })),
  ].sort((a, b) => b.pet.currentAttack - a.pet.currentAttack);

  for (const { pet, isPlayer } of allPets) {
    if (pet.ability.trigger === 'startOfBattle') {
      executeAbility(pet, 'startOfBattle', context, isPlayer);
    }
  }

  // Process any faints from startOfBattle abilities
  processFaints(context, {
    player: context.playerTeam,
    opponent: context.opponentTeam,
  });

  // Step 3: Combat loop
  let iterations = 0;
  const maxIterations = 100; // Safety limit
  let playersTurn = true; // Alternate turns, starting with player

  while (
    context.playerTeam.length > 0 &&
    context.opponentTeam.length > 0 &&
    iterations < maxIterations
  ) {
    iterations++;

    // Select attackers: rightmost from attacking team, leftmost from defending team
    const playerAttacker = getRightmostPet(context.playerTeam);
    const opponentDefender = getLeftmostPet(context.opponentTeam);

    if (!playerAttacker || !opponentDefender) {
      break;
    }

    // Execute attack (both deal damage simultaneously)
    const result = executeAttack(playerAttacker, opponentDefender, context, true);

    // Process faints
    processFaints(context, {
      player: result.attackerDied ? [playerAttacker] : [],
      opponent: result.defenderDied ? [opponentDefender] : [],
    });
  }

  // Step 4: Determine winner
  const playerRemaining = context.playerTeam.filter((p) => !hasFainted(p));
  const opponentRemaining = context.opponentTeam.filter((p) => !hasFainted(p));

  let winner: 'player' | 'opponent' | 'draw';
  if (playerRemaining.length > 0 && opponentRemaining.length === 0) {
    winner = 'player';
  } else if (opponentRemaining.length > 0 && playerRemaining.length === 0) {
    winner = 'opponent';
  } else {
    winner = 'draw';
  }

  // Calculate damage dealt (for life loss calculation)
  const damageDealt = playerRemaining.reduce((sum, p) => sum + p.tier, 0);

  context.events.push(
    createBattleEvent(
      'battle_end',
      null,
      null,
      0,
      winner === 'draw' ? 'Battle ended in a draw!' : `${winner === 'player' ? 'Player' : 'Opponent'} wins!`,
      context.timestamp++
    )
  );

  return {
    winner,
    playerTeamRemaining: playerRemaining,
    opponentTeamRemaining: opponentRemaining,
    events: context.events,
    damageDealt,
  };
}

/**
 * Simulate a battle for AI/matchmaking purposes (no events, just result)
 */
export function simulateBattle(playerTeam: (Pet | null)[], opponentTeam: (Pet | null)[]): {
  winner: 'player' | 'opponent' | 'draw';
  playerSurvivors: number;
  opponentSurvivors: number;
} {
  const result = resolveBattle(playerTeam, opponentTeam);
  return {
    winner: result.winner,
    playerSurvivors: result.playerTeamRemaining.length,
    opponentSurvivors: result.opponentTeamRemaining.length,
  };
}

/**
 * Calculate the damage a losing player takes based on remaining enemy pets
 */
export function calculateDamageTaken(remainingEnemies: Pet[]): number {
  // Damage = sum of tier values of surviving enemy pets (minimum 1)
  const damage = remainingEnemies.reduce((sum, pet) => sum + pet.tier, 0);
  return Math.max(1, damage);
}
