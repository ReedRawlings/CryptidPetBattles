import { useState, useMemo } from 'react';
import { useRoguelite } from '../../game/roguelite/RogueliteContext';
import { getEventById } from '../../game/roguelite/events';
import type { RogueliteCreature } from '../../types';
import './EventScreen.css';

function computeOutcome(
  teamBefore: (RogueliteCreature | null)[],
  teamAfter: (RogueliteCreature | null)[],
  goldBefore: number,
  goldAfter: number
): string[] {
  const lines: string[] = [];

  const goldDiff = goldAfter - goldBefore;
  if (goldDiff > 0) lines.push(`Gained ${goldDiff} gold`);
  if (goldDiff < 0) lines.push(`Lost ${Math.abs(goldDiff)} gold`);

  for (let i = 0; i < teamBefore.length; i++) {
    const before = teamBefore[i];
    const after = teamAfter[i];
    if (!before || !after) continue;

    const hpDiff = after.currentHealth - before.currentHealth;
    if (hpDiff > 0) lines.push(`${before.name} healed for ${hpDiff} HP`);
    if (hpDiff < 0) lines.push(`${before.name} took ${Math.abs(hpDiff)} damage`);

    const xpDiff = (after.xpCurrent + after.level * 100) - (before.xpCurrent + before.level * 100);
    if (xpDiff > 0) lines.push(`${before.name} gained ${xpDiff} XP`);
  }

  if (lines.length === 0) lines.push('Nothing happened.');

  return lines;
}

export function EventScreen() {
  const { state, dispatch } = useRoguelite();
  const run = state.currentRun;

  // Use the event stored in state by the engine (set during SELECT_NODE)
  const event = useMemo(() => {
    if (!state.currentEvent) return null;
    return getEventById(state.currentEvent.id);
  }, [state.currentEvent?.id]);

  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<string[] | null>(null);

  if (!run || !event) return <div>No event</div>;

  const handleConfirm = () => {
    if (selectedChoice === null) return;

    // Snapshot state before applying
    const teamBefore = run.team.map((c) => c ? { ...c } : null);
    const goldBefore = run.gold;

    // Simulate the apply to get the outcome
    const afterState = event.choices[selectedChoice].apply(run);
    const teamAfter = afterState.team;
    const goldAfter = afterState.gold;

    const lines = computeOutcome(
      teamBefore as (RogueliteCreature | null)[],
      teamAfter as (RogueliteCreature | null)[],
      goldBefore,
      goldAfter
    );

    setOutcome(lines);
  };

  const handleContinue = () => {
    if (selectedChoice === null) return;
    dispatch({ type: 'RESOLVE_EVENT', choiceIndex: selectedChoice });
  };

  if (outcome) {
    return (
      <div className="event-screen">
        <h2 className="event-screen__title">{event.title}</h2>
        <p className="event-screen__choice-text" style={{ marginBottom: 20 }}>
          {event.choices[selectedChoice!].text}
        </p>
        <div className="event-screen__outcome">
          {outcome.map((line, i) => (
            <div key={i} className="event-screen__outcome-line">{line}</div>
          ))}
        </div>
        <button className="pixel-btn event-screen__confirm" onClick={handleContinue}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="event-screen">
      <h2 className="event-screen__title">{event.title}</h2>
      <p className="event-screen__description">{event.description}</p>

      <div className="event-screen__choices">
        {event.choices.map((choice, i) => (
          <button
            key={i}
            className={`event-screen__choice ${selectedChoice === i ? 'event-screen__choice--selected' : ''}`}
            onClick={() => setSelectedChoice(i)}
          >
            <span className="event-screen__choice-text">{choice.text}</span>
            <span className="event-screen__choice-effect">{choice.effect}</span>
          </button>
        ))}
      </div>

      <button
        className="pixel-btn event-screen__confirm"
        disabled={selectedChoice === null}
        onClick={handleConfirm}
      >
        Confirm Choice
      </button>
    </div>
  );
}
