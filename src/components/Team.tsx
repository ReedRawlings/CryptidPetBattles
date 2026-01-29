import { useState, DragEvent, MouseEvent } from 'react';
import { useGame } from '../game';
import { PetCard } from './PetCard';
import { GAME_CONSTANTS } from '../types';
import './Team.css';

interface TeamProps {
  selectedTeamPet: number | null;
  onSlotClick: (index: number) => void;
  isInteractive?: boolean;
}

export function Team({ selectedTeamPet, onSlotClick, isInteractive = true }: TeamProps) {
  const { state, sellPet, swapPets, combinePets } = useGame();
  const { player } = state;

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    if (!isInteractive || !player.team[index]) return;
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
      combinePets(draggedIndex, targetIndex);
    } else {
      swapPets(draggedIndex, targetIndex);
    }

    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleClick = (index: number) => {
    if (!isInteractive) return;
    onSlotClick(index);
  };

  const handleSell = (index: number, e: MouseEvent) => {
    e.stopPropagation();
    sellPet(index);
  };

  return (
    <div className="team">
      <div className="team__slots">
        {player.team.map((pet, index) => (
          <div key={index} className="team__slot">
            <PetCard
              pet={pet}
              onClick={() => handleClick(index)}
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              selected={selectedTeamPet === index}
              dragging={draggedIndex === index}
              empty={!pet}
              size="large"
              showAbilityOnHover={true}
            />
            {pet && isInteractive && (
              <button
                className="pixel-btn"
                onClick={(e) => handleSell(index, e)}
              >
                Sell +{GAME_CONSTANTS.PET_SELL_VALUE * pet.level}g
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
