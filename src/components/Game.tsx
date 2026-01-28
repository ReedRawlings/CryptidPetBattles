import { useState } from 'react';
import { useGame } from '../game';
import { GameHeader } from './GameHeader';
import { Shop } from './Shop';
import { Team } from './Team';
import { BattleResult } from './BattleResult';
import { GameOver } from './GameOver';
import './Game.css';

export function Game() {
  const { state, endTurn, buyPet, applyFood } = useGame();
  const { phase, player } = state;

  const [selectedShopPet, setSelectedShopPet] = useState<number | null>(null);
  const [selectedFood, setSelectedFood] = useState<number | null>(null);

  const hasPets = player.team.some((pet) => pet !== null);

  const handleTeamSlotClick = (teamIndex: number) => {
    if (selectedShopPet !== null) {
      // Buy the selected pet and place in this slot
      buyPet(selectedShopPet, teamIndex);
      setSelectedShopPet(null);
    } else if (selectedFood !== null) {
      // Apply food to the pet in this slot
      if (player.team[teamIndex]) {
        applyFood(selectedFood, teamIndex);
        setSelectedFood(null);
      }
    }
  };

  if (phase === 'gameOver') {
    return (
      <div className="game">
        <GameOver />
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
          onPetSelect={setSelectedShopPet}
          onFoodSelect={setSelectedFood}
        />

        <Team
          onSlotClick={handleTeamSlotClick}
          highlightEmpty={selectedShopPet !== null}
        />

        <div className="game__actions">
          <button
            className="game__end-turn-btn"
            onClick={endTurn}
            disabled={!hasPets}
          >
            {hasPets ? 'End Turn & Battle!' : 'Buy a pet first!'}
          </button>
        </div>
      </div>
    </div>
  );
}
