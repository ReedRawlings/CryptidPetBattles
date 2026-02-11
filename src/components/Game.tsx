import { useState } from 'react';
import { useGame } from '../game';
import { GameHeader } from './GameHeader';
import { Shop } from './Shop';
import { Team } from './Team';
import { BattleView } from './BattleView';
import { BattleResult } from './BattleResult';
import { GameOver } from './GameOver';
import { MainMenu } from './MainMenu';
import './Game.css';

export function Game() {
  const { state, endTurn, buyCreature, swapCreatures, combineCreatures } = useGame();
  const { phase, player, shop } = state;

  // Unified selection state
  const [selectedShopPet, setSelectedShopPet] = useState<number | null>(null);
  const [selectedTeamPet, setSelectedTeamPet] = useState<number | null>(null);

  const clearAllSelections = () => {
    setSelectedShopPet(null);
    setSelectedTeamPet(null);
  };

  const handleShopPetClick = (index: number) => {
    if (shop.creatures[index]) {
      if (selectedShopPet === index) {
        setSelectedShopPet(null);
      } else {
        setSelectedShopPet(index);
        setSelectedTeamPet(null);
      }
    }
  };

  const handleTeamSlotClick = (index: number) => {
    // If a shop creature is selected, try to buy it to this slot
    if (selectedShopPet !== null) {
      buyCreature(selectedShopPet, index);
      clearAllSelections();
      return;
    }

    // No shop item selected - handle team creature reordering/combining
    const clickedCreature = player.team[index];

    if (selectedTeamPet === null) {
      // No team creature selected - select this one if it exists
      if (clickedCreature) {
        setSelectedTeamPet(index);
      }
    } else if (selectedTeamPet === index) {
      // Clicked the same creature - deselect
      setSelectedTeamPet(null);
    } else {
      // Different slot selected - swap or combine
      const sourceCreature = player.team[selectedTeamPet];
      const targetCreature = player.team[index];

      if (sourceCreature && targetCreature && sourceCreature.templateId === targetCreature.templateId) {
        combineCreatures(selectedTeamPet, index);
      } else {
        swapCreatures(selectedTeamPet, index);
      }
      setSelectedTeamPet(null);
    }
  };

  const hasCreatures = player.team.some((creature) => creature !== null);

  // Get hint text based on selection state
  const getHintText = () => {
    if (selectedShopPet !== null) return 'Click a team slot to place this creature';
    if (selectedTeamPet !== null) return 'Click another slot to swap, or same creature type to combine';
    return null;
  };

  if (phase === 'menu') {
    return (
      <div className="game">
        <MainMenu />
      </div>
    );
  }

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
          onShopPetClick={handleShopPetClick}
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
              disabled={!hasCreatures}
            >
              {hasCreatures ? 'Battle!' : 'Buy a creature first!'}
            </button>
          </div>
        </div>

        {getHintText() && (
          <div className="game__hint">{getHintText()}</div>
        )}
      </div>
    </div>
  );
}
