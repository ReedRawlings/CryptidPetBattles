import { useState } from 'react';
import { useGame } from './hooks/useGame';
import { StartScreen } from './components/StartScreen';
import { GameBoard } from './components/GameBoard';
import { BattleModal } from './components/BattleModal';
import { GameOverScreen } from './components/GameOverScreen';
import './App.css';

function App() {
  const {
    gameState,
    loading,
    error,
    battleResult,
    startGame,
    buyPet,
    buyFood,
    rollShop,
    freezeSlot,
    sellPet,
    arrangeTeam,
    startBattle,
    clearError,
    clearBattleResult,
  } = useGame();

  const [selectedFood, setSelectedFood] = useState<number | null>(null);

  const handleBuyPet = (index: number) => {
    buyPet(index);
  };

  const handleBuyFood = (index: number) => {
    setSelectedFood(index);
  };

  const handleSelectPetForFood = (petId: string) => {
    if (selectedFood !== null) {
      buyFood(selectedFood, petId);
      setSelectedFood(null);
    }
  };

  const handleCancelFoodSelection = () => {
    setSelectedFood(null);
  };

  if (!gameState) {
    return <StartScreen onStart={startGame} loading={loading} error={error} />;
  }

  if (gameState.phase === 'gameOver') {
    return (
      <GameOverScreen
        won={gameState.gameWon || false}
        wins={gameState.player.wins}
        onPlayAgain={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="app">
      {error && (
        <div className="error-toast" onClick={clearError}>
          {error} (click to dismiss)
        </div>
      )}

      <GameBoard
        player={gameState.player}
        shop={gameState.shop}
        onBuyPet={handleBuyPet}
        onBuyFood={handleBuyFood}
        onRoll={rollShop}
        onFreeze={freezeSlot}
        onSell={sellPet}
        onArrange={arrangeTeam}
        onStartBattle={startBattle}
        loading={loading}
        selectedFood={selectedFood}
        onSelectPetForFood={handleSelectPetForFood}
        onCancelFoodSelection={handleCancelFoodSelection}
      />

      {battleResult && (
        <BattleModal
          result={battleResult}
          onClose={clearBattleResult}
        />
      )}
    </div>
  );
}

export default App;
