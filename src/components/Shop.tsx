import { useGame } from '../game';
import { PetCard } from './PetCard';
import { GAME_CONSTANTS } from '../types';
import './Shop.css';

interface ShopProps {
  selectedShopPet: number | null;
  onShopPetClick: (index: number) => void;
}

export function Shop({ selectedShopPet, onShopPetClick }: ShopProps) {
  const { state, rollShop, toggleFreeze } = useGame();
  const { shop, player } = state;

  const handleRoll = () => {
    if (player.gold >= GAME_CONSTANTS.ROLL_COST) {
      rollShop();
    }
  };

  const handleFreeze = (index: number) => {
    toggleFreeze(index);
  };

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
    </div>
  );
}
