import type { BattleResult } from '../types/game';
import './BattleModal.css';

interface BattleModalProps {
  result: BattleResult;
  onClose: () => void;
}

export function BattleModal({ result, onClose }: BattleModalProps) {
  const isWin = result.winner === 'player';
  const isDraw = result.winner === 'draw';

  return (
    <div className="battle-modal-overlay" onClick={onClose}>
      <div className="battle-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`battle-result ${isWin ? 'win' : isDraw ? 'draw' : 'loss'}`}>
          <h2>
            {isWin ? 'Victory!' : isDraw ? 'Draw!' : 'Defeat!'}
          </h2>
          {result.livesLost > 0 && (
            <p className="lives-lost">-{result.livesLost} {'❤️'.repeat(result.livesLost)}</p>
          )}
        </div>

        <div className="battle-summary">
          <div className="team-result">
            <span className="label">Your Team</span>
            <span className="survivors">{result.playerTeamSurvivors} survived</span>
          </div>
          <div className="vs">VS</div>
          <div className="team-result">
            <span className="label">Opponent</span>
            <span className="survivors">{result.opponentTeamSurvivors} survived</span>
          </div>
        </div>

        {result.events && result.events.length > 0 && (
          <div className="battle-log">
            <h3>Battle Log</h3>
            <div className="events-list">
              {result.events.slice(0, 10).map((event, index) => (
                <div key={index} className={`event ${event.type}`}>
                  {event.description}
                </div>
              ))}
              {result.events.length > 10 && (
                <div className="event more">
                  ...and {result.events.length - 10} more events
                </div>
              )}
            </div>
          </div>
        )}

        <button className="continue-button" onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  );
}
