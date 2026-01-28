import type { Player, Shop } from '../types/game';
import { PetCard } from './PetCard';
import { ShopSlot } from './ShopSlot';
import './GameBoard.css';

interface GameBoardProps {
  player: Player;
  shop: Shop;
  onBuyPet: (index: number) => void;
  onBuyFood: (index: number) => void;
  onRoll: () => void;
  onFreeze: (index: number) => void;
  onSell: (petId: string) => void;
  onArrange: (newOrder: (string | null)[]) => void;
  onStartBattle: () => void;
  loading: boolean;
  selectedFood: number | null;
  onSelectPetForFood: (petId: string) => void;
  onCancelFoodSelection: () => void;
}

export function GameBoard({
  player,
  shop,
  onBuyPet,
  onBuyFood,
  onRoll,
  onFreeze,
  onSell,
  onArrange,
  onStartBattle,
  loading,
  selectedFood,
  onSelectPetForFood,
  onCancelFoodSelection,
}: GameBoardProps) {
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (sourceIndex !== targetIndex) {
      const newOrder = [...player.team].map(p => p?.id || null);
      [newOrder[sourceIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[sourceIndex]];
      onArrange(newOrder);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const teamHasPets = player.team.some(p => p !== null);

  return (
    <div className="game-board">
      {/* Header */}
      <header className="game-header">
        <div className="player-info">
          <span className="player-name">{player.username}</span>
          <span className="player-stats">
            Turn {player.turn} | Wins: {player.wins}/10
          </span>
        </div>
        <div className="resources">
          <span className="gold">Gold: {player.gold}</span>
          <span className="lives">Lives: {'❤️'.repeat(player.lives)}</span>
        </div>
      </header>

      {/* Shop Section */}
      <section className="shop-section">
        <div className="section-header">
          <h2>Shop</h2>
          <button
            className="roll-button"
            onClick={onRoll}
            disabled={loading || player.gold < 1}
          >
            Roll (1 gold)
          </button>
        </div>
        <div className="shop-slots">
          {shop.slots.map((slot, index) => (
            <ShopSlot
              key={index}
              slot={slot}
              onBuy={() => slot.type === 'pet' ? onBuyPet(index) : onBuyFood(index)}
              onFreeze={() => onFreeze(index)}
              disabled={loading || player.gold < 3}
            />
          ))}
        </div>
      </section>

      {/* Food Selection Overlay */}
      {selectedFood !== null && (
        <div className="food-selection-overlay" onClick={onCancelFoodSelection}>
          <div className="food-selection-message">
            Select a pet to feed (click anywhere to cancel)
          </div>
        </div>
      )}

      {/* Team Section */}
      <section className="team-section">
        <div className="section-header">
          <h2>Your Team</h2>
          <div className="team-hint">Drag to rearrange | Rightmost attacks first</div>
        </div>
        <div className="team-slots">
          {player.team.map((pet, index) => (
            <div
              key={index}
              className={`team-slot ${selectedFood !== null ? 'selectable' : ''}`}
              draggable={pet !== null && selectedFood === null}
              onDragStart={(e) => handleDragStart(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragOver={handleDragOver}
              onClick={() => {
                if (selectedFood !== null && pet) {
                  onSelectPetForFood(pet.id);
                }
              }}
            >
              {pet ? (
                <PetCard
                  pet={pet}
                  onSell={() => onSell(pet.id)}
                  showSell={selectedFood === null}
                />
              ) : (
                <div className="empty-slot">Empty</div>
              )}
              <div className="position-label">
                {index === 4 ? 'Front' : index === 0 ? 'Back' : ''}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Battle Button */}
      <div className="battle-section">
        <button
          className="battle-button"
          onClick={onStartBattle}
          disabled={loading || !teamHasPets}
        >
          {loading ? 'Battling...' : 'End Turn & Battle!'}
        </button>
        {!teamHasPets && (
          <p className="battle-hint">Buy at least one pet to battle</p>
        )}
      </div>
    </div>
  );
}
