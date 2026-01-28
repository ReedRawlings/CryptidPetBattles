import { GameProvider } from './game';
import { Game } from './components';
import './App.css';

function App() {
  return (
    <GameProvider>
      <div className="app">
        <header className="app__header">
          <h1 className="app__title">Battle Pets Arena</h1>
        </header>
        <main className="app__main">
          <Game />
        </main>
      </div>
    </GameProvider>
  );
}

export default App;
