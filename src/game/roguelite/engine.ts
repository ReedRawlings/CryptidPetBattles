import type {
  RogueliteGameState,
  RogueliteMetaState,
  RogueliteRunState,
  RogueliteCreature,
  RoguelitePhase,
  Creature,
} from '../../types';
import { ROGUELITE_CONSTANTS, type CreatureTemplate, type RelicDefinition } from '../../types';
import { getCreatureTemplate, getCreaturesByTribe } from '../../data/creatures';
import { generateZoneMap, getReachableNodes } from './mapGen';
import { generateRogueliteOpponent } from './opponents';
import { awardXP, createRogueliteCreature } from './leveling';
import { applyBattleResultToTeam, processPostBattleRelics, isTeamWiped, healCreature, reviveCreature } from './battleIntegration';
import { generateRewardChoices } from './rewards';
import { getRandomEvent, getEventById } from './events';
import { resolveBattle } from '../battle';
import { RELIC_DEFINITIONS, getRelicDefinition } from '../../data/relics';

// ============================================================
// Action Types
// ============================================================

export type RogueliteAction =
  | { type: 'INIT_META' }
  | { type: 'START_RUN'; selectedCreatures: { templateId: string; teamIndex: number }[] }
  | { type: 'SELECT_NODE'; nodeId: string }
  | { type: 'START_BATTLE' }
  | { type: 'RESOLVE_BATTLE' }
  | { type: 'CONTINUE_AFTER_BATTLE' }
  | { type: 'CHOOSE_REWARD'; rewardIndex: number; targetCreatureIndex?: number }
  | { type: 'REST_HEAL' }
  | { type: 'REST_REVIVE'; creatureIndex: number }
  | { type: 'REST_XP'; creatureIndex: number }
  | { type: 'RESOLVE_EVENT'; choiceIndex: number }
  | { type: 'SHOP_BUY_CREATURE'; offerIndex: number; teamIndex: number }
  | { type: 'SHOP_BUY_RELIC'; offerIndex: number; teamIndex: number }
  | { type: 'SHOP_BUY_XP'; teamIndex: number }
  | { type: 'SHOP_BUY_HEAL'; teamIndex: number }
  | { type: 'SHOP_BUY_REVIVE'; teamIndex: number }
  | { type: 'LEAVE_SHOP' }
  | { type: 'COMPLETE_RUN' }
  | { type: 'BREED'; parentAIndex: number; parentBIndex: number; abilityChoices: Record<number, 'a' | 'b'> }
  | { type: 'BACK_TO_ROSTER' }
  | { type: 'SWAP_TEAM'; indexA: number; indexB: number }
  | { type: 'ABANDON_RUN' };

export interface RogueliteEngineResult {
  success: boolean;
  state: RogueliteGameState;
  error?: string;
}

// ============================================================
// Initial State
// ============================================================

export function createInitialRogueliteState(): RogueliteGameState {
  return {
    mode: 'roguelite',
    phase: 'roster',
    meta: createInitialMeta(),
    currentRun: null,
    lastBattleResult: null,
    rewardChoices: null,
    selectedNodeId: null,
    enemyTeam: null,
    preBattleTeam: null,
    shopOfferings: null,
    currentEvent: null,
  };
}

function createInitialMeta(): RogueliteMetaState {
  // Start with one random T1 creature per starter tribe
  const starters: string[] = [];
  for (const tribe of ROGUELITE_CONSTANTS.STARTER_TRIBES) {
    const creatures = getCreaturesByTribe(tribe).filter((c) => c.shopTier === 1);
    if (creatures.length > 0) {
      const pick = creatures[Math.floor(Math.random() * creatures.length)];
      starters.push(pick.id);
    }
  }

  return {
    roster: [],
    unlockedZones: [1],
    availableCreatureIds: starters,
    breedingItems: [],
    completedRuns: 0,
    totalBattlesWon: 0,
  };
}

// ============================================================
// Engine Reducer
// ============================================================

