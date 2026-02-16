import { useRoguelite } from '../../game/roguelite/RogueliteContext';
import type { RogueliteCreature } from '../../types';
import { ROGUELITE_CONSTANTS } from '../../types';
import './RestPoint.css';

export function RestPoint() {
  const { state, dispatch } = useRoguelite();
  const run = state.currentRun;

  if (!run) return <div>No active run</div>;

  const livingTeam = run.team
    .map((c, i) => ({ creature: c, index: i }))
    .filter((x): x is { creature: RogueliteCreature; index: number } => x.creature !== null && !x.creature.isDead);

  const deadTeam = run.team
    .map((c, i) => ({ creature: c, index: i }))
    .filter((x): x is { creature: RogueliteCreature; index: number } => x.creature !== null && x.creature.isDead);

  const healPercent = Math.round(ROGUELITE_CONSTANTS.REST_HEAL_PERCENT * 100);
  const revivePercent = Math.round(ROGUELITE_CONSTANTS.REST_REVIVE_HP_PERCENT * 100);

  return (
    <div className="rest-point">
      <h2 className="rest-point__title">Rest Point</h2>
      <p className="rest-point__subtitle">Choose one action</p>

      <div className="rest-point__options">
        <div className="rest-point__option">
          <h3>Heal All</h3>
          <p className="rest-point__option-desc">
            Restore {healPercent}% max HP to all living creatures
          </p>
          <div className="rest-point__preview">
            {livingTeam.map(({ creature }) => {
              const healAmount = Math.round(creature.maxHealth * ROGUELITE_CONSTANTS.REST_HEAL_PERCENT);
              const newHp = Math.min(creature.currentHealth + healAmount, creature.maxHealth);
              const gained = newHp - creature.currentHealth;
              return (
                <div key={creature.id} className="rest-point__creature-row">
                  <span className="rest-point__creature-name">{creature.name}</span>
                  <span className="rest-point__creature-hp">
                    {creature.currentHealth}/{creature.maxHealth}
                    {gained > 0 && <span className="rest-point__heal-amount"> +{gained}</span>}
                  </span>
                </div>
              );
            })}
          </div>
          <button
            className="pixel-btn rest-point__action-btn"
            onClick={() => dispatch({ type: 'REST_HEAL' })}
          >
            Heal All
          </button>
        </div>

        {deadTeam.length > 0 && (
          <div className="rest-point__option">
            <h3>Revive One</h3>
            <p className="rest-point__option-desc">
              Revive one dead creature at {revivePercent}% max HP
            </p>
            <div className="rest-point__preview">
              {deadTeam.map(({ creature, index }) => (
                <button
                  key={creature.id}
                  className="rest-point__revive-btn"
                  onClick={() => dispatch({ type: 'REST_REVIVE', creatureIndex: index })}
                >
                  <span className="rest-point__creature-name">{creature.name}</span>
                  <span className="rest-point__creature-hp">
                    DEAD &rarr; {Math.max(1, Math.round(creature.maxHealth * ROGUELITE_CONSTANTS.REST_REVIVE_HP_PERCENT))} HP
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {livingTeam.length > 0 && (
          <div className="rest-point__option">
            <h3>Train One</h3>
            <p className="rest-point__option-desc">
              Grant +5 XP to one creature
            </p>
            <div className="rest-point__preview">
              {livingTeam.map(({ creature, index }) => (
                <button
                  key={creature.id}
                  className="rest-point__train-btn"
                  onClick={() => dispatch({ type: 'REST_XP', creatureIndex: index })}
                >
                  <span className="rest-point__creature-name">{creature.name}</span>
                  <span className="rest-point__creature-xp">
                    Lv{creature.level} &middot; {creature.xpCurrent}/{creature.xpToNextLevel} XP
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
