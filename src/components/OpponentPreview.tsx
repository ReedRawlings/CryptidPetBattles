import { useGame } from '../game';
import { PetCard } from './PetCard';
import { Pet } from '../types';
import './OpponentPreview.css';

export function OpponentPreview() {
  const { state } = useGame();
  const { currentOpponent, isRealOpponent } = state;

  if (!currentOpponent) {
    return (
      <div className="opponent-preview opponent-preview--loading">
        <div className="opponent-preview__header">
          <h3>Next Opponent</h3>
          <span className="opponent-preview__badge">Loading...</span>
        </div>
        <div className="opponent-preview__slots">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="opponent-preview__slot opponent-preview__slot--empty">
              <span>?</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const opponentPets = currentOpponent.team;
  const petCount = opponentPets.filter((p): p is Pet => p !== null).length;

  return (
    <div className="opponent-preview">
      <div className="opponent-preview__header">
        <h3>Next Opponent</h3>
        <div className="opponent-preview__info">
          <span className="opponent-preview__badge">
            {isRealOpponent ? 'Player' : 'AI'}
          </span>
          <span className="opponent-preview__pet-count">
            {petCount} pet{petCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="opponent-preview__slots">
        {opponentPets.map((pet, index) => (
          <div key={index} className="opponent-preview__slot">
            <PetCard
              pet={pet}
              empty={!pet}
              size="small"
              showAbilityOnHover={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
