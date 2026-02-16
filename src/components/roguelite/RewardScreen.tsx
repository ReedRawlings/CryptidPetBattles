import { useState } from 'react';
import { useRoguelite } from '../../game/roguelite/RogueliteContext';
import type { RogueliteCreature } from '../../types';
import './RewardScreen.css';

export function RewardScreen() {
  const { state, dispatch } = useRoguelite();
  const run = state.currentRun;
  const rewards = state.rewardChoices;

  const [selectedReward, setSelectedReward] = useState<number | null>(null);
  const [targetCreature, setTargetCreature] = useState<number | null>(null);

  if (!run || !rewards) return <div>No rewards available</div>;

  const selected = selectedReward !== null ? rewards[selectedReward] : null;
  const needsTarget = selected?.type === 'xp' || selected?.type === 'creature';

  const livingTeam = run.team
    .map((c, i) => ({ creature: c, index: i }))
    .filter((x): x is { creature: RogueliteCreature; index: number } => x.creature !== null && !x.creature.isDead);

  const emptySlots = run.team
    .map((c, i) => ({ creature: c, index: i }))
    .filter((x) => x.creature === null);

  const deadSlots = run.team
    .map((c, i) => ({ creature: c, index: i }))
    .filter((x): x is { creature: RogueliteCreature; index: number } => x.creature !== null && x.creature.isDead);

  const handleConfirm = () => {
    if (selectedReward === null) return;

    if (selected?.type === 'breeding_item') {
      dispatch({ type: 'CHOOSE_REWARD', rewardIndex: selectedReward });
    } else if (needsTarget && targetCreature !== null) {
      dispatch({ type: 'CHOOSE_REWARD', rewardIndex: selectedReward, targetCreatureIndex: targetCreature });
    } else if (selected?.type === 'creature') {
      const slot = emptySlots.length > 0 ? emptySlots[0].index : deadSlots.length > 0 ? deadSlots[0].index : -1;
      if (slot !== -1) dispatch({ type: 'CHOOSE_REWARD', rewardIndex: selectedReward, targetCreatureIndex: slot });
    }
  };

  const canConfirm = selectedReward !== null && (
    selected?.type === 'breeding_item' ||
    targetCreature !== null ||
    (selected?.type === 'creature' && (emptySlots.length > 0 || deadSlots.length > 0))
  );

  return (
    <div className="reward-screen">
      <h2 className="reward-screen__title">Choose Your Reward</h2>

      <div className="reward-screen__choices">
        {rewards.map((reward, i) => (
          <button
            key={i}
            className={`reward-screen__choice ${selectedReward === i ? 'reward-screen__choice--selected' : ''}`}
            onClick={() => { setSelectedReward(i); setTargetCreature(null); }}
          >
            <span className="reward-screen__choice-icon">
              {reward.type === 'creature' && '\u2694'}
              {reward.type === 'xp' && '\u2B06'}
              {reward.type === 'breeding_item' && '\u2728'}
            </span>
            <span className="reward-screen__choice-type">
              {reward.type === 'creature' && 'New Creature'}
              {reward.type === 'xp' && 'XP Boost'}
              {reward.type === 'breeding_item' && 'Breeding Item'}
            </span>
            <span className="reward-screen__choice-desc">{reward.description}</span>
          </button>
        ))}
      </div>

      {/* Target selection for XP or creature placement */}
      {needsTarget && selectedReward !== null && (
        <div className="reward-screen__target">
          <h3>
            {selected?.type === 'xp' ? 'Give XP to:' : 'Place in slot:'}
          </h3>
          <div className="reward-screen__target-list">
            {selected?.type === 'xp' && livingTeam.map(({ creature, index }) => (
              <button
                key={index}
                className={`reward-screen__target-btn ${targetCreature === index ? 'reward-screen__target-btn--selected' : ''}`}
                onClick={() => setTargetCreature(index)}
              >
                <span className="reward-screen__target-name">{creature.name}</span>
                <span className="reward-screen__target-info">Lv{creature.level} | {creature.currentHealth}/{creature.maxHealth} HP</span>
              </button>
            ))}
            {selected?.type === 'creature' && (
              <>
                {emptySlots.map(({ index }) => (
                  <button
                    key={index}
                    className={`reward-screen__target-btn ${targetCreature === index ? 'reward-screen__target-btn--selected' : ''}`}
                    onClick={() => setTargetCreature(index)}
                  >
                    Empty Slot {index + 1}
                  </button>
                ))}
                {deadSlots.map(({ creature, index }) => (
                  <button
                    key={`dead-${index}`}
                    className={`reward-screen__target-btn reward-screen__target-btn--dead ${targetCreature === index ? 'reward-screen__target-btn--selected' : ''}`}
                    onClick={() => setTargetCreature(index)}
                  >
                    <span>Replace: {creature.name} (Dead)</span>
                    <span className="reward-screen__target-info">Lv{creature.level}</span>
                  </button>
                ))}
                {livingTeam.map(({ creature, index }) => (
                  <button
                    key={index}
                    className={`reward-screen__target-btn reward-screen__target-btn--replace ${targetCreature === index ? 'reward-screen__target-btn--selected' : ''}`}
                    onClick={() => setTargetCreature(index)}
                  >
                    <span>Replace: {creature.name}</span>
                    <span className="reward-screen__target-info">Lv{creature.level}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      <button
        className="pixel-btn reward-screen__confirm"
        disabled={!canConfirm}
        onClick={handleConfirm}
      >
        Confirm
      </button>

      <button
        className="reward-screen__skip"
        onClick={() => dispatch({ type: 'CHOOSE_REWARD', rewardIndex: 0 })}
      >
        Skip Reward
      </button>
    </div>
  );
}
