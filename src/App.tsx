import { useState } from 'react';
import { GameProvider } from './game';
import { Game } from './components';
import { AuthProvider } from './contexts/AuthContext';
import { AuthModal, UserProfile } from './components/auth';
import { Leaderboard } from './components/leaderboard';
import { ModeSelect } from './components/ModeSelect';
import { RogueliteApp } from './components/roguelite/RogueliteApp';
import type { GameMode } from './types';
import './App.css';

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

  // Mode select screen
  if (!selectedMode) {
    return (
      <div className="app">
        <ModeSelect onSelect={setSelectedMode} />
      </div>
    );
  }

  // Roguelite mode
  if (selectedMode === 'roguelite') {
    return (
      <div className="app">
        <RogueliteApp onBack={() => setSelectedMode(null)} />
      </div>
    );
  }

  // Arena mode (default)
  return (
    <AuthProvider>
      <GameProvider>
        <div className="app">
          <header className="app__header">
            <h1 className="app__title">Battle Pets Arena</h1>
            <div className="app__header-actions">
              <button
                className="app__leaderboard-btn"
                onClick={() => setSelectedMode(null)}
              >
                Change Mode
              </button>
              <button
                className="app__leaderboard-btn"
                onClick={() => setIsLeaderboardOpen(true)}
              >
                Leaderboard
              </button>
              <UserProfile onOpenAuth={() => setIsAuthModalOpen(true)} />
            </div>
          </header>
          <main className="app__main">
            <Game />
          </main>
        </div>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
        <Leaderboard
          isOpen={isLeaderboardOpen}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
