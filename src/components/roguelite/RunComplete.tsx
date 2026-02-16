import { useRoguelite } from '../../game/roguelite/RogueliteContext';
import type { RogueliteCreature } from '../../types';
import './RunComplete.css';

export function RunComplete() {
  const { state, dispatch } = useRoguelite();
  const run = state.currentRun;
  const battleResult = state.lastBattleResult;

  if (!run) return null;

  const livingTeam = run.team.filter((c): c is RogueliteCreature => c !== null && !c.isDead);
  const deadTeam = run.team.filter((c): c is RogueliteCreature => c !== null && c.isDead);
  const teamWiped = livingTeam.length === 0;

  // Check if this was a boss victory (run.runActive is false + last boss node completed)
  const bossNode = run.map.nodes.find((n) => n.type === 'boss');
  const bossDefeated = bossNode?.completed ?? false;

  const handleContinue = () => {
    dispatch({ type: 'COMPLETE_RUN' });
  };

  return (
    <div className="run-complete">
      <h2 className={`run-complete__title ${bossDefeated ? 'run-complete__title--victory' : 'run-complete__title--defeat'}`}>
        {bossDefeated ? 'Zone Complete!' : teamWiped ? 'Run Over' : 'Run Ended'}
      </h2>

      <div className="run-complete__stats">
        <div className="run-complete__stat">
          <span className="run-complete__stat-label">Nodes Cleared</span>
          <span className="run-complete__stat-value">{run.completedNodes}</span>
        </div>
        <div className="run-complete__stat">
          <span className="run-complete__stat-label">Gold Earned</span>
          <span className="run-complete__stat-value">{run.gold}</span>
        </div>
        <div className="run-complete__stat">
          <span className="run-complete__stat-label">Battles Won</span>
          <span className="run-complete__stat-value">{state.meta.totalBattlesWon}</span>
        </div>
        {run.breedingItemsCollected.length > 0 && (
          <div className="run-complete__stat">
            <span className="run-complete__stat-label">Items Collected</span>
            <span className="run-complete__stat-value">{run.breedingItemsCollected.length}</span>
          </div>
        )}
      </div>

      <div className="run-complete__team">
        <h3>Survivors</h3>
        {livingTeam.length > 0 ? (
          <div className="run-complete__creature-list">
            {livingTeam.map((c) => (
              <div key={c.id} className="run-complete__creature">
                <span className="run-complete__creature-name">{c.name}</span>
                <span className="run-complete__creature-info">
                  Lv{c.level} | {c.currentHealth}/{c.maxHealth} HP
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="run-complete__none">None survived</p>
        )}

        {deadTeam.length > 0 && (
          <>
            <h3>Fallen</h3>
            <div className="run-complete__creature-list">
              {deadTeam.map((c) => (
                <div key={c.id} className="run-complete__creature run-complete__creature--dead">
                  <span className="run-complete__creature-name">{c.name}</span>
                  <span className="run-complete__creature-info">Lv{c.level} | DEAD</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {battleResult && (
        <div className="run-complete__battle-summary">
          <p>
            Last battle: {battleResult.winner === 'player' ? 'Victory' : battleResult.winner === 'opponent' ? 'Defeat' : 'Draw'}
          </p>
        </div>
      )}

      <button className="pixel-btn pixel-btn--wide run-complete__continue" onClick={handleContinue}>
        Return to Menu
      </button>
    </div>
  );
}
