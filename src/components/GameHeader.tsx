import { useGame } from '../game';
import { GAME_CONSTANTS } from '../types';
import './GameHeader.css';

export function GameHeader() {
  const { state } = useGame();
  const { player } = state;

  return (
    <div className="game-header">
      <div className="game-header__stat">
        <span className="game-header__label">Turn</span>
        <span className="game-header__value">{player.currentTurn}</span>
      </div>
      <div className="game-header__stat game-header__stat--gold">
        <span className="game-header__label">Gold</span>
        <span className="game-header__value">{player.gold}</span>
      </div>
      <div className="game-header__stat game-header__stat--lives">
        <span className="game-header__label">Lives</span>
        <span className="game-header__value">
          {Array(player.lives).fill('❤️').join('')}
          {Array(GAME_CONSTANTS.STARTING_LIVES - player.lives).fill('🖤').join('')}
        </span>
      </div>
      <div className="game-header__stat game-header__stat--wins">
        <span className="game-header__label">Wins</span>
        <span className="game-header__value">{player.wins}/{GAME_CONSTANTS.WINS_TO_WIN}</span>
      </div>
    </div>
  );
}
