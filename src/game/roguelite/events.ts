import type { RogueliteRunState } from '../../types';

export interface EventChoice {
  text: string;
  effect: string; // Description of what happens
  apply: (state: RogueliteRunState) => RogueliteRunState;
}

export interface RandomEvent {
  id: string;
  title: string;
  description: string;
  choices: EventChoice[];
}

const ZONE_1_EVENTS: RandomEvent[] = [
  {
    id: 'relic_trap',
    title: 'Glimmering Cache',
    description: 'You spot a shimmering chest tucked behind some rocks. It could contain something valuable... or something dangerous.',
    choices: [
      {
        text: 'Open it',
        effect: '50% chance: find a random relic. 50% chance: a random pet takes 5 damage',
        apply: (state) => {
          const lucky = Math.random() < 0.5;
          if (lucky) {
            // Grant a relic — for now give gold as placeholder since relic granting needs shop flow
            return { ...state, gold: state.gold + 10 };
          } else {
            // Random living pet takes 5 damage
            const team = [...state.team];
            const livingIndices = team
              .map((c, i) => (c && !c.isDead ? i : -1))
              .filter((i) => i >= 0);
            if (livingIndices.length > 0) {
              const idx = livingIndices[Math.floor(Math.random() * livingIndices.length)];
              const c = team[idx]!;
              const newHp = Math.max(1, c.currentHealth - 5);
              team[idx] = { ...c, currentHealth: newHp };
            }
            return { ...state, team };
          }
        },
      },
      {
        text: 'Walk away',
        effect: 'Nothing happens',
        apply: (state) => state,
      },
    ],
  },
  {
    id: 'intense_training',
    title: 'Intense Training',
    description: 'You find a secluded clearing perfect for training. One of your creatures seems especially eager to push their limits.',
    choices: [
      {
        text: 'Train hard',
        effect: 'A random pet gains 10 XP but takes 5 damage',
        apply: (state) => {
          const team = [...state.team];
          const livingIndices = team
            .map((c, i) => (c && !c.isDead ? i : -1))
            .filter((i) => i >= 0);
          if (livingIndices.length > 0) {
            const idx = livingIndices[Math.floor(Math.random() * livingIndices.length)];
            const c = team[idx]!;
            const newHp = Math.max(1, c.currentHealth - 5);
            team[idx] = { ...c, xpCurrent: c.xpCurrent + 10, currentHealth: newHp };
          }
          return { ...state, team };
        },
      },
      {
        text: 'Skip training',
        effect: 'Nothing happens',
        apply: (state) => state,
      },
    ],
  },
  {
    id: 'health_transfer',
    title: 'Life Siphon Ritual',
    description: 'A strange altar hums with energy. It seems capable of transferring life force between your creatures.',
    choices: [
      {
        text: 'Perform the ritual',
        effect: 'Transfer 5 health from your highest HP pet to your lowest HP pet',
        apply: (state) => {
          const team = [...state.team];
          const living = team
            .map((c, i) => (c && !c.isDead ? { creature: c, index: i } : null))
            .filter((x): x is { creature: NonNullable<typeof x>['creature']; index: number } => x !== null);
          if (living.length < 2) return { ...state, team };

          let highestIdx = 0;
          let lowestIdx = 0;
          for (let i = 1; i < living.length; i++) {
            if (living[i].creature.currentHealth > living[highestIdx].creature.currentHealth) highestIdx = i;
            if (living[i].creature.currentHealth < living[lowestIdx].creature.currentHealth) lowestIdx = i;
          }
          if (highestIdx === lowestIdx) return { ...state, team };

          const hi = living[highestIdx];
          const lo = living[lowestIdx];
          const transfer = Math.min(5, hi.creature.currentHealth - 1);
          team[hi.index] = { ...hi.creature, currentHealth: hi.creature.currentHealth - transfer };
          team[lo.index] = { ...lo.creature, currentHealth: Math.min(lo.creature.currentHealth + transfer, lo.creature.maxHealth) };
          return { ...state, team };
        },
      },
      {
        text: 'Leave it alone',
        effect: 'Nothing happens',
        apply: (state) => state,
      },
    ],
  },
  {
    id: 'ambush',
    title: 'Ambush!',
    description: 'Two powerful creatures block the path ahead. They look strong, but you might be able to take them.',
    choices: [
      {
        text: 'Fight them',
        effect: 'Each living pet takes 5 damage, but gain 10 gold',
        apply: (state) => {
          const team = state.team.map((c) => {
            if (!c || c.isDead) return c;
            return { ...c, currentHealth: Math.max(1, c.currentHealth - 5) };
          });
          return { ...state, team, gold: state.gold + 10 };
        },
      },
      {
        text: 'Run away',
        effect: 'Escape safely',
        apply: (state) => state,
      },
    ],
  },
  {
    id: 'gamble',
    title: 'Traveling Gambler',
    description: 'A cloaked figure offers you a wager. "Feeling lucky?" they ask with a grin.',
    choices: [
      {
        text: 'Take the gamble',
        effect: '50% chance: receive 15 gold. 50% chance: receive nothing',
        apply: (state) => {
          const lucky = Math.random() < 0.5;
          return { ...state, gold: state.gold + (lucky ? 15 : 0) };
        },
      },
      {
        text: 'Play it safe',
        effect: 'Receive 5 gold',
        apply: (state) => ({ ...state, gold: state.gold + 5 }),
      },
    ],
  },
];

/**
 * Get a random event for the given zone.
 */
export function getRandomEvent(_zoneId: number): RandomEvent {
  // For MVP, all events are Zone 1 events
  const events = ZONE_1_EVENTS;
  return events[Math.floor(Math.random() * events.length)];
}

/**
 * Get a specific event by ID (deterministic lookup).
 */
export function getEventById(eventId: string): RandomEvent | null {
  return ZONE_1_EVENTS.find((e) => e.id === eventId) ?? null;
}