export function applyRogueliteAction(
  state: RogueliteGameState,
  action: RogueliteAction
): RogueliteEngineResult {
  switch (action.type) {
    case 'INIT_META':
      return { success: true, state: { ...state, meta: createInitialMeta(), phase: 'roster' } };

    case 'START_RUN':
      return handleStartRun(state, action.selectedCreatures);

    case 'SELECT_NODE':
      return handleSelectNode(state, action.nodeId);

    case 'START_BATTLE':
      return handleStartBattle(state);

    case 'RESOLVE_BATTLE':
      return handleResolveBattle(state);

    case 'CONTINUE_AFTER_BATTLE':
      return handleContinueAfterBattle(state);

    case 'CHOOSE_REWARD':
      return handleChooseReward(state, action.rewardIndex, action.targetCreatureIndex);

    case 'REST_HEAL':
      return handleRestHeal(state);

    case 'REST_REVIVE':
      return handleRestRevive(state, action.creatureIndex);

    case 'REST_XP':
      return handleRestXP(state, action.creatureIndex);

    case 'RESOLVE_EVENT':
      return handleResolveEvent(state, action.choiceIndex);

    case 'SHOP_BUY_CREATURE':
      return handleShopBuyCreature(state, action.offerIndex, action.teamIndex);

    case 'SHOP_BUY_RELIC':
      return handleShopBuyRelic(state, action.offerIndex, action.teamIndex);

    case 'SHOP_BUY_XP':
      return handleShopBuyXP(state, action.teamIndex);

    case 'SHOP_BUY_HEAL':
      return handleShopBuyHeal(state, action.teamIndex);

    case 'SHOP_BUY_REVIVE':
      return handleShopBuyRevive(state, action.teamIndex);

    case 'LEAVE_SHOP':
      return handleLeaveShop(state);

    case 'COMPLETE_RUN':
      return handleCompleteRun(state);

    case 'BREED':
      return handleBreed(state, action);

    case 'BACK_TO_ROSTER':
      return { success: true, state: { ...state, phase: 'roster', currentRun: null } };

    case 'SWAP_TEAM':
      return handleSwapTeam(state, action.indexA, action.indexB);

    case 'ABANDON_RUN':
      return { success: true, state: { ...state, phase: 'point_buy', currentRun: null, lastBattleResult: null, enemyTeam: null, preBattleTeam: null, rewardChoices: null, shopOfferings: null, currentEvent: null } };

    default:
      return { success: false, state, error: `Unknown action` };
  }
}

// ============================================================
// Action Handlers
// ============================================================

