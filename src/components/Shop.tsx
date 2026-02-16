import { useState } from 'react';
import { useGame } from '../game';
import { PetCard } from './PetCard';
import { GAME_CONSTANTS } from '../types';
import { getRelicDefinition } from '../data/relics';
import './Shop.css';

interface ShopProps {
  selectedShopPet: number | null;
  onShopPetClick: (index: number) => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#a855f7',
};

export function Shop({ selectedShopPet, onShopPetClick }: ShopProps) {
  const { state, rollShop, toggleFreeze, buyRelic, toggleRelicFreeze } = useGame();
  const { shop, player } = state;
  const [selectedRelicIndex, setSelectedRelicIndex] = useState<number | null>(null);

  const handleRoll = () => {
    if (player.gold >= GAME_CONSTANTS.ROLL_COST) {
      rollShop();
      setSelectedRelicIndex(null);
    }
  };

  const handleFreeze = (index: number) => {
    toggleFreeze(index);
  };

  const handleRelicClick = (index: number) => {
    if (selectedRelicIndex === index) {
      setSelectedRelicIndex(null);
    } else {
      setSelectedRelicIndex(index);
    }
  };

  const handleRelicEquip = (teamIndex: number) => {
    if (selectedRelicIndex === null) return;
    const relicDef = shop.relics?.[selectedRelicIndex];
    if (!relicDef) return;
    if (player.gold < relicDef.shopCost) return;
    if (!player.team[teamIndex]) return;

    buyRelic(selectedRelicIndex, teamIndex);
    setSelectedRelicIndex(null);
  };

  const hasRelics = shop.relics && shop.relics.some((r) => r !== null);

  return (
    <div className="shop">
      <div className="shop__header">
        <h2>Shop</h2>
        <div className="shop__actions">
          <button
            className="pixel-btn"
            onClick={handleRoll}
            disabled={player.gold < GAME_CONSTANTS.ROLL_COST}
          >
            Roll ({GAME_CONSTANTS.ROLL_COST}g)
          </button>
        </div>
      </div>

      <div className="shop__section">
        <h3>Creatures (Cost: {GAME_CONSTANTS.CREATURE_BUY_COST}g)</h3>
        <div className="shop__items">
          {shop.creatures.map((creature, index) => (
            <div key={index} className="shop__item">
              <PetCard
                pet={creature}
                onClick={() => onShopPetClick(index)}
                selected={selectedShopPet === index}
                frozen={shop.frozen[index]}
                empty={!creature}
                showAbilityOnHover={true}
              />
              {creature && (
                <button
                  className="pixel-btn"
                  onClick={() => handleFreeze(index)}
                >
                  {shop.frozen[index] ? 'Thaw' : 'Freeze'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {hasRelics && (
        <div className="shop__section">
          <h3>Relics {selectedRelicIndex !== null && '- Click a team creature to equip'}</h3>
          <div className="shop__relics">
            {shop.relics!.map((relic, index) => {
              if (!relic) {
                return (
                  <div key={index} className="shop__relic shop__relic--empty">
                    <span className="shop__relic-name">Sold</span>
                  </div>
                );
              }
              const isSelected = selectedRelicIndex === index;
              const canAfford = player.gold >= relic.shopCost;
              return (
                <div key={index} className="shop__relic-wrapper">
                  <button
                    className={`shop__relic ${isSelected ? 'shop__relic--selected' : ''} ${!canAfford ? 'shop__relic--expensive' : ''} ${shop.relicFrozen?.[index] ? 'shop__relic--frozen' : ''}`}
                    onClick={() => canAfford ? handleRelicClick(index) : undefined}
                    disabled={!canAfford}
                  >
                    <span className="shop__relic-name" style={{ color: RARITY_COLORS[relic.rarity] }}>
                      {relic.name}
                    </span>
                    <span className="shop__relic-desc">{relic.description}</span>
                    <span className="shop__relic-cost">{relic.shopCost}g</span>
                  </button>
                  <button
                    className="pixel-btn"
                    onClick={() => toggleRelicFreeze(index)}
                  >
                    {shop.relicFrozen?.[index] ? 'Thaw' : 'Freeze'}
                  </button>
                </div>
              );
            })}
          </div>

          {selectedRelicIndex !== null && (
            <div className="shop__relic-targets">
              <span className="shop__relic-targets-label">Equip on:</span>
              {player.team.map((creature, i) => {
                if (!creature) return null;
                const existingRelic = creature.relic ? getRelicDefinition(creature.relic.definitionId) : null;
                return (
                  <button
                    key={i}
                    className="shop__relic-target pixel-btn"
                    onClick={() => handleRelicEquip(i)}
                  >
                    {creature.name}
                    {existingRelic && <span className="shop__relic-target-existing"> (has {existingRelic.name})</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
