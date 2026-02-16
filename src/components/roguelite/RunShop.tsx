import { useState } from 'react';
import { useRoguelite } from '../../game/roguelite/RogueliteContext';
import { getRelicDefinition } from '../../data/relics';
import type { RogueliteCreature } from '../../types';
import { CreatureTooltip } from './CreatureTooltip';

import './RunShop.css';

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#a855f7',
};

const XP_COST = 10;
const HEAL_COST = 5;
const REVIVE_COST = 8;

export function RunShop() {
  const { state, dispatch } = useRoguelite();
  const run = state.currentRun;
  const offerings = state.shopOfferings;
  const [selectedRelic, setSelectedRelic] = useState<number | null>(null);
  const [hoveredTeamIdx, setHoveredTeamIdx] = useState<number | null>(null);
  const [selectedService, setSelectedService] = useState<'xp' | 'heal' | 'revive' | null>(null);

  if (!run || !offerings) return <div>No shop available</div>;

  const livingTeam = run.team
    .map((c, i) => ({ creature: c, index: i }))
    .filter((x): x is { creature: RogueliteCreature; index: number } => x.creature !== null && !x.creature.isDead);

  const damagedTeam = livingTeam.filter((x) => x.creature.currentHealth < x.creature.maxHealth);

  const deadTeam = run.team
    .map((c, i) => ({ creature: c, index: i }))
    .filter((x): x is { creature: RogueliteCreature; index: number } => x.creature !== null && x.creature.isDead);

  const handleBuyCreature = (offerIndex: number) => {
    // Find first empty or dead slot
    const emptySlot = run.team.findIndex((c) => c === null || c.isDead);
    if (emptySlot === -1) return;
    dispatch({ type: 'SHOP_BUY_CREATURE', offerIndex, teamIndex: emptySlot });
  };

  const handleRelicClick = (index: number) => {
    setSelectedRelic(selectedRelic === index ? null : index);
    setSelectedService(null);
  };

  const handleRelicEquip = (teamIndex: number) => {
    if (selectedRelic === null) return;
    dispatch({ type: 'SHOP_BUY_RELIC', offerIndex: selectedRelic, teamIndex });
    setSelectedRelic(null);
  };

  const handleServiceClick = (service: 'xp' | 'heal' | 'revive') => {
    setSelectedService(selectedService === service ? null : service);
    setSelectedRelic(null);
  };

  const handleServiceTarget = (teamIndex: number) => {
    if (!selectedService) return;
    switch (selectedService) {
      case 'xp':
        dispatch({ type: 'SHOP_BUY_XP', teamIndex });
        break;
      case 'heal':
        dispatch({ type: 'SHOP_BUY_HEAL', teamIndex });
        break;
      case 'revive':
        dispatch({ type: 'SHOP_BUY_REVIVE', teamIndex });
        break;
    }
    setSelectedService(null);
  };

  const handleLeave = () => {
    dispatch({ type: 'LEAVE_SHOP' });
  };

  return (
    <div className="run-shop">
      <h2 className="run-shop__title">Shop</h2>
      <p className="run-shop__gold">Gold: {run.gold}</p>

      {offerings.creatures.length > 0 && (
        <div className="run-shop__section">
          <h3>Creatures</h3>
          <div className="run-shop__items">
            {offerings.creatures.map((offer, i) => {
              const canAfford = run.gold >= offer.cost;
              const hasSlot = run.team.some((c) => c === null || c?.isDead);
              return (
                <button
                  key={i}
                  className={`run-shop__creature ${!canAfford || !hasSlot ? 'run-shop__creature--disabled' : ''}`}
                  onClick={() => canAfford && hasSlot && handleBuyCreature(i)}
                  disabled={!canAfford || !hasSlot}
                >
                  <span className="run-shop__creature-name">{offer.template.name}</span>
                  <span className="run-shop__creature-info">
                    {offer.template.type} &middot; {offer.template.role} &middot; T{offer.template.shopTier}
                  </span>
                  <span className="run-shop__creature-stats">
                    ATK: {offer.template.tiers['1'].baseStats.attack} &middot; HP: {offer.template.tiers['1'].baseStats.health}
                  </span>
                  <span className="run-shop__creature-ability">
                    {offer.template.tiers['1'].ability.name}
                  </span>
                  <span className="run-shop__cost">{offer.cost}g</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {offerings.relics.length > 0 && (
        <div className="run-shop__section">
          <h3>Relics {selectedRelic !== null && '- Click a creature to equip'}</h3>
          <div className="run-shop__items">
            {offerings.relics.map((offer, i) => {
              const canAfford = run.gold >= offer.cost;
              return (
                <button
                  key={i}
                  className={`run-shop__relic ${selectedRelic === i ? 'run-shop__relic--selected' : ''} ${!canAfford ? 'run-shop__relic--disabled' : ''}`}
                  onClick={() => canAfford && handleRelicClick(i)}
                  disabled={!canAfford}
                >
                  <span className="run-shop__relic-name" style={{ color: RARITY_COLORS[offer.definition.rarity] }}>
                    {offer.definition.name}
                  </span>
                  <span className="run-shop__relic-desc">{offer.definition.description}</span>
                  <span className="run-shop__cost">{offer.cost}g</span>
                </button>
              );
            })}
          </div>

          {selectedRelic !== null && (
            <div className="run-shop__equip-targets">
              <span className="run-shop__equip-label">Equip on:</span>
              {run.team.map((creature, i) => {
                if (!creature || creature.isDead) return null;
                const existing = creature.relic ? getRelicDefinition(creature.relic.definitionId) : null;
                return (
                  <button
                    key={i}
                    className="run-shop__equip-btn pixel-btn"
                    onClick={() => handleRelicEquip(i)}
                  >
                    {creature.name}
                    {existing && <span className="run-shop__equip-existing"> (has {existing.name})</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="run-shop__section">
        <h3>Services {selectedService && '- Click a creature to apply'}</h3>
        <div className="run-shop__items">
          <button
            className={`run-shop__service ${selectedService === 'xp' ? 'run-shop__service--selected' : ''} ${run.gold < XP_COST || livingTeam.length === 0 ? 'run-shop__service--disabled' : ''}`}
            onClick={() => run.gold >= XP_COST && livingTeam.length > 0 && handleServiceClick('xp')}
            disabled={run.gold < XP_COST || livingTeam.length === 0}
          >
            <span className="run-shop__service-icon">{'\u2B06'}</span>
            <span className="run-shop__service-name">Experience</span>
            <span className="run-shop__service-desc">Give 10 XP to a creature</span>
            <span className="run-shop__cost">{XP_COST}g</span>
          </button>
          <button
            className={`run-shop__service ${selectedService === 'heal' ? 'run-shop__service--selected' : ''} ${run.gold < HEAL_COST || damagedTeam.length === 0 ? 'run-shop__service--disabled' : ''}`}
            onClick={() => run.gold >= HEAL_COST && damagedTeam.length > 0 && handleServiceClick('heal')}
            disabled={run.gold < HEAL_COST || damagedTeam.length === 0}
          >
            <span className="run-shop__service-icon">{'\u2665'}</span>
            <span className="run-shop__service-name">Heal</span>
            <span className="run-shop__service-desc">Restore 50% HP to a creature</span>
            <span className="run-shop__cost">{HEAL_COST}g</span>
          </button>
          <button
            className={`run-shop__service ${selectedService === 'revive' ? 'run-shop__service--selected' : ''} ${run.gold < REVIVE_COST || deadTeam.length === 0 ? 'run-shop__service--disabled' : ''}`}
            onClick={() => run.gold >= REVIVE_COST && deadTeam.length > 0 && handleServiceClick('revive')}
            disabled={run.gold < REVIVE_COST || deadTeam.length === 0}
          >
            <span className="run-shop__service-icon">{'\u2728'}</span>
            <span className="run-shop__service-name">Revive</span>
            <span className="run-shop__service-desc">Revive a dead creature at 25% HP</span>
            <span className="run-shop__cost">{REVIVE_COST}g</span>
          </button>
        </div>

        {selectedService && (
          <div className="run-shop__equip-targets">
            <span className="run-shop__equip-label">
              {selectedService === 'xp' && 'Give XP to:'}
              {selectedService === 'heal' && 'Heal:'}
              {selectedService === 'revive' && 'Revive:'}
            </span>
            {selectedService === 'xp' && livingTeam.map(({ creature, index }) => (
              <button key={index} className="run-shop__equip-btn pixel-btn" onClick={() => handleServiceTarget(index)}>
                {creature.name} <span className="run-shop__target-detail">Lv{creature.level}</span>
              </button>
            ))}
            {selectedService === 'heal' && damagedTeam.map(({ creature, index }) => (
              <button key={index} className="run-shop__equip-btn pixel-btn" onClick={() => handleServiceTarget(index)}>
                {creature.name} <span className="run-shop__target-detail">{creature.currentHealth}/{creature.maxHealth}</span>
              </button>
            ))}
            {selectedService === 'revive' && deadTeam.map(({ creature, index }) => (
              <button key={index} className="run-shop__equip-btn pixel-btn" onClick={() => handleServiceTarget(index)}>
                {creature.name} <span className="run-shop__target-detail">Dead</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="run-shop__section">
        <h3>Your Team</h3>
        <div className="run-shop__team">
          {run.team.map((creature, i) => {
            if (!creature) return (
              <div key={i} className="run-shop__team-slot run-shop__team-slot--empty">Empty</div>
            );
            const relicDef = creature.relic ? getRelicDefinition(creature.relic.definitionId) : null;
            const tribeCounts: Record<string, number> = {};
            for (const c of run.team) {
              if (c && !c.isDead) tribeCounts[c.type] = (tribeCounts[c.type] || 0) + 1;
            }
            return (
              <div
                key={creature.id}
                className={`run-shop__team-slot ${creature.isDead ? 'run-shop__team-slot--dead' : ''}`}
                onMouseEnter={() => setHoveredTeamIdx(i)}
                onMouseLeave={() => setHoveredTeamIdx(null)}
              >
                <span className="run-shop__team-name">{creature.name}</span>
                <span className="run-shop__team-stats">
                  Lv{creature.level} &middot; {creature.currentHealth}/{creature.maxHealth} HP
                </span>
                {relicDef && (
                  <span className="run-shop__team-relic" style={{ color: RARITY_COLORS[relicDef.rarity] }}>
                    {relicDef.name}
                  </span>
                )}
                {hoveredTeamIdx === i && (
                  <CreatureTooltip creature={creature} tribeCounts={tribeCounts} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button className="pixel-btn run-shop__leave-btn" onClick={handleLeave}>
        Leave Shop
      </button>
    </div>
  );
}
