import { useState } from 'react';
import { useRoguelite } from '../../game/roguelite/RogueliteContext';
import { ROGUELITE_CONSTANTS } from '../../types';
import { getCreatureTemplate } from '../../data/creatures';
import { CreatureTooltip } from './CreatureTooltip';
import './PointBuy.css';

// Cost scales with shopTier: T1=3, T2=4, T3=5, T4=6
function getCost(shopTier: number): number {
  return 2 + shopTier;
}

export function PointBuy() {
  const { state, dispatch } = useRoguelite();

  // Use the persistent unlocked creature list from meta
  const starters: { templateId: string; tribe: string; name: string; shopTier: number }[] = [];
  for (const id of state.meta.availableCreatureIds) {
    const template = getCreatureTemplate(id);
    if (template) {
      starters.push({ templateId: template.id, tribe: template.type, name: template.name, shopTier: template.shopTier });
    }
  }

  const costs: Record<string, number> = {};
  for (const s of starters) {
    costs[s.templateId] = getCost(s.shopTier);
  }

  const [selected, setSelected] = useState<Record<string, number>>({}); // templateId → teamIndex
  const [nextTeamIndex, setNextTeamIndex] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const totalCost = Object.keys(selected).reduce((sum, id) => sum + (costs[id] ?? 3), 0);
  const remaining = ROGUELITE_CONSTANTS.POINT_BUY_BUDGET - totalCost;

  // Compute tribe counts from selected creatures
  const tribeCounts: Record<string, number> = {};
  for (const id of Object.keys(selected)) {
    const tpl = getCreatureTemplate(id);
    if (tpl) {
      tribeCounts[tpl.type] = (tribeCounts[tpl.type] || 0) + 1;
    }
  }

  const toggleCreature = (templateId: string) => {
    if (selected[templateId] !== undefined) {
      const { [templateId]: _, ...rest } = selected;
      setSelected(rest);
    } else {
      const cost = costs[templateId] ?? 3;
      if (remaining >= cost && Object.keys(selected).length < 5) {
        setSelected({ ...selected, [templateId]: nextTeamIndex });
        setNextTeamIndex((prev) => (prev + 1) % 5);
      }
    }
  };

  const startRun = () => {
    const creatures = Object.entries(selected).map(([templateId, teamIndex]) => ({
      templateId,
      teamIndex,
    }));
    dispatch({ type: 'START_RUN', selectedCreatures: creatures });
  };

  // Group by tribe
  const byTribe: Record<string, typeof starters> = {};
  for (const s of starters) {
    if (!byTribe[s.tribe]) byTribe[s.tribe] = [];
    byTribe[s.tribe].push(s);
  }

  return (
    <div className="point-buy">
      <h2 className="point-buy__title">Select Your Team</h2>
      <div className="point-buy__budget">
        <span className="point-buy__budget-label">Points:</span>
        <span className="point-buy__budget-value">{remaining}/{ROGUELITE_CONSTANTS.POINT_BUY_BUDGET}</span>
      </div>

      {Object.entries(byTribe).map(([tribe, creatures]) => (
        <div key={tribe} className="point-buy__tribe-section">
          <h3 className="point-buy__tribe-name">{tribe}</h3>
          <div className="point-buy__creatures">
            {creatures.map((c) => {
              const template = getCreatureTemplate(c.templateId);
              const isSelected = selected[c.templateId] !== undefined;
              const cost = costs[c.templateId] ?? 3;
              const canAfford = remaining >= cost;

              return (
                <div
                  key={c.templateId}
                  className="point-buy__creature-wrapper"
                  onMouseEnter={() => setHoveredId(c.templateId)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <button
                    className={`point-buy__creature ${isSelected ? 'point-buy__creature--selected' : ''} ${!canAfford && !isSelected ? 'point-buy__creature--disabled' : ''}`}
                    onClick={() => toggleCreature(c.templateId)}
                  >
                    <div className="point-buy__creature-name">{c.name}</div>
                    <div className="point-buy__creature-info">
                      {template && (
                        <>
                          <span>{template.role}</span>
                          {template.shopTier > 1 && <span>T{template.shopTier}</span>}
                          <span>ATK:{template.tiers['1'].baseStats.attack}</span>
                          <span>HP:{template.tiers['1'].baseStats.health}</span>
                        </>
                      )}
                    </div>
                    <div className="point-buy__creature-cost">{cost}pts</div>
                  </button>
                  {hoveredId === c.templateId && template && (
                    <CreatureTooltip template={template} tribeCounts={tribeCounts} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <button
        className="point-buy__start pixel-btn"
        onClick={startRun}
        disabled={Object.keys(selected).length === 0}
      >
        Start Run ({Object.keys(selected).length} creatures)
      </button>
    </div>
  );
}
