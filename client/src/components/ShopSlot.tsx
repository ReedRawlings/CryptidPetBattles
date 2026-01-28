import type { ShopSlot as ShopSlotType, Pet, Food } from '../types/game';
import { PetCard } from './PetCard';
import './ShopSlot.css';

interface ShopSlotProps {
  slot: ShopSlotType;
  onBuy: () => void;
  onFreeze: () => void;
  disabled: boolean;
}

export function ShopSlot({ slot, onBuy, onFreeze, disabled }: ShopSlotProps) {
  if (!slot.item) {
    return (
      <div className="shop-slot empty">
        <span>Sold</span>
      </div>
    );
  }

  const isPet = slot.type === 'pet';
  const item = slot.item;

  return (
    <div className={`shop-slot ${slot.frozen ? 'frozen' : ''}`}>
      {isPet ? (
        <PetCard pet={item as Pet} showSell={false} />
      ) : (
        <div className="food-card">
          <span className="food-name">{(item as Food).name}</span>
          <span className="food-desc">{(item as Food).description}</span>
          <span className="food-effect">+{(item as Food).value} stats</span>
        </div>
      )}

      <div className="shop-slot-actions">
        <button
          className="buy-button"
          onClick={onBuy}
          disabled={disabled}
        >
          Buy (3g)
        </button>
        <button
          className={`freeze-button ${slot.frozen ? 'active' : ''}`}
          onClick={onFreeze}
        >
          {slot.frozen ? 'Unfreeze' : 'Freeze'}
        </button>
      </div>
    </div>
  );
}
