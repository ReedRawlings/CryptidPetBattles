import { TurnContext } from './types';

const SYSTEM_PROMPT = `You are playing Battle Pets Arena, an auto-battler card game. Each turn you shop for creatures, build a team of up to 5, then battle another player's team automatically.

## Goal
You are competing in a tournament against other players who are all trying to maximize their teams. Gold does NOT carry over between rounds — unspent gold is wasted. You must spend all your gold every turn.

## Team Layout
- Slots 0-1: Frontline (gets attacked first)
- Slots 2-4: Backline (attacked after frontline dies)

## Tribes & Synergies
Each creature has a tribe. Having multiple creatures of the same tribe grants bonuses:
- **Flora**: +HP to Flora creatures (2 = +2 HP, 3+ = +4 HP)
- **Fauna**: +ATK to Fauna creatures (2 = +1, 3 = +2, 5 = +3)
- **Kami**: Bonus gold per turn (2 = +1g, 3 = +2g, 5 = +3g)
- **Spirit**: Summon a Bone on faint (2 = 2/2, 3 = 3/3, 5 = 4/5)
- **Dessert**: Damage enemies on faint (2 = 2, 3 = 3, 5 = 5 to all)

## Stars
Creatures have 1-3 stars. Higher stars = better stats and stronger abilities. Each XP point gives an incremental stat boost toward the next tier.
- ★1 → ★2: 2 XP (3 copies total). Each XP adds ~1/2 of the stat difference.
- ★2 → ★3: 3 XP (3 more ★1 copies, 6 total). Each XP adds ~1/3 of the stat difference.
- Buy a duplicate onto an existing creature to add 1 XP. ★1 copies can feed into ★2 creatures.
- You can also use the combine action on two identical creatures on your team (source star must be ≤ target star; source is consumed, target gains 1 XP).

## Actions
- **buy**: Buy from shop. Params: shopIndex, teamIndex. Costs 3 gold. If the slot has the same creature (any star), they combine (adds 1 XP; at threshold → star up).
- **sell**: Sell from team. Params: teamIndex. Gain gold = star level.
- **roll**: Reroll shop. Costs 1 gold.
- **swap**: Swap two team slots. Params: indexA, indexB. Free.
- **combine**: Combine two identical creatures. Params: sourceIndex, targetIndex. Free.
- **freeze**: Toggle freeze on shop slot. Params: shopIndex. Free. Frozen creatures stay in the shop next turn.

## CRITICAL: Free Combine Action
If you have two creatures with the same name on your team (source star ≤ target star), you MUST use the combine action BEFORE rolling. Combine is FREE — it costs 0 gold. The source creature is consumed and the target gains 1 XP plus an incremental stat boost. At the XP threshold (2 for ★1→★2, 3 for ★2→★3) the creature stars up with full next-tier stats. Do NOT keep duplicate creatures in separate slots — always combine them immediately.
Example: If slot 0 has Sharkdog ★2 and slot 1 has Sharkdog ★1, use { "action": "combine", "params": { "sourceIndex": 1, "targetIndex": 0 } } to merge them.

## Turn Priority (follow this order every turn)
1. **Combine duplicates on your team first.** Check if any two team creatures share the same name (source star ≤ target star). If so, combine them immediately (free action). This is the most efficient way to star up.
2. **Fill your board.** If you have fewer than 5 creatures, buy creatures to fill empty slots (3g each). A full team of 5 beats a partial team almost every time.
3. **Buy duplicates onto your team.** If the shop has a creature you already own, buy it onto that team slot to add XP toward a star-up. ★1 copies can feed into ★2 creatures. Higher stars are significantly stronger.
4. **Roll to find duplicates or upgrades.** Spending 1g to roll refreshes the shop with new creatures. Roll to find copies of creatures you already own, or stronger replacements.
5. **Upgrade your weakest slot.** If you find a better creature after rolling, sell your weakest creature (gain gold = its star level), then buy the upgrade.
6. **Never end your turn with unspent gold.** Keep rolling until you've spent everything. Freeze is only useful when you have 0 gold but want to save a shop creature for next turn.

## Positioning Tips
- Place creatures with high health, thorns, or taunt abilities in the frontline (slots 0-1).
- Place damage dealers and debuffers in the backline (slots 2-4).
- Build tribe synergies for bonus effects when possible, but a strong board of mixed tribes beats a weak board with synergy.

## Response Format
Respond with a JSON object. Include your reasoning, then a list of actions to take this turn.
\`\`\`json
{
  "reasoning": "Your strategic thinking here...",
  "actions": [
    { "action": "buy", "params": { "shopIndex": 0, "teamIndex": 2 } },
    { "action": "roll" },
    { "action": "buy", "params": { "shopIndex": 1, "teamIndex": 0 } }
  ]
}
\`\`\`
IMPORTANT: Return ONLY valid JSON. No markdown fences, no extra text.`;

export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildTurnPrompt(context: TurnContext): string {
  const { filteredState, standings, turnNumber, playersRemaining } = context;

  let prompt = `## Turn ${turnNumber}\n`;
  prompt += `Gold: ${filteredState.gold} | Lives: ${filteredState.lives} | Wins: ${filteredState.wins}/${filteredState.winsNeeded}\n`;
  prompt += `Players remaining: ${playersRemaining}\n\n`;

  // Team
  prompt += `## Your Team\n`;
  for (let i = 0; i < filteredState.team.length; i++) {
    const c = filteredState.team[i];
    if (c) {
      const pos = i < 2 ? 'FRONT' : 'BACK';
      const xpNeeded = c.star === 1 ? 2 : 3;
      const expTag = c.star < 3 ? ` XP:${c.experience}/${xpNeeded}` : '';
      prompt += `[${i}] ${c.name} ★${c.star}${expTag} (${c.type}) ATK:${c.currentAttack} HP:${c.currentHealth}/${c.maxHealth} SPD:${c.currentSpeed} — ${c.abilityName}: ${c.abilityDescription} [${pos}]\n`;
    } else {
      const pos = i < 2 ? 'FRONT' : 'BACK';
      prompt += `[${i}] EMPTY [${pos}]\n`;
    }
  }

  // Shop
  if (filteredState.shop) {
    prompt += `\n## Shop (buy costs 3g, roll costs 1g)\n`;
    for (const slot of filteredState.shop) {
      if (slot.creature) {
        const c = slot.creature;
        const frozenTag = slot.frozen ? ' [FROZEN]' : '';
        prompt += `[${slot.index}] ${c.name} (${c.type}) T${c.shopTier} ATK:${c.stats.attack} HP:${c.stats.health} SPD:${c.stats.speed} — ${c.abilityName}: ${c.abilityDescription}${frozenTag}\n`;
      } else {
        prompt += `[${slot.index}] SOLD\n`;
      }
    }
  }

  // Standings
  prompt += `\n## Standings\n`;
  for (const s of standings) {
    const status = s.alive ? `${s.wins}W / ${s.lives}L` : 'ELIMINATED';
    const you = s.name === filteredState.gameId ? ' (YOU)' : '';
    prompt += `- ${s.name} (${s.model}): ${status}${you}\n`;
  }

  prompt += `\nDecide your actions for this shopping turn. Return JSON only.`;
  return prompt;
}
