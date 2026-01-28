import { useGame } from '../game';
import { PetCard } from './PetCard';
import { FoodCard } from './FoodCard';
import { GAME_CONSTANTS } from '../types';
import './Shop.css';

interface ShopProps {
  selectedShopPet: number | null;
  selectedFood: number | null;
  onPetSelect: (index: number | null) => void;
  onFoodSelect: (index: number | null) => void;
}

export function Shop({ selectedShopPet, selectedFood, onPetSelect, onFoodSelect }: ShopProps) {
  const { state, rollShop, toggleFreeze } = useGame();
  const { shop, player } = state;

  const handlePetClick = (index: number) => {
    if (shop.pets[index]) {
      if (selectedShopPet === index) {
        onPetSelect(null);
      } else {
        onPetSelect(index);
        onFoodSelect(null);
      }
    }
  };

  const handleFoodClick = (index: number) => {
    if (shop.foods[index]) {
      if (selectedFood === index) {
        onFoodSelect(null);
      } else {
        onFoodSelect(index);
        onPetSelect(null);
      }
    }
  };

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
            className="shop__roll-btn"
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
                onClick={() => handlePetClick(index)}
                selected={selectedShopPet === index}
                frozen={shop.frozen[index]}
                empty={!pet}
              />
              {pet && (
                <button
                  className={`shop__freeze-btn ${shop.frozen[index] ? 'shop__freeze-btn--active' : ''}`}
                  onClick={() => handleFreeze(index)}
                >
                  {shop.frozen[index] ? 'Unfreeze' : 'Freeze'}
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
                onClick={() => handleFoodClick(index)}
                selected={selectedFood === index}
                frozen={shop.frozen[shop.pets.length + index]}
              />
              {food && (
                <button
                  className={`shop__freeze-btn ${shop.frozen[shop.pets.length + index] ? 'shop__freeze-btn--active' : ''}`}
                  onClick={() => handleFreeze(shop.pets.length + index)}
                >
                  {shop.frozen[shop.pets.length + index] ? 'Unfreeze' : 'Freeze'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={`shop__hint ${selectedShopPet !== null || selectedFood !== null ? 'shop__hint--active' : ''}`}>
        {selectedShopPet !== null ? (
          <>
            <span className="shop__hint-icon">👆</span>
            <span>Tap an empty team slot below to buy this pet</span>
          </>
        ) : selectedFood !== null ? (
          <>
            <span className="shop__hint-icon">👆</span>
            <span>Tap a pet on your team to feed</span>
          </>
        ) : (
          <>
            <span className="shop__hint-icon">💡</span>
            <span>Tap a pet to select it, then tap a team slot to buy</span>
          </>
        )}
      </div>
    </div>
  );
}
