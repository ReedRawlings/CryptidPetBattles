import { Food } from '../types';
import './FoodCard.css';

interface FoodCardProps {
  food: Food | null;
  onClick?: () => void;
  selected?: boolean;
  frozen?: boolean;
}

const FOOD_EMOJIS: Record<string, string> = {
  apple: '🍎',
  meat: '🥩',
  honey: '🍯',
  cupcake: '🧁',
  salad: '🥗',
  steak: '🥓',
  pizza: '🍕',
  chocolate: '🍫',
};

export function FoodCard({ food, onClick, selected = false, frozen = false }: FoodCardProps) {
  if (!food) {
    return (
      <div className="food-card food-card--empty" onClick={onClick}>
        <span className="food-card__empty-text">+</span>
      </div>
    );
  }

  return (
    <div
      className={`food-card food-card--tier-${food.tier} ${selected ? 'food-card--selected' : ''} ${frozen ? 'food-card--frozen' : ''}`}
      onClick={onClick}
    >
      {frozen && <div className="food-card__frozen-badge">Frozen</div>}
      <div className="food-card__emoji">{FOOD_EMOJIS[food.id] || '?'}</div>
      <div className="food-card__name">{food.name}</div>
      <div className="food-card__stats">
        {food.attackValue > 0 && <span className="food-card__attack">+{food.attackValue}</span>}
        {food.attackValue > 0 && food.healthValue > 0 && <span>/</span>}
        {food.healthValue > 0 && <span className="food-card__health">+{food.healthValue}</span>}
      </div>
    </div>
  );
}