function handleStartRun(
  state: RogueliteGameState,
  selectedCreatures: { templateId: string; teamIndex: number }[]
): RogueliteEngineResult {
  if (selectedCreatures.length === 0) {
    return { success: false, state, error: 'Must select at least one creature' };
  }

  // Create the team
  const team: (RogueliteCreature | null)[] = [null, null, null, null, null];

  for (const selection of selectedCreatures) {
    const template = getCreatureTemplate(selection.templateId);
    if (!template) continue;

    // Default tier ceiling: T2 for caught/starter creatures
    const tierCeiling = template.shopTier <= 1 ? 2 : Math.min(template.shopTier + 1, 4);
    const creature = createRogueliteCreature(template, tierCeiling, selection.teamIndex);
    team[selection.teamIndex] = creature;
  }

  const map = generateZoneMap(1); // Zone 1 for MVP

  const run: RogueliteRunState = {
    runId: `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    zoneId: 1,
    map,
    team,
    gold: ROGUELITE_CONSTANTS.STARTING_RUN_GOLD,
    relics: [],
    breedingItemsCollected: [],
    completedNodes: 0,
    runActive: true,
  };

  return {
    success: true,
    state: { ...state, phase: 'map', currentRun: run, lastBattleResult: null, rewardChoices: null, enemyTeam: null, preBattleTeam: null },
  };
}

function handleSelectNode(
  state: RogueliteGameState,
  nodeId: string
): RogueliteEngineResult {
  const run = state.currentRun;
  if (!run) return { success: false, state, error: 'No active run' };

  const node = run.map.nodes.find((n) => n.id === nodeId);
  if (!node) return { success: false, state, error: 'Invalid node' };

  // Verify node is reachable
  const reachable = getReachableNodes(run.map);
  if (!reachable.some((n) => n.id === nodeId)) {
    return { success: false, state, error: 'Node not reachable' };
  }

  const updatedMap = {
    ...run.map,
    currentNodeId: nodeId,
  };

  const updatedRun = { ...run, map: updatedMap };

  // Transition to appropriate phase based on node type
  let phase: RoguelitePhase;
  switch (node.type) {
    case 'battle':
    case 'boss':
      phase = 'battle';
      break;
    case 'shop':
      phase = 'shop';
      break;
    case 'rest':
      phase = 'rest';
      break;
    case 'event':
      phase = 'event';
      break;
    default:
      phase = 'map';
  }

  // Generate shop offerings when entering a shop node
  let shopOfferings = state.shopOfferings;
  if (node.type === 'shop') {
    shopOfferings = generateShopOfferings(run.map.zoneId, node.row);
  }

  // Generate and store event when entering an event node
  let currentEvent = state.currentEvent;
  if (node.type === 'event') {
    const event = getRandomEvent(run.map.zoneId);
    currentEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      choiceCount: event.choices.length,
    };
  }

  return {
    success: true,
    state: { ...state, phase, currentRun: updatedRun, selectedNodeId: nodeId, shopOfferings, currentEvent },
  };
}

function handleStartBattle(state: RogueliteGameState): RogueliteEngineResult {
  return { success: true, state: { ...state, phase: 'battle' } };
}

/**
 * RESOLVE_BATTLE: Run the battle, store the result + enemy team,
 * but stay on phase 'battle' so the UI can animate.
 * Team HP is NOT updated here — that happens in CONTINUE_AFTER_BATTLE.
 */
function handleResolveBattle(state: RogueliteGameState): RogueliteEngineResult {
  const run = state.currentRun;
  if (!run) return { success: false, state, error: 'No active run' };

  const currentNode = run.map.nodes.find((n) => n.id === run.map.currentNodeId);
  if (!currentNode) return { success: false, state, error: 'No current node' };

  // Snapshot pre-battle team for animation
  const preBattleTeam = run.team.map((c) => c ? { ...c } : null) as (RogueliteCreature | null)[];

  // Generate enemy team
  const isBoss = currentNode.type === 'boss';
  const enemyTeam = generateRogueliteOpponent(run.zoneId, currentNode.row, isBoss, currentNode.enemyPreview?.count);

  // Get living team for battle, reassign positions so there's always a frontline
  const livingTeam: Creature[] = run.team
    .filter((c): c is RogueliteCreature => c !== null && !c.isDead)
    .map((c, i) => ({
      ...c,
      position: (i <= 1 ? 'frontline' : 'backline') as 'frontline' | 'backline',
      slotIndex: i <= 1 ? i : i - 2,
      teamIndex: i,
    }));

  // Resolve battle using shared engine
  const battleResult = resolveBattle(livingTeam, enemyTeam);

  // Store result but DON'T update team or transition phase
  return {
    success: true,
    state: {
      ...state,
      phase: 'battle', // stay on battle for animation
      lastBattleResult: battleResult,
      enemyTeam: enemyTeam.map((e) => ({ ...e })), // snapshot for UI
      preBattleTeam,
    },
  };
}

/**
 * CONTINUE_AFTER_BATTLE: Apply battle results to team (HP, XP, gold),
 * mark node completed, and transition to next phase.
 */
function handleContinueAfterBattle(state: RogueliteGameState): RogueliteEngineResult {
  const run = state.currentRun;
  const battleResult = state.lastBattleResult;
  if (!run || !battleResult) return { success: false, state, error: 'No battle result' };

  const currentNode = run.map.nodes.find((n) => n.id === run.map.currentNodeId);
  if (!currentNode) return { success: false, state, error: 'No current node' };

  const isBoss = currentNode.type === 'boss';

  // Apply HP changes back to team
  let updatedTeam = applyBattleResultToTeam(run.team, battleResult);

  // Process post-battle relic effects (Phoenix Down etc.)
  updatedTeam = processPostBattleRelics(updatedTeam as (RogueliteCreature | null)[]);

  // Mark node as completed
  const updatedNodes = run.map.nodes.map((n) =>
    n.id === currentNode.id ? { ...n, completed: true } : n
  );

  // Award XP: 1 per enemy creature defeated
  const enemiesDefeated = (state.enemyTeam?.length ?? 0) - battleResult.opponentTeamRemaining.length;
  const xpEarned = Math.max(enemiesDefeated, 0);
  updatedTeam = (updatedTeam as (RogueliteCreature | null)[]).map((c) => {
    if (!c || c.isDead || xpEarned === 0) return c;
    const template = getCreatureTemplate(c.templateId);
    if (!template) return c;
    return awardXP(c, template, xpEarned);
  });

  // Award gold (+ Kami tribe synergy + Kami Charm relic bonus)
  let goldEarned = ROGUELITE_CONSTANTS.GOLD_PER_BATTLE;

  // Kami tribe synergy: +gold per battle
  const kamiCount = (updatedTeam as (RogueliteCreature | null)[]).filter((c) => c && !c.isDead && c.type === 'Kami').length;
  if (kamiCount >= 5) goldEarned += 3;
  else if (kamiCount >= 3) goldEarned += 2;
  else if (kamiCount >= 2) goldEarned += 1;

  // Kami Charm relic bonus
  for (const c of updatedTeam) {
    if (!c || c.isDead || !c.relic) continue;
    const relicDef = getRelicDefinition(c.relic.definitionId);
    if (!relicDef) continue;
    for (const effect of relicDef.effects) {
      if (effect.trigger === 'on_battle_end' && effect.type === 'bonus_gold') {
        goldEarned += effect.value ?? 0;
      }
    }
  }

  const updatedRun: RogueliteRunState = {
    ...run,
    team: updatedTeam as (RogueliteCreature | null)[],
    map: { ...run.map, nodes: updatedNodes },
    completedNodes: run.completedNodes + 1,
    gold: run.gold + goldEarned,
  };

  // Check for team wipe (run over)
  if (isTeamWiped(updatedRun.team as (RogueliteCreature | null)[])) {
    return {
      success: true,
      state: {
        ...state,
        phase: 'run_complete',
        currentRun: { ...updatedRun, runActive: false },
        lastBattleResult: battleResult,
        rewardChoices: null,
        enemyTeam: null,
        preBattleTeam: null,
      },
    };
  }

  // Check for boss defeated (zone complete)
  if (isBoss && battleResult.winner === 'player') {
    return {
      success: true,
      state: {
        ...state,
        phase: 'run_complete',
        currentRun: { ...updatedRun, runActive: false },
        lastBattleResult: battleResult,
        rewardChoices: null,
        enemyTeam: null,
        preBattleTeam: null,
        meta: {
          ...state.meta,
          totalBattlesWon: state.meta.totalBattlesWon + 1,
        },
      },
    };
  }

  // Generate rewards if player won — offer creatures from the enemy team
  const rewards = battleResult.winner === 'player'
    ? generateRewardChoices(run.zoneId, currentNode.row, updatedRun.team as (RogueliteCreature | null)[], state.enemyTeam ?? [])
    : null;

  return {
    success: true,
    state: {
      ...state,
      phase: battleResult.winner === 'player' ? 'reward' : 'map',
      currentRun: updatedRun,
      lastBattleResult: battleResult,
      rewardChoices: rewards,
      enemyTeam: null,
      preBattleTeam: null,
      meta: battleResult.winner === 'player'
        ? { ...state.meta, totalBattlesWon: state.meta.totalBattlesWon + 1 }
        : state.meta,
    },
  };
}

function handleChooseReward(
  state: RogueliteGameState,
  rewardIndex: number,
  targetCreatureIndex?: number
): RogueliteEngineResult {
  const run = state.currentRun;
  if (!run || !state.rewardChoices) return { success: false, state, error: 'No reward available' };

  const reward = state.rewardChoices[rewardIndex];
  if (!reward) return { success: false, state, error: 'Invalid reward index' };

  let updatedRun = { ...run };
  let updatedMeta = { ...state.meta };

  switch (reward.type) {
    case 'creature': {
      if (!reward.creature) break;
      // Add creature to collection (available for future runs)
      if (!updatedMeta.availableCreatureIds.includes(reward.creature.id)) {
        updatedMeta = {
          ...updatedMeta,
          availableCreatureIds: [...updatedMeta.availableCreatureIds, reward.creature.id],
        };
      }
      // If team has space, add to team
      if (targetCreatureIndex !== undefined) {
        const team = [...updatedRun.team];
        const tierCeiling = reward.creature.shopTier <= 1 ? 2 : Math.min(reward.creature.shopTier + 1, 4);
        const newCreature = createRogueliteCreature(reward.creature, tierCeiling, targetCreatureIndex);
        team[targetCreatureIndex] = newCreature;
        updatedRun = { ...updatedRun, team };
      }
      break;
    }
    case 'xp': {
      if (targetCreatureIndex !== undefined && updatedRun.team[targetCreatureIndex]) {
        const creature = updatedRun.team[targetCreatureIndex] as RogueliteCreature;
        const template = getCreatureTemplate(creature.templateId);
        if (template) {
          const team = [...updatedRun.team];
          team[targetCreatureIndex] = awardXP(creature, template, reward.xpAmount ?? ROGUELITE_CONSTANTS.XP_REWARD_AMOUNT);
          updatedRun = { ...updatedRun, team };
        }
      }
      break;
    }
    case 'breeding_item': {
      if (reward.breedingItemId) {
        updatedRun = {
          ...updatedRun,
          breedingItemsCollected: [...updatedRun.breedingItemsCollected, reward.breedingItemId],
        };
      }
      break;
    }
  }

  return {
    success: true,
    state: {
      ...state,
      phase: 'map',
      currentRun: updatedRun,
      meta: updatedMeta,
      rewardChoices: null,
    },
  };
}

function handleRestHeal(state: RogueliteGameState): RogueliteEngineResult {
  const run = state.currentRun;
  if (!run) return { success: false, state, error: 'No active run' };

  const team = run.team.map((c) => {
    if (!c || c.isDead) return c;
    return healCreature(c, ROGUELITE_CONSTANTS.REST_HEAL_PERCENT);
  });

  // Mark node completed
  const currentNode = run.map.nodes.find((n) => n.id === run.map.currentNodeId);
  const updatedNodes = run.map.nodes.map((n) =>
    n.id === currentNode?.id ? { ...n, completed: true } : n
  );

  return {
    success: true,
    state: {
      ...state,
      phase: 'map',
      currentRun: {
        ...run,
        team,
        map: { ...run.map, nodes: updatedNodes },
        completedNodes: run.completedNodes + 1,
      },
    },
  };
}

function handleRestRevive(state: RogueliteGameState, creatureIndex: number): RogueliteEngineResult {
  const run = state.currentRun;
  if (!run) return { success: false, state, error: 'No active run' };

  const creature = run.team[creatureIndex];
  if (!creature || !creature.isDead) {
    return { success: false, state, error: 'Creature is not dead' };
  }

  const team = [...run.team];
  team[creatureIndex] = reviveCreature(creature, ROGUELITE_CONSTANTS.REST_REVIVE_HP_PERCENT);

  const currentNode = run.map.nodes.find((n) => n.id === run.map.currentNodeId);
  const updatedNodes = run.map.nodes.map((n) =>
    n.id === currentNode?.id ? { ...n, completed: true } : n
  );

  return {
    success: true,
    state: {
      ...state,
      phase: 'map',
      currentRun: {
        ...run,
        team,
        map: { ...run.map, nodes: updatedNodes },
        completedNodes: run.completedNodes + 1,
      },
    },
  };
}

const REST_XP_AMOUNT = 5;

function handleRestXP(state: RogueliteGameState, creatureIndex: number): RogueliteEngineResult {
  const run = state.currentRun;
  if (!run) return { success: false, state, error: 'No active run' };

  const creature = run.team[creatureIndex];
  if (!creature || creature.isDead) {
    return { success: false, state, error: 'No living creature at that slot' };
  }

  const template = getCreatureTemplate(creature.templateId);
  if (!template) return { success: false, state, error: 'Template not found' };

  const team = [...run.team];
  team[creatureIndex] = awardXP(creature, template, REST_XP_AMOUNT);

  const currentNode = run.map.nodes.find((n) => n.id === run.map.currentNodeId);
  const updatedNodes = run.map.nodes.map((n) =>
    n.id === currentNode?.id ? { ...n, completed: true } : n
  );

  return {
    success: true,
    state: {
      ...state,
      phase: 'map',
      currentRun: {
        ...run,
        team,
        map: { ...run.map, nodes: updatedNodes },
        completedNodes: run.completedNodes + 1,
      },
    },
  };
}

function handleResolveEvent(state: RogueliteGameState, choiceIndex: number): RogueliteEngineResult {
  const run = state.currentRun;
  if (!run) return { success: false, state, error: 'No active run' };

  // Use the stored event ID (set during SELECT_NODE)
  if (!state.currentEvent) return { success: false, state, error: 'No current event' };
  const event = getEventById(state.currentEvent.id);
  if (!event) return { success: false, state, error: 'Event not found' };

  const choice = event.choices[choiceIndex];
  if (!choice) return { success: false, state, error: 'Invalid choice' };

  // Apply the effect
  const updatedRun = choice.apply(run);

  const currentNode = run.map.nodes.find((n) => n.id === run.map.currentNodeId);
  const updatedNodes = updatedRun.map.nodes.map((n) =>
    n.id === currentNode?.id ? { ...n, completed: true } : n
  );

  return {
    success: true,
    state: {
      ...state,
      phase: 'map',
      currentEvent: null,
      currentRun: {
        ...updatedRun,
        map: { ...updatedRun.map, nodes: updatedNodes },
        completedNodes: updatedRun.completedNodes + 1,
      },
    },
  };
}

function handleCompleteRun(state: RogueliteGameState): RogueliteEngineResult {
  const run = state.currentRun;
  if (!run) return { success: false, state, error: 'No active run' };

  // Decrement lifespan for all creatures in roster
  const updatedRoster = state.meta.roster.map((c) => ({
    ...c,
    runsRemaining: c.runsRemaining - 1,
  }));

  // Bank breeding items
  const updatedBreedingItems = [
    ...state.meta.breedingItems,
    ...run.breedingItemsCollected,
  ];

  return {
    success: true,
    state: {
      ...state,
      phase: 'roster',
      currentRun: null,
      meta: {
        ...state.meta,
        roster: updatedRoster,
        breedingItems: updatedBreedingItems,
        completedRuns: state.meta.completedRuns + 1,
      },
    },
  };
}

function handleBreed(
  state: RogueliteGameState,
  action: { parentAIndex: number; parentBIndex: number; abilityChoices: Record<number, 'a' | 'b'> }
): RogueliteEngineResult {
  const { breedCreatures, canBreed: canBreedCheck } = require('./breeding');

  const parentA = state.meta.roster[action.parentAIndex];
  const parentB = state.meta.roster[action.parentBIndex];

  if (!parentA || !parentB) {
    return { success: false, state, error: 'Invalid parent indices' };
  }

  if (!canBreedCheck(parentA, parentB)) {
    return { success: false, state, error: 'Cannot breed these creatures' };
  }

  const offspring = breedCreatures(parentA, parentB, action.abilityChoices);
  if (!offspring) {
    return { success: false, state, error: 'Breeding failed' };
  }

  // Remove parents, add offspring
  const updatedRoster = state.meta.roster.filter(
    (_, i) => i !== action.parentAIndex && i !== action.parentBIndex
  );
  updatedRoster.push(offspring);

  return {
    success: true,
    state: {
      ...state,
      phase: 'roster',
      meta: { ...state.meta, roster: updatedRoster },
    },
  };
}

// ============================================================
// Shop Handlers
// ============================================================

function generateShopOfferings(zoneId: number, nodeRow: number): { creatures: { template: CreatureTemplate; cost: number }[]; relics: { definition: RelicDefinition; cost: number }[] } {
  const tribes = ROGUELITE_CONSTANTS.STARTER_TRIBES;

  // 3 creature offers scaled to zone progress
  let maxShopTier = 1;
  if (zoneId === 1 && nodeRow >= 8) maxShopTier = 2;
  if (zoneId >= 2) maxShopTier = Math.min(zoneId + 1, 4);

  const creatures: { template: CreatureTemplate; cost: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const tribe = tribes[Math.floor(Math.random() * tribes.length)];
    const pool = getCreaturesByTribe(tribe).filter((t) => t.shopTier <= maxShopTier);
    if (pool.length > 0) {
      const template = pool[Math.floor(Math.random() * pool.length)];
      creatures.push({ template, cost: 3 + template.shopTier });
    }
  }

  // 1-2 relic offers
  const relicCount = nodeRow >= 6 ? 2 : 1;
  const relics: { definition: RelicDefinition; cost: number }[] = [];
  const available = [...RELIC_DEFINITIONS];
  for (let i = 0; i < relicCount && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length);
    const def = available.splice(idx, 1)[0];
    relics.push({ definition: def, cost: def.shopCost });
  }

  return { creatures, relics };
}

function handleShopBuyCreature(
  state: RogueliteGameState,
  offerIndex: number,
  teamIndex: number
): RogueliteEngineResult {
  const run = state.currentRun;
  const offerings = state.shopOfferings;
  if (!run || !offerings) return { success: false, state, error: 'No active run or shop' };

  const offer = offerings.creatures[offerIndex];
  if (!offer) return { success: false, state, error: 'Invalid offer index' };
  if (run.gold < offer.cost) return { success: false, state, error: 'Not enough gold' };
  if (teamIndex < 0 || teamIndex >= 5) return { success: false, state, error: 'Invalid team index' };

  // Must target an empty slot or replace an existing creature
  const existing = run.team[teamIndex];
  if (existing && !existing.isDead) {
    return { success: false, state, error: 'Slot is occupied by a living creature' };
  }

  const tierCeiling = offer.template.shopTier <= 1 ? 2 : Math.min(offer.template.shopTier + 1, 4);
  const newCreature = createRogueliteCreature(offer.template, tierCeiling, teamIndex);

  const team = [...run.team];
  team[teamIndex] = newCreature;

  // Remove the offer
  const updatedCreatures = [...offerings.creatures];
  updatedCreatures.splice(offerIndex, 1);

  // Unlock this creature for future starter selection
  let updatedMeta = state.meta;
  if (!updatedMeta.availableCreatureIds.includes(offer.template.id)) {
    updatedMeta = {
      ...updatedMeta,
      availableCreatureIds: [...updatedMeta.availableCreatureIds, offer.template.id],
    };
  }

  return {
    success: true,
    state: {
      ...state,
      meta: updatedMeta,
      currentRun: { ...run, team, gold: run.gold - offer.cost },
      shopOfferings: { ...offerings, creatures: updatedCreatures },
    },
  };
}

function handleShopBuyRelic(
  state: RogueliteGameState,
  offerIndex: number,
  teamIndex: number
): RogueliteEngineResult {
  const run = state.currentRun;
  const offerings = state.shopOfferings;
  if (!run || !offerings) return { success: false, state, error: 'No active run or shop' };

  const offer = offerings.relics[offerIndex];
  if (!offer) return { success: false, state, error: 'Invalid relic offer index' };
  if (run.gold < offer.cost) return { success: false, state, error: 'Not enough gold' };
  if (teamIndex < 0 || teamIndex >= 5) return { success: false, state, error: 'Invalid team index' };

  const creature = run.team[teamIndex];
  if (!creature || creature.isDead) return { success: false, state, error: 'No living creature at that slot' };

  const team = [...run.team];
  team[teamIndex] = {
    ...creature,
    relic: {
      definitionId: offer.definition.id,
      remainingUses: offer.definition.consumable ? (offer.definition.maxUses ?? 1) : null,
    },
  };

  const updatedRelics = [...offerings.relics];
  updatedRelics.splice(offerIndex, 1);

  return {
    success: true,
    state: {
      ...state,
      currentRun: { ...run, team, gold: run.gold - offer.cost },
      shopOfferings: { ...offerings, relics: updatedRelics },
    },
  };
}

const SHOP_XP_COST = 10;
const SHOP_HEAL_COST = 5;
const SHOP_REVIVE_COST = 8;

function handleShopBuyXP(
  state: RogueliteGameState,
  teamIndex: number
): RogueliteEngineResult {
  const run = state.currentRun;
  if (!run) return { success: false, state, error: 'No active run' };
  if (run.gold < SHOP_XP_COST) return { success: false, state, error: 'Not enough gold' };

  const creature = run.team[teamIndex];
  if (!creature || creature.isDead) return { success: false, state, error: 'No living creature at that slot' };

  const template = getCreatureTemplate(creature.templateId);
  if (!template) return { success: false, state, error: 'Template not found' };

  const leveled = awardXP(creature, template, ROGUELITE_CONSTANTS.XP_REWARD_AMOUNT);
  const team = [...run.team];
  team[teamIndex] = leveled;

  return {
    success: true,
    state: {
      ...state,
      currentRun: { ...run, team, gold: run.gold - SHOP_XP_COST },
    },
  };
}

function handleShopBuyHeal(
  state: RogueliteGameState,
  teamIndex: number
): RogueliteEngineResult {
  const run = state.currentRun;
  if (!run) return { success: false, state, error: 'No active run' };
  if (run.gold < SHOP_HEAL_COST) return { success: false, state, error: 'Not enough gold' };

  const creature = run.team[teamIndex];
  if (!creature || creature.isDead) return { success: false, state, error: 'No living creature at that slot' };
  if (creature.currentHealth >= creature.maxHealth) return { success: false, state, error: 'Already at full HP' };

  const healed = healCreature(creature, 0.5);
  const team = [...run.team];
  team[teamIndex] = healed;

  return {
    success: true,
    state: {
      ...state,
      currentRun: { ...run, team, gold: run.gold - SHOP_HEAL_COST },
    },
  };
}

function handleShopBuyRevive(
  state: RogueliteGameState,
  teamIndex: number
): RogueliteEngineResult {
  const run = state.currentRun;
  if (!run) return { success: false, state, error: 'No active run' };
  if (run.gold < SHOP_REVIVE_COST) return { success: false, state, error: 'Not enough gold' };

  const creature = run.team[teamIndex];
  if (!creature || !creature.isDead) return { success: false, state, error: 'No dead creature at that slot' };

  const revived = reviveCreature(creature, 0.25);
  const team = [...run.team];
  team[teamIndex] = revived;

  return {
    success: true,
    state: {
      ...state,
      currentRun: { ...run, team, gold: run.gold - SHOP_REVIVE_COST },
    },
  };
}

function handleLeaveShop(state: RogueliteGameState): RogueliteEngineResult {
  const run = state.currentRun;
  if (!run) return { success: false, state, error: 'No active run' };

  // Mark node completed
  const currentNode = run.map.nodes.find((n) => n.id === run.map.currentNodeId);
  const updatedNodes = run.map.nodes.map((n) =>
    n.id === currentNode?.id ? { ...n, completed: true } : n
  );

  return {
    success: true,
    state: {
      ...state,
      phase: 'map',
      shopOfferings: null,
      currentRun: {
        ...run,
        map: { ...run.map, nodes: updatedNodes },
        completedNodes: run.completedNodes + 1,
      },
    },
  };
}

function handleSwapTeam(
  state: RogueliteGameState,
  indexA: number,
  indexB: number
): RogueliteEngineResult {
  const run = state.currentRun;
  if (!run) return { success: false, state, error: 'No active run' };
  if (indexA < 0 || indexA >= 5 || indexB < 0 || indexB >= 5 || indexA === indexB) {
    return { success: false, state, error: 'Invalid swap indices' };
  }

  const team = [...run.team];
  const temp = team[indexA];
  team[indexA] = team[indexB];
  team[indexB] = temp;

  // Update teamIndex and position fields
  for (let i = 0; i < team.length; i++) {
    if (team[i]) {
      team[i] = {
        ...team[i]!,
        teamIndex: i,
        position: i < 2 ? 'frontline' : 'backline',
        slotIndex: i < 2 ? i : i - 2,
      };
    }
  }

  return {
    success: true,
    state: {
      ...state,
      currentRun: { ...run, team },
    },
  };
}
