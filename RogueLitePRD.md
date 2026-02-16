# Creature Collector Roguelite — Product Requirements Document v2

## Overview

A creature collector roguelite where autobattles are the primary combat mechanic. Players build teams of creatures, enhance them through XP and tier milestones during runs, and invest in long-term progression through breeding between runs. Creatures have limited lifespans measured in runs, forcing constant roster turnover and encouraging exploration. The game is divided into zones of escalating difficulty, with higher zones requiring stronger bred creatures to access.

We leverage the work done from our competitive auto battler to build the base of this game. This is an alternate game type available to players we may break out into it's own game later

---

## MVP Scope

### Core Loop

1. **Pre-Run:** Player spends 10 points on a starter roster using the point-buy system
2. **During Run:** Player navigates a path-based structure similar to slay the spire, completing quests (autobattle encounters), collecting creatures, earning relics, and enhancing their team
3. **Boss:** After ~14 events, a boss encounter triggers as the run climax
4. **Post-Run:** Player breeds creatures or retires them, manages roster, and returns to point-buy for the next run

---

### Autobattle Combat

**Positioning:** Front row / back row. Front row absorbs damage, back row is protected. Creature placement is the player's primary combat decision.

**Creature Roles:** Each creature fills a recognizable role — tank, damage dealer, support — with abilities that are visibly distinct during battle. The player should be able to watch a fight and understand what each creature is doing and why it matters.

**Creature Types:** Multiple types with innate synergies. Having multiple creatures of the same type on a team produces observable bonuses or interactions.

**All creatures fight:** Every creature in the party participates in every battle. No benching. This means all creatures gain XP together, though post-fight XP rewards can be directed to a single creature to push it ahead.

**Battle Pacing:** Fights last 30–60 seconds with a speed-up option. The player must be able to diagnose why they won or lost from watching the fight. 

**Abilities:** Trigger-based system. Abilities fire based on conditions ("when an ally takes damage," "on kill," "at start of battle") rather than player input. Creatures can have up to four abilities, one earned/inherited at each tier.

**Loss Condition:** When all creatures in the party die, the run is over. Downed creatures can be revived (via relics or rest points). Health does not reset between battles.

---

### Creature Progression — Tier System

**Tiers are the core progression mechanic for creatures.** Every creature has a tier ceiling — the maximum tier it can reach through XP alone. Tiers are permanent milestones; once a creature hits a new tier during a run, it stays at that tier.

**Hitting a new tier unlocks a new ability.** Each tier grants one ability slot, up to a maximum of four abilities at Tier 4.

**Tier ceiling is determined by breeding lineage:**

| Creature Origin | Tier Ceiling | How to Get |
|----------------|-------------|------------|
| Caught / Starter | Tier 2 | Found during runs, shops, point-buy |
| Bred from two maxed Tier 2s | Tier 3 | Breeding between runs |
| Bred from two maxed Tier 3s | Tier 4 | Breeding between runs |
| Bred from two maxed Tier 4s | Tier 4 (maxed) | Breeding between runs |

**A creature with Tier 3 potential starts at Tier 1.** "Tier 3 creature" means it has the ceiling of Tier 3, not that it starts there. It still needs to be leveled through runs to hit each tier milestone and unlock abilities along the way.

**Both parents must be at their max tier to produce a higher-ceiling offspring.** If one or both parents are not maxed, the offspring's ceiling is one tier lower than it would have been. So breeding a Tier 4 and a Tier 1 produces a Tier 3. Breeding a Tier 3 and a Tier 1 produces a Tier 2

---

### Creature Lifespan

**Every creature has a limited number of runs before it must be bred or retired.** Lifespan is randomized at creation within a range determined by tier ceiling.

| Tier Ceiling | Lifespan Range |
|-------------|---------------|
| Tier 1 (caught/starter) | 3–7 runs |
| Tier 2 | 7–12 runs |
| Tier 3 | 12–17 runs |
| Tier 4 | 17–24 runs (TBD) |

**Lifespan does not carry through breeding.** Offspring get a fresh randomized lifespan based on their new tier ceiling, regardless of parents' remaining runs.

**Lifespan is visible to the player.** The creature's remaining runs are always displayed. No hidden timers.

**When lifespan expires, the player must either:**
- **Breed** the creature (consumes both parents, produces offspring with higher potential)
- **Retire** the creature (creature is gone; retired creatures unlock lower point-buy costs for that species, or other minor meta benefit — TBD)

**Why lifespan matters:** Without lifespan, the optimal strategy is to keep the same team forever and never engage with catching or breeding. Lifespan forces constant roster turnover, which means the player is always scouting for new creatures, always planning their next breeding pair, and always experimenting with new team compositions.

---

### Ability Inheritance

**Creatures can have up to four abilities, one from each tier.** Abilities are unlocked as a creature reaches each tier milestone during runs.

**How abilities are determined depends on whether the tier has been reached by the creature's lineage before:**

