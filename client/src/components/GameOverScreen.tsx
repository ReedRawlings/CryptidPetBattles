import './GameOverScreen.css';

interface GameOverScreenProps {
  won: boolean;
  wins: number;
  onPlayAgain: () => void;
}

export function GameOverScreen({ won, wins, onPlayAgain }: GameOverScreenProps) {
  return (
    <div className="game-over-screen">
      <div className="game-over-container">
        <div className={`result-badge ${won ? 'victory' : 'defeat'}`}>
          {won ? 'CHAMPION!' : 'GAME OVER'}
        </div>

        <h1 className={won ? 'victory-text' : 'defeat-text'}>
          {won ? 'You Won!' : 'Better Luck Next Time'}
        </h1>

        <div className="final-stats">
          <div className="stat-box">
            <span className="stat-value">{wins}</span>
            <span className="stat-label">Victories</span>
          </div>
        </div>

        <p className="message">
          {won
            ? 'Congratulations! You achieved 10 wins and became the champion!'
            : 'You ran out of lives. Keep practicing and try again!'
          }
        </p>

        <button className="play-again-button" onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
}
