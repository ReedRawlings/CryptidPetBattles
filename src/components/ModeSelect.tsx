import type { GameMode } from '../types';
import { hasSavedRogueliteState } from '../services/localStorage';
import './ModeSelect.css';

interface ModeSelectProps {
  onSelect: (mode: GameMode) => void;
}

export function ModeSelect({ onSelect }: ModeSelectProps) {
  const hasSave = hasSavedRogueliteState();

  return (
    <div className="mode-select">
      <h1 className="mode-select__title">Battle Pets Arena</h1>
      <p className="mode-select__subtitle">Choose your game mode</p>

      <div className="mode-select__options">
        <button
          className="mode-select__card mode-select__card--arena"
          onClick={() => onSelect('arena')}
        >
          <h2 className="mode-select__card-title">Arena Mode</h2>
          <p className="mode-select__card-desc">
            Classic auto-battler. Build a team from the shop, combine duplicates, battle AI opponents.
            Win 10 battles to claim victory.
          </p>
          <span className="mode-select__card-tag">Classic</span>
        </button>

        <button
          className="mode-select__card mode-select__card--roguelite"
          onClick={() => onSelect('roguelite')}
        >
          <h2 className="mode-select__card-title">Roguelite Mode</h2>
          <p className="mode-select__card-desc">
            Navigate branching paths, collect creatures, survive with persistent HP.
            Breed for stronger offspring between runs.
          </p>
          <span className="mode-select__card-tag">
            {hasSave ? 'Continue Run' : 'New'}
          </span>
        </button>
      </div>
    </div>
  );
}
