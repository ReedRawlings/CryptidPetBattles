import { useGame } from '../game';
import { PetCard } from './PetCard';
import { FoodCard } from './FoodCard';
import { GAME_CONSTANTS } from '../types';
import './Shop.css';

interface ShopProps {
  selectedShopPet: number | null;
  selectedFood: number | null;
  onShopPetClick: (index: number) => void;
  onFoodClick: (index: number) => void;
}

export function Shop({ selectedShopPet, selectedFood, onShopPetClick, onFoodClick }: ShopProps) {
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
        <h3>Pets (Cost: {GAME_CONSTANTS.PET_BUY_COST}g)</h3>
        <div className="shop__items">
          {shop.pets.map((pet, index) => (
            <div key={index} className="shop__item">
              <PetCard
                pet={pet}
                onClick={() => onShopPetClick(index)}
                selected={selectedShopPet === index}
                frozen={shop.frozen[index]}
                empty={!pet}
                showAbilityOnHover={true}
              />
              {pet && (
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

      <div className="shop__section">
        <h3>Food (Cost: {GAME_CONSTANTS.FOOD_COST}g)</h3>
        <div className="shop__items">
          {shop.foods.map((food, index) => (
            <div key={index} className="shop__item">
              <FoodCard
                food={food}
                onClick={() => onFoodClick(index)}
                selected={selectedFood === index}
                frozen={shop.frozen[shop.pets.length + index]}
              />
              {food && (
                <button
                  className="pixel-btn"
                  onClick={() => handleFreeze(shop.pets.length + index)}
                >
                  {shop.frozen[shop.pets.length + index] ? 'Thaw' : 'Freeze'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
