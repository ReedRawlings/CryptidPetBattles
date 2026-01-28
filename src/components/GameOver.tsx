import { useGame } from '../game';
import { GAME_CONSTANTS } from '../types';
import './GameOver.css';

export function GameOver() {
  const { state, resetGame } = useGame();
  const { player } = state;

  const isWin = player.wins >= GAME_CONSTANTS.WINS_TO_WIN;

  return (
    <div className="game-over">
      <div className="game-over__content">
        {isWin ? (
          <>
            <h1 className="game-over__title game-over__title--win">Champion!</h1>
            <p className="game-over__subtitle">You conquered the Arena!</p>
          </>
        ) : (
          <>
            <h1 className="game-over__title game-over__title--lose">Game Over</h1>
            <p className="game-over__subtitle">Better luck next time!</p>
          </>
        )}

        <div className="game-over__stats">
          <div className="game-over__stat">
            <span className="game-over__stat-label">Wins</span>
            <span className="game-over__stat-value">{player.wins}</span>
          </div>
          <div className="game-over__stat">
            <span className="game-over__stat-label">Turns</span>
            <span className="game-over__stat-value">{player.currentTurn}</span>
          </div>
          <div className="game-over__stat">
            <span className="game-over__stat-label">Lives Remaining</span>
            <span className="game-over__stat-value">{Math.max(0, player.lives)}</span>
          </div>
        </div>

        <button className="game-over__play-again" onClick={resetGame}>
          Play Again
        </button>
      </div>
    </div>
  );
}