- **Inherited tiers (tiers a parent already reached):** The player chooses which parent's ability to pass down at breeding time. When the offspring hits that tier during a run, it unlocks the chosen ability. This is a known quantity — the player picked it.
- **New frontier tier (the tier only this generation can reach):** The creature gets a random ability from the pool for its species/type. This is a discovery moment — the player doesn't know what they'll get.

**Example — leveling a Tier 3 creature:**

1. **Hits Tier 1 cap during a run:** Unlocks the Tier 1 ability the player chose from its parents at breeding time. Expected, satisfying.
2. **Hits Tier 2 cap during a run:** Unlocks the Tier 2 ability the player chose from its parents at breeding time. Again, a known payoff.
3. **Hits Tier 3 cap during a run:** Gets a random Tier 3 ability. Neither parent could reach Tier 3, so there's nothing to inherit. This is new territory.

**Example — breeding two Tier 3 creatures into a Tier 4:**

Each parent has three abilities (Tier 1, 2, and 3). The player selects which Tier 1 ability to inherit (from parent A or B), which Tier 2 ability to inherit, and which Tier 3 ability to inherit. The Tier 4 ability will be random when the offspring eventually reaches Tier 4 during runs.

**Pattern:** Control the past, gamble on the future. Inherited tiers are player choice, the frontier tier is always random. This gives breeding a curated, intentional feel while keeping each new generation exciting.

---

### Zone Progression

**The game is divided into zones of escalating difficulty.** Each zone has harder enemies, new creature types, better relics, and a boss.

| Zone | Approximate Tier Needed | Creature Pool |
|------|------------------------|---------------|
| Zone 1 | Tier 1-2 | Most events contain tier 1 creatures until the last 3, which comprise some tier 2 |
| Zone 2 | Tier 2-3 | Most events contain tier 2 creatures until the last 3, which comprise some tier 3 |
| Zone 3 | Tier 3-4 | Most events contain tier 3 creatures until the last 3, which comprise some tier 4 |
| Zone 4 | Tier 3-4 | Mostly Tier 4 with some Tier 3 scattered about |

**Once a zone's boss is defeated, the next zone unlocks.** On future runs, the player can choose to start at any unlocked zone, but they must beat one of the randomized bosses from Zone 1 before starting. Winning this battle gets them extra XP to start, some relics. Starting at a higher zone skips the buildup of earlier zones but requires a roster strong enough to handle the difficulty immediately.

**Reasons to return to earlier zones:** Farm breeding material, catch specific creatures for ability inheritance, try new team compositions in a lower-stakes environment, find zone-exclusive creatures needed for later breeding plans.

---

### Run Structure

**Shape (MVP):** Path-based. After each encounter, the player chooses between 2–3 offered encounters/nodes.

**Run Length:** 14 events plus a boss encounter (15 total).

**Node Types:**
- **Quest/Battle** — autobattle encounter with a post-fight reward screen
- **Shop** — purchase creatures, relics, or items with run currency
- **Rest Point** — heal creatures, swap team composition (choose one)
- **Random Event** — narrative encounters with risk/reward choices

#### Random Events
- 50% chance to find a random relic. 50% chance to take 5 damage to a random pet. 
- A random pet gains 10XP but takes 5 damage
- Transfer 5 health from your highest health pet to your lowest health OR do nothing
- Fight a two tier 2 enemies or RUN away
- Receive 5 gold or 50% chance to receive 15 gold


**Telegraphing:** Before choosing the next encounter, the player sees the next 2–3 upcoming fights including enemy team composition.

**Levels:** At the end of each battle creatures earn a bit of experience pushing them towards the next level. These levels are part if the tier structure. If a creature reaches level 10 during the run it achieves tier 2 unlocking its tier 2 ability. Levels reset at the end of each run. So if a creature reaches Level 9 and the run ends it will start the next run at level 1. If it reaches level 10, it will start the next run at level 1 BUT have its unlocked Tier 2 ability

POST MVP
**Medium-Complexity Moments (1–2 per run):** A small number of quests have order-dependent outcomes. Completing a specific quest early may unlock a bonus shop; failing to address a quest in time removes it. These are scripted exceptions designed to make the town feel reactive.

---

### Post-Fight Reward Screen

After every battle, the player picks one of three rewards:

| Reward | Effect | Time Horizon |
|--------|--------|-------------|
| **New Creature** | Add to party (if under 5) or swap with existing member | Immediate |
| **XP** | Boost a single chosen creature toward its next tier milestone | This run |
| **Breeding Item** | Banked for between-run breeding; enhances offspring (better starting stats, starts with an extra tier ability unlocked at tier 1, longevity, reroll one tier ability) | Across runs |

**Creature offerings scale with run progress.** Early fights offer simple creatures. Catching a creature allows you to try it next run. Expanding your potential collection. Late-run offers are powerful creatures that tempt restructuring before the boss. Captured creatures only keep their tiers if added to your party, otherwise they just unlock as options for the next run. 

**Party cap: 5 creatures.** Once at 5, choosing a new creature requires cutting one.

