import { useState } from 'react';
import { GameProvider } from './game';
import { Game } from './components';
import { AuthProvider } from './contexts/AuthContext';
import { AuthModal, UserProfile } from './components/auth';
import { Leaderboard } from './components/leaderboard';
import './App.css';

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  return (
    <AuthProvider>
      <GameProvider>
        <div className="app">
          <header className="app__header">
            <h1 className="app__title">Battle Pets Arena</h1>
            <div className="app__header-actions">
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
