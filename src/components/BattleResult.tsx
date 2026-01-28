import { useGame } from '../game';
import { PetCard } from './PetCard';
import './BattleResult.css';

export function BattleResult() {
  const { state, nextTurn } = useGame();
  const { lastBattleResult, currentOpponent, player } = state;

  if (!lastBattleResult || !currentOpponent) {
    return null;
  }

  const { winner, playerTeamRemaining, opponentTeamRemaining, damageDealt } = lastBattleResult;

  return (
    <div className="battle-result">
      <div className="battle-result__header">
        {winner === 'player' && (
          <h2 className="battle-result__title battle-result__title--win">Victory!</h2>
        )}
        {winner === 'opponent' && (
          <h2 className="battle-result__title battle-result__title--lose">Defeat!</h2>
        )}
        {winner === 'draw' && (
          <h2 className="battle-result__title battle-result__title--draw">Draw!</h2>
        )}
        <p className="battle-result__opponent">vs {currentOpponent.username}</p>
      </div>

      <div className="battle-result__teams">
        <div className="battle-result__team">
          <h3>Your Team</h3>
          <div className="battle-result__pets">
            {player.team.map((pet, index) => (
              <div key={index} className="battle-result__pet-slot">
                {pet ? (
                  <div className={`battle-result__pet ${playerTeamRemaining.some((p) => p.templateId === pet.templateId) ? '' : 'battle-result__pet--fainted'}`}>
                    <PetCard pet={pet} size="small" showStats={true} />
                    {!playerTeamRemaining.some((p) => p.templateId === pet.templateId) && (
                      <div className="battle-result__fainted-overlay">Fainted</div>
                    )}
                  </div>
                ) : (
                  <div className="battle-result__empty-slot" />
                )}
              </div>
            ))}
          </div>
          <p className="battle-result__surviving">
            {playerTeamRemaining.length} surviving
          </p>
        </div>

        <div className="battle-result__vs">VS</div>

        <div className="battle-result__team">
          <h3>Opponent</h3>
          <div className="battle-result__pets">
            {currentOpponent.team.map((pet, index) => (
              <div key={index} className="battle-result__pet-slot">
                {pet ? (
                  <div className={`battle-result__pet ${opponentTeamRemaining.some((p) => p.templateId === pet.templateId) ? '' : 'battle-result__pet--fainted'}`}>
                    <PetCard pet={pet} size="small" showStats={true} />
                    {!opponentTeamRemaining.some((p) => p.templateId === pet.templateId) && (
                      <div className="battle-result__fainted-overlay">Fainted</div>
                    )}
                  </div>
                ) : (
                  <div className="battle-result__empty-slot" />
                )}
              </div>
            ))}
          </div>
          <p className="battle-result__surviving">
            {opponentTeamRemaining.length} surviving
          </p>
        </div>
      </div>

      {winner === 'opponent' && damageDealt > 0 && (
        <p className="battle-result__damage">
          You lost {damageDealt} life{damageDealt > 1 ? 's' : ''}!
        </p>
      )}

      <button className="battle-result__continue-btn" onClick={nextTurn}>
        Continue
      </button>
    </div>
  );
}