**XP rewards go to a single creature chosen by the player.** This lets the player push one creature ahead of the others toward a tier milestone, which is strategically important when planning breeding pairs. 

---

### Relic System

**Relics are run-only.** They do not persist across runs.

**First relic opportunity by encounter 2–3.** Target 2–3 total relic pickups per run.

**Relic Pool Composition Target:**

| Category | ~% of Pool | Purpose |
|----------|-----------|---------|
| Stat/Passive Buffs | 40% | Reward commitment to a type or position |
| Playstyle Modifiers | 30% | Change risk calculus or strategic approach |
| Synergy Bridges / Build-Arounds | 30% | Create new team comps, cross-type synergies |

**MVP Relic List:**

- **Chain Lightning** — Damage chains to one extra enemy for 10% damage (stacks up to 4x)
- **Red Meat** — Enhances fauna ATK by 10%
- **Beast Master** — Fauna abilities trigger with one less fauna on the team
- **Rock Lobster** — Enhances health by 20% for frontline units
- **Phoenix Down** — At end of battle, automatically revive a creature with 1 HP (3 uses per run)
- **Touch Grass** — Flora creatures have thorns 1
- **Mog** — Units that start battle at full health gain 1 haste

*Target for MVP: 10–12 relics total. The above 7 need 3–5 more, prioritizing synergy bridge / build-around relics.*

---

### Point-Buy Starter System

**Budget: 10 points.** Each creature has a point cost based on its tier ceiling and current power. The player assembles a starting roster before each run.

**Higher-generation creatures cost more points** but are significantly stronger. A Tier 4 creature might cost 8-10 points, leaving room for only one or two cheap companions. A handful of Tier 2 creatures might cost 3-5 each, giving a more balanced but less powerful team. A tier 1 creature is 2-4. You should be able to take a few to start. 

**Default starters are always available.** Players start with 3 creatures from a random selection of 10 as their starters. These creatures, and those captured during a run are always available to start. Breeding and retirement may reduce point costs for specific species over time.

---

### Creature Pool

**MVP Target:** 15–20 creatures across 2–3 types.

**Each creature needs:**
- A clear role (tank, damage, support)
- A type (fauna, flora, etc.)
- A Tier 1 ability that aligns to its role. 
- Potential Tier 2–4 abilities in its ability pool (for random frontier unlocks)
- Visible differentiation in combat

---

### Edge Cases
- What happens when you capture a lower tier of a creature that you have a higher tier of? 
-- Lower tier creature can be added to the party as long as the party has less than 5 units. At the end of the run players must choose which of the two creatures they want to keep. Players can only have one version of a pet at a time. 
-- When we add shinies or alternate versions of pets they unlock a skin that players can choose but otherwise are not different from the base version. 


---

## Reach Goals

*Features to layer in after the MVP core loop is validated.*

### Run Structure: Town Model

Evolve the path-based MVP into the full town concept. Player arrives in a procedurally generated town with available quests visible at once. Player chooses which to tackle and in what order, with sequencing affecting outcomes. Town biome determines the local creature pool. Non-combat nodes become places (inns, merchants, ranches).

### Expanded Relic Pool

Scale to 25–30+ relics. Focus on synergy bridges, risk/reward relics, economy relics that modify the reward screen, and town/quest interaction relics.

### Breeding Grounds (Mid-Run Node)

Add breeding as a mid-run option. Sacrifice two current team members to produce a stronger offspring during the run itself. High risk, high reward.

### Seeds / Seeded Runs

Deterministic seeds for run generation. Players can share seeds for specific layouts, creature pools, and relic offerings.

### Expanded Type System

Add more creature types one at a time, each with full relic and creature support. Each new type needs innate synergies, enough creatures for a viable mono-type team, and 2–3 dedicated relics.

### Hall of Fame / Retirement Benefits

Retired creatures contribute passive bonuses — global stat buffs for their type, reduced point-buy costs for their species, or cosmetic legacy tracking. Gives retirement a purpose beyond "creature is gone."

### Lifespan Extension

Rare relics, events, or items that add extra runs to a creature's lifespan. Extremely valuable, creates memorable moments.

### Ability Rerolling

Items or mechanics that let the player reroll a random frontier-tier ability. For when the Tier 3 random ability is bad and you don't want to breed an entirely new creature just to try again.

---

## Validation Criteria

Before expanding beyond MVP, the following should be true:

**Combat:** A player can watch an autobattle and explain why they won or lost. After a fight, they want to rearrange their team.

**Team Building:** Over the course of a run, the player makes at least 3 decisions that feel genuinely hard. Their final team feels personal.

**Breeding & Lifespan:** The player understands the tier system within their first 2–3 runs. Lifespan creates urgency without feeling punishing. Breeding feels like a meaningful upgrade, not a chore. The ability inheritance choice at breeding time feels like a real decision.

**Meta-Progression:** After 5 runs, the point-buy screen feels meaningfully different. The player has a plan for what they want to breed next. They feel stronger without early fights becoming trivial. Roster turnover from lifespan keeps the game feeling fresh rather than frustrating.
