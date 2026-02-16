import { RogueliteProvider, useRoguelite } from '../../game/roguelite/RogueliteContext';
import { PointBuy } from './PointBuy';
import { RunMap } from './RunMap';
import { RewardScreen } from './RewardScreen';
import { RestPoint } from './RestPoint';
import { EventScreen } from './EventScreen';
import { RunComplete } from './RunComplete';
import { RunShop } from './RunShop';
import { RogueliteBattle } from './RogueliteBattle';
import './RogueliteApp.css';

function RogueliteGame({ onBack }: { onBack: () => void }) {
  const { state, dispatch } = useRoguelite();

  const handleBack = () => {
    onBack();
  };

  const isBattlePhase = state.phase === 'battle';

  return (
    <div className={`roguelite ${isBattlePhase ? 'roguelite--battle' : ''}`}>
      <header className="roguelite__header">
        <button className="roguelite__back-btn" onClick={handleBack}>Back</button>
        <h2 className="roguelite__title">Roguelite Mode</h2>
        {state.currentRun && (
          <div className="roguelite__run-info">
            <span>Zone {state.currentRun.zoneId}</span>
            <span>Gold: {state.currentRun.gold}</span>
            <span>Nodes: {state.currentRun.completedNodes}/15</span>
            <button
              className="roguelite__abandon-btn"
              onClick={() => { if (confirm('Abandon this run? Progress will be lost.')) dispatch({ type: 'ABANDON_RUN' }); }}
            >
              Abandon Run
            </button>
          </div>
        )}
      </header>

      <main className="roguelite__content">
        {renderPhase(state.phase)}
      </main>
    </div>
  );

  function renderPhase(phase: string) {
    switch (phase) {
      case 'roster':
      case 'point_buy':
        return <PointBuy />;
      case 'map':
        return <RunMap />;
      case 'battle':
        return <RogueliteBattle />;
      case 'reward':
        return <RewardScreen />;
      case 'shop':
        return <RunShop />;
      case 'rest':
        return <RestPoint />;
      case 'event':
        return <EventScreen />;
      case 'run_complete':
        return <RunComplete />;
      default:
        return <PointBuy />;
    }
  }
}

export function RogueliteApp({ onBack }: { onBack: () => void }) {
  return (
    <RogueliteProvider>
      <RogueliteGame onBack={onBack} />
    </RogueliteProvider>
  );
}
