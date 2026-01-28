import { useState, DragEvent, MouseEvent } from 'react';
import { useGame } from '../game';
import { PetCard } from './PetCard';
import { GAME_CONSTANTS } from '../types';
import './Team.css';

interface TeamProps {
  onSlotClick?: (index: number) => void;
  isInteractive?: boolean;
  highlightEmpty?: boolean;
}

export function Team({ onSlotClick, isInteractive = true, highlightEmpty = false }: TeamProps) {
  const { state, sellPet, swapPets, combinePets } = useGame();
  const { player } = state;

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedPet, setSelectedPet] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    if (!isInteractive) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (!isInteractive || draggedIndex === null) return;

    const sourcePet = player.team[draggedIndex];
    const targetPet = player.team[targetIndex];

    if (sourcePet && targetPet && sourcePet.templateId === targetPet.templateId) {
      // Combine pets if same type
      combinePets(draggedIndex, targetIndex);
    } else {
      // Swap positions
      swapPets(draggedIndex, targetIndex);
    }

    setDraggedIndex(null);
  };

  const handleClick = (index: number) => {
    if (onSlotClick) {
      onSlotClick(index);
      return;
    }

    if (!isInteractive) return;

    if (selectedPet === index) {
      setSelectedPet(null);
    } else if (selectedPet !== null) {
      // Try to combine or swap
      const sourcePet = player.team[selectedPet];
      const targetPet = player.team[index];

      if (sourcePet && targetPet && sourcePet.templateId === targetPet.templateId) {
        combinePets(selectedPet, index);
      } else {
        swapPets(selectedPet, index);
      }
      setSelectedPet(null);
    } else if (player.team[index]) {
      setSelectedPet(index);
    }
  };

  const handleSell = (index: number, e: MouseEvent) => {
    e.stopPropagation();
    sellPet(index);
    setSelectedPet(null);
  };

  return (
    <div className="team">
      <div className="team__header">
        <h2>Your Team</h2>
        <span className="team__direction">Front ← → Back</span>
      </div>
      <div className="team__slots">
        {player.team.map((pet, index) => (
          <div key={index} className="team__slot">
            <PetCard
              pet={pet}
              onClick={() => handleClick(index)}
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              selected={selectedPet === index}
              empty={!pet}
              highlighted={highlightEmpty && !pet}
              size="large"
            />
            {pet && isInteractive && (
              <button
                className="team__sell-btn"
                onClick={(e) => handleSell(index, e)}
              >
                Sell (+{GAME_CONSTANTS.PET_SELL_VALUE * pet.level}g)
              </button>
            )}
            {pet && (
              <div className="team__pet-info">
                <span className="team__ability-text">{pet.ability.description}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
