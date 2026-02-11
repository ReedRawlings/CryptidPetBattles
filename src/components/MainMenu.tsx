import { useGame } from '../game';
import './MainMenu.css';

export function MainMenu() {
  const { startGame, isMultiplayerReady } = useGame();

  return (
    <div className="main-menu">
      <div className="main-menu__content">
        <h2 className="main-menu__subtitle">Choose Your Mode</h2>

        <div className="main-menu__modes">
          <button
            className="main-menu__mode-card"
            onClick={() => startGame('arena')}
          >
            <span className="main-menu__mode-icon">&#x2694;</span>
            <span className="main-menu__mode-title">VS AI</span>
            <span className="main-menu__mode-desc">
              Battle AI opponents with increasing difficulty. Win 10 to conquer the arena!
            </span>
          </button>

          <button
            className="main-menu__mode-card main-menu__mode-card--disabled"
            disabled={!isMultiplayerReady}
            onClick={() => startGame('versus')}
          >
            <span className="main-menu__mode-icon">&#x1F310;</span>
            <span className="main-menu__mode-title">Multiplayer</span>
            <span className="main-menu__mode-desc">
              {isMultiplayerReady
                ? 'Compete against real players and climb the leaderboard!'
                : 'Coming soon — requires Supabase setup'}
            </span>
            {!isMultiplayerReady && (
              <span className="main-menu__mode-badge">Coming Soon</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
