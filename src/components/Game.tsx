import { useGame } from '../game';
import { GameHeader } from './GameHeader';
import { Shop } from './Shop';
import { Team } from './Team';
import { BattleResult } from './BattleResult';
import { GameOver } from './GameOver';
import './Game.css';

export function Game() {
  const { state, endTurn } = useGame();
  const { phase, player } = state;

  const hasPets = player.team.some((pet) => pet !== null);

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
        <Shop />

        <Team />

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
