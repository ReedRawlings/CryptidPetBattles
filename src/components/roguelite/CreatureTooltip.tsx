import type { CreatureTemplate, RogueliteCreature } from '../../types';
import { getCreatureTemplate } from '../../data/creatures';
import { getRelicDefinition } from '../../data/relics';
import './CreatureTooltip.css';

const TRIBE_SYNERGIES: Record<string, { thresholds: number[]; description: string }> = {
  Flora: { thresholds: [2, 3], description: 'Flora: +HP to Flora creatures' },
  Fauna: { thresholds: [2, 3, 5], description: 'Fauna: +ATK to Fauna creatures' },
  Kami: { thresholds: [2, 3], description: 'Kami: +gold per battle' },
  Spirit: { thresholds: [2, 3, 5], description: 'Spirit: summon Bone on faint' },
  Dessert: { thresholds: [2, 3, 5], description: 'Dessert: AoE on faint' },
};

interface Props {
  /** For point-buy / shop: show template info */
  template?: CreatureTemplate;
  /** For in-run: show live creature info */
  creature?: RogueliteCreature;
  /** Tribe counts on the current team */
  tribeCounts: Record<string, number>;
}

export function CreatureTooltip({ template, creature, tribeCounts }: Props) {
  const tpl = template ?? (creature ? getCreatureTemplate(creature.templateId) : null);
  if (!tpl) return null;

  const tribe = tpl.type;
  const role = tpl.role;
  const tier = creature?.tier ?? 1;
  const tierKey = String(tier) as '1' | '2' | '3';
  const tierData = tpl.tiers[tierKey] ?? tpl.tiers['1'];
  const ability = creature?.ability ?? tierData.ability;

  const synergy = TRIBE_SYNERGIES[tribe];
  const tribeCount = tribeCounts[tribe] ?? 0;
  const activeThreshold = synergy ? synergy.thresholds.filter((t) => tribeCount >= t).length : 0;

  const relicDef = creature?.relic ? getRelicDefinition(creature.relic.definitionId) : null;

  return (
    <div className="creature-tooltip">
      <div className="creature-tooltip__header">
        <span className="creature-tooltip__name">{tpl.name}</span>
        <span className="creature-tooltip__role">{role}</span>
      </div>

      <div className="creature-tooltip__tribe">
        <span className="creature-tooltip__tribe-name">{tribe}</span>
        {synergy && (
          <span className={`creature-tooltip__tribe-status ${activeThreshold > 0 ? 'creature-tooltip__tribe-status--active' : ''}`}>
            {tribeCount}/{synergy.thresholds[0]} {activeThreshold > 0 ? 'Active' : 'Inactive'}
          </span>
        )}
      </div>
      {synergy && (
        <div className="creature-tooltip__synergy-desc">{synergy.description}</div>
      )}

      <div className="creature-tooltip__stats">
        {creature ? (
          <>
            <span>Lv{creature.level}</span>
            <span>ATK: {creature.currentAttack}</span>
            <span>HP: {creature.currentHealth}/{creature.maxHealth}</span>
            <span>SPD: {creature.currentSpeed}</span>
          </>
        ) : (
          <>
            <span>ATK: {tierData.baseStats.attack}</span>
            <span>HP: {tierData.baseStats.health}</span>
            <span>SPD: {tierData.baseStats.speed}</span>
          </>
        )}
      </div>

      <div className="creature-tooltip__ability">
        <span className="creature-tooltip__ability-name">{ability.name}</span>
        <span className="creature-tooltip__ability-desc">{ability.description}</span>
        <span className="creature-tooltip__ability-trigger">Trigger: {ability.trigger}</span>
      </div>

      {relicDef && (
        <div className="creature-tooltip__relic">
          <span className="creature-tooltip__relic-name">{relicDef.name}</span>
          <span className="creature-tooltip__relic-desc">{relicDef.description}</span>
          {creature?.relic?.remainingUses != null && (
            <span className="creature-tooltip__relic-uses">{creature.relic.remainingUses} uses left</span>
          )}
        </div>
      )}
    </div>
  );
}
