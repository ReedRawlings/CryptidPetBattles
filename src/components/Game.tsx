import { useState } from 'react';
import { useGame } from '../game';
import { GameHeader } from './GameHeader';
import { Shop } from './Shop';
import { Team } from './Team';
import { BattleView } from './BattleView';
import { BattleResult } from './BattleResult';
import { GameOver } from './GameOver';
import './Game.css';

export function Game() {
  const { state, endTurn, buyPet, applyFood, swapPets, combinePets } = useGame();
  const { phase, player, shop } = state;

  // Unified selection state
  const [selectedShopPet, setSelectedShopPet] = useState<number | null>(null);
  const [selectedFood, setSelectedFood] = useState<number | null>(null);
  const [selectedTeamPet, setSelectedTeamPet] = useState<number | null>(null);

  const clearAllSelections = () => {
    setSelectedShopPet(null);
    setSelectedFood(null);
    setSelectedTeamPet(null);
  };

  const handleShopPetClick = (index: number) => {
    if (shop.pets[index]) {
      if (selectedShopPet === index) {
        setSelectedShopPet(null);
      } else {
        setSelectedShopPet(index);
        setSelectedFood(null);
        setSelectedTeamPet(null);
      }
    }
  };

  const handleFoodClick = (index: number) => {
    if (shop.foods[index]) {
      if (selectedFood === index) {
        setSelectedFood(null);
      } else {
        setSelectedFood(index);
        setSelectedShopPet(null);
        setSelectedTeamPet(null);
      }
    }
  };

  const handleTeamSlotClick = (index: number) => {
    // If a shop pet is selected, try to buy it to this slot
    if (selectedShopPet !== null) {
      buyPet(selectedShopPet, index);
      clearAllSelections();
      return;
    }

    // If food is selected, try to apply it to this slot
    if (selectedFood !== null) {
      if (player.team[index]) {
        applyFood(selectedFood, index);
      }
      clearAllSelections();
      return;
    }

    // No shop item selected - handle team pet reordering/combining
    const clickedPet = player.team[index];

    if (selectedTeamPet === null) {
      // No team pet selected - select this one if it exists
      if (clickedPet) {
        setSelectedTeamPet(index);
      }
    } else if (selectedTeamPet === index) {
      // Clicked the same pet - deselect
      setSelectedTeamPet(null);
    } else {
      // Different slot selected - swap or combine
      const sourcePet = player.team[selectedTeamPet];
      const targetPet = player.team[index];

      if (sourcePet && targetPet && sourcePet.templateId === targetPet.templateId) {
        combinePets(selectedTeamPet, index);
      } else {
        swapPets(selectedTeamPet, index);
      }
      setSelectedTeamPet(null);
    }
  };

  const hasPets = player.team.some((pet) => pet !== null);

  // Get hint text based on selection state
  const getHintText = () => {
    if (selectedShopPet !== null) return 'Click a team slot to place this pet';
    if (selectedFood !== null) return 'Click a pet on your team to feed';
    if (selectedTeamPet !== null) return 'Click another slot to swap, or same pet type to combine';
    return null;
  };

  if (phase === 'gameOver') {
    return (
      <div className="game">
        <GameOver />
      </div>
    );
  }

  if (phase === 'battle') {
    return (
      <div className="game">
        <GameHeader />
        <BattleView />
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className="game">
        <GameHeader />
        <BattleResult />
      </div>
    );
  }

  return (
    <div className="game">
      <GameHeader />

      <div className="game__content">
        <Shop
          selectedShopPet={selectedShopPet}
          selectedFood={selectedFood}
          onShopPetClick={handleShopPetClick}
          onFoodClick={handleFoodClick}
        />

        <div className="game__team-row">
          <Team
            selectedTeamPet={selectedTeamPet}
            onSlotClick={handleTeamSlotClick}
          />
          <div className="game__actions">
            <button
              className="pixel-btn pixel-btn--wide"
              onClick={endTurn}
              disabled={!hasPets}
            >
              {hasPets ? 'Battle!' : 'Buy a pet first!'}
            </button>
          </div>
        </div>

        {getHintText() && (
          <div className="game__hint">{getHintText()}</div>
        }}
      </div>
    </div>
  );
}
