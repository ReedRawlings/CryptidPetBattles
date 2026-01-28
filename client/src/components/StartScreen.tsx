import { useState } from 'react';
import './StartScreen.css';

interface StartScreenProps {
  onStart: (username: string) => void;
  loading: boolean;
  error: string | null;
}

export function StartScreen({ onStart, loading, error }: StartScreenProps) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onStart(username.trim());
    }
  };

  return (
    <div className="start-screen">
      <div className="start-container">
        <h1 className="title">Battle Pets Arena</h1>
        <p className="subtitle">Build your team. Battle your rivals. Become the champion.</p>

        <form onSubmit={handleSubmit} className="start-form">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your name"
            className="username-input"
            disabled={loading}
            maxLength={20}
          />
          <button type="submit" className="start-button" disabled={loading || !username.trim()}>
            {loading ? 'Starting...' : 'Start Game'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        <div className="instructions">
          <h3>How to Play</h3>
          <ul>
            <li>Buy pets from the shop to build your team</li>
            <li>Arrange your team - rightmost attacks first</li>
            <li>Win 10 battles before losing 5 lives</li>
            <li>Combine 3 identical pets to level up</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
