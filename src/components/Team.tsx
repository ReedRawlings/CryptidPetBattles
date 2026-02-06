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
  const { state, sellCreature, swapCreatures, combineCreatures } = useGame();
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
      combineCreatures(draggedIndex, targetIndex);
    } else {
      swapCreatures(draggedIndex, targetIndex);
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
    sellCreature(index);
  };

  // Split team into frontline (0-1) and backline (2-4)
  const frontlineIndices = [0, 1];
  const backlineIndices = [2, 3, 4];

  const renderSlot = (index: number) => {
    const creature = player.team[index];
    return (
      <div key={index} className="team__slot">
        <PetCard
          pet={creature}
          onClick={() => handleClick(index)}
          onDragStart={() => handleDragStart(index)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(index)}
          onDragEnd={handleDragEnd}
          selected={selectedTeamPet === index}
          dragging={draggedIndex === index}
          empty={!creature}
          size="large"
          showAbilityOnHover={true}
        />
        {creature && isInteractive && (
          <button
            className="pixel-btn"
            onClick={(e) => handleSell(index, e)}
          >
            Sell +{GAME_CONSTANTS.CREATURE_SELL_VALUE * creature.star}g
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="team">
      <div className="team__row">
        <span className="team__row-label team__row-label--front">Frontline</span>
        <div className="team__slots">
          {frontlineIndices.map(renderSlot)}
        </div>
      </div>
      <div className="team__row">
        <span className="team__row-label team__row-label--back">Backline</span>
        <div className="team__slots">
          {backlineIndices.map(renderSlot)}
        </div>
      </div>
    </div>
  );
}
