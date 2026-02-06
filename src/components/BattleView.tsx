import { useState, useEffect } from 'react';
import { useGame } from '../game';
import { Creature, BattleEvent, Tribe, BuffType, BUFF_DEFINITIONS } from '../types';
import './BattleView.css';

const TRIBE_COLORS: Record<Tribe, string> = {
  Spirit: '#8B5CF6',
  Flora: '#22C55E',
  Fauna: '#F59E0B',
  Kami: '#3B82F6',
  Dessert: '#EC4899',
};

interface BattleCreature extends Creature {
  displayHealth: number;
  displayAttack: number;
  displaySpeed: number;
  displayBuffs: { type: BuffType; stacks: number }[];
  isAttacking: boolean;
  showAttackEffect: boolean;
  showBuffEffect: boolean;
  isFainted: boolean;
  damageNumber: number | null;
  buffNumber: string | null;
}

function cloneBattleCreature(c: Creature): BattleCreature {
  return {
    ...c,
    displayHealth: c.currentHealth,
    displayAttack: c.currentAttack,
    displaySpeed: c.currentSpeed,
    displayBuffs: [],
    isAttacking: false,
    showAttackEffect: false,
    showBuffEffect: false,
    isFainted: false,
    damageNumber: null,
    buffNumber: null,
  };
}

export function BattleView() {
  const { state, nextTurn } = useGame();
  const { lastBattleResult, currentOpponent, player } = state;

  const [playerTeam, setPlayerTeam] = useState<BattleCreature[]>([]);
  const [opponentTeam, setOpponentTeam] = useState<BattleCreature[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [battleSpeed, setBattleSpeed] = useState(2);
  const [originalPlayerIds, setOriginalPlayerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (player && currentOpponent) {
      const pTeam = player.team.filter((c): c is Creature => c !== null).map(cloneBattleCreature);
      const oTeam = currentOpponent.team.filter((c): c is Creature => c !== null).map(cloneBattleCreature);
      setPlayerTeam(pTeam);
      setOpponentTeam(oTeam);
      setOriginalPlayerIds(new Set(pTeam.map((c) => c.id)));
      setCurrentEventIndex(0);
      setIsComplete(false);
    }
  }, [player, currentOpponent]);

  useEffect(() => {
    if (!lastBattleResult || isComplete) return;

    const events = lastBattleResult.events;
    if (currentEventIndex >= events.length) {
      setIsComplete(true);
      return;
    }

    const event = events[currentEventIndex];
    const baseDelay = 800 / battleSpeed;

    const timeout = setTimeout(() => {
      processEvent(event);
      setCurrentEventIndex((prev) => prev + 1);
    }, baseDelay);

    return () => clearTimeout(timeout);
  }, [currentEventIndex, lastBattleResult, isComplete, battleSpeed]);

  const findCreatureById = (id: string | null): { creature: BattleCreature | null; team: 'player' | 'opponent' | null } => {
    if (!id) return { creature: null, team: null };
    for (const c of playerTeam) {
      if (c.id === id) return { creature: c, team: 'player' };
    }
    for (const c of opponentTeam) {
      if (c.id === id) return { creature: c, team: 'opponent' };
    }
    return { creature: null, team: null };
  };

  const updateCreatureById = (team: 'player' | 'opponent', id: string, updates: Partial<BattleCreature>) => {
    const setState = team === 'player' ? setPlayerTeam : setOpponentTeam;
    setState((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      const newTeam = [...prev];
      newTeam[idx] = { ...newTeam[idx], ...updates };
      return newTeam;
    });
  };

  const clearEffects = () => {
    const clear = (prev: BattleCreature[]) =>
      prev.map((c) => ({
        ...c,
        isAttacking: false,
        showAttackEffect: false,
        showBuffEffect: false,
        damageNumber: null,
        buffNumber: null,
      }));
    setPlayerTeam(clear);
    setOpponentTeam(clear);
  };

  const processEvent = (event: BattleEvent) => {
    clearEffects();

    const { creature: source, team: sourceTeam } = findCreatureById(event.source);
    const { creature: target, team: targetTeam } = findCreatureById(event.target);

    switch (event.type) {
      case 'battleStart':
      case 'round_start':
      case 'initiative':
        break;

      case 'attack':
        if (sourceTeam && source) {
          updateCreatureById(sourceTeam, source.id, { isAttacking: true });
        }
        break;

      case 'damage':
        if (targetTeam && target) {
          const newHealth = Math.max(0, target.displayHealth - event.value);
          updateCreatureById(targetTeam, target.id, {
            displayHealth: newHealth,
            showAttackEffect: true,
            damageNumber: -event.value,
          });
          setTimeout(() => {
            updateCreatureById(targetTeam, target.id, { showAttackEffect: false });
          }, 350);
        }
        break;

      case 'dot_tick':
        if (targetTeam && target) {
          const newHealth = Math.max(0, target.displayHealth - event.value);
          updateCreatureById(targetTeam, target.id, {
            displayHealth: newHealth,
            damageNumber: -event.value,
          });
        }
        break;

      case 'thorns_damage':
        if (targetTeam && target) {
          const newHealth = Math.max(0, target.displayHealth - event.value);
          updateCreatureById(targetTeam, target.id, {
            displayHealth: newHealth,
            damageNumber: -event.value,
          });
        }
        break;

      case 'heal':
        if (targetTeam && target) {
          const newHealth = Math.min(target.maxHealth, target.displayHealth + event.value);
          updateCreatureById(targetTeam, target.id, {
            displayHealth: newHealth,
            showBuffEffect: true,
            buffNumber: `+${event.value} HP`,
          });
        }
        break;

      case 'buff':
      case 'buff_applied':
        if (targetTeam && target) {
          updateCreatureById(targetTeam, target.id, {
            showBuffEffect: true,
            buffNumber: event.buffType
              ? `+${event.value} ${BUFF_DEFINITIONS[event.buffType].name}`
              : `+${event.value}`,
          });
          setTimeout(() => {
            updateCreatureById(targetTeam, target.id, { showBuffEffect: false });
          }, 650);
        }
        break;

      case 'debuff_applied':
        if (targetTeam && target) {
          updateCreatureById(targetTeam, target.id, {
            showBuffEffect: true,
            buffNumber: event.buffType
              ? `${BUFF_DEFINITIONS[event.buffType].name}!`
              : 'Debuff!',
          });
          setTimeout(() => {
            updateCreatureById(targetTeam, target.id, { showBuffEffect: false });
          }, 650);
        }
        break;

      case 'buff_removed':
        break;

      case 'faint':
        if (sourceTeam && source) {
          updateCreatureById(sourceTeam, source.id, { isFainted: true, displayHealth: 0 });
          const capturedTeam = sourceTeam;
          const capturedId = source.id;
          setTimeout(() => {
            const setState = capturedTeam === 'player' ? setPlayerTeam : setOpponentTeam;
            setState((prev) => prev.filter((c) => c.id !== capturedId));
          }, 300);
        }
        break;

      case 'summon':
        if (event.target && event.source) {
          const isPlayerSummon = originalPlayerIds.has(event.source);
          const statsMatch = event.description?.match(/(\d+)\/(\d+)/);
          const summonAttack = statsMatch ? parseInt(statsMatch[1], 10) : 5;
          const summonHealth = statsMatch ? parseInt(statsMatch[2], 10) : 10;

          const summoned: BattleCreature = {
            id: event.target,
            templateId: 'bone',
            name: 'Bone',
            type: 'Spirit',
            role: 'brawler',
            shopTier: 0,
            star: 1,
            experience: 0,
            baseAttack: summonAttack,
            baseHealth: summonHealth,
            baseSpeed: 1,
            currentAttack: summonAttack,
            currentHealth: summonHealth,
            currentSpeed: 1,
            maxHealth: summonHealth,
            position: 'frontline',
            slotIndex: 0,
            teamIndex: 0,
            ability: { name: 'None', id: 'none', trigger: 'passive', description: '', effects: [] },
            buffs: [],
            battlesParticipated: 0,
            displayHealth: summonHealth,
            displayAttack: summonAttack,
            displaySpeed: 1,
            displayBuffs: [],
            isAttacking: false,
            showAttackEffect: false,
            showBuffEffect: true,
            isFainted: false,
            damageNumber: null,
            buffNumber: 'Summoned!',
          };

          if (isPlayerSummon) {
            setOriginalPlayerIds((prev) => new Set([...prev, event.target!]));
            setPlayerTeam((prev) => [...prev, summoned]);
          } else {
            setOpponentTeam((prev) => [...prev, summoned]);
          }
        }
        break;

      case 'ability':
        if (sourceTeam && source) {
          updateCreatureById(sourceTeam, source.id, { showBuffEffect: true });
        }
        break;

      case 'battleEnd':
        setIsComplete(true);
        break;
    }
  };

  const handleSkip = () => setIsComplete(true);
  const handleContinue = () => nextTurn();
  const handleSpeedChange = () => setBattleSpeed((prev) => (prev >= 3 ? 1 : prev + 1));

  if (!lastBattleResult || !currentOpponent) return null;

  const { winner } = lastBattleResult;

  const renderCreature = (creature: BattleCreature, isPlayerTeam: boolean) => {
    if (creature.isFainted) {
      return (
        <div className="battle-pet battle-pet--fainted">
          <div className="battle-pet__avatar" style={{ backgroundColor: TRIBE_COLORS[creature.type] }}>
            {creature.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="battle-pet__fainted-text">Fainted</div>
        </div>
      );
    }

    return (
      <div className={`battle-pet ${creature.isAttacking ? (isPlayerTeam ? 'battle-pet--attacking-right' : 'battle-pet--attacking-left') : ''}`}>
        <div className="battle-pet__avatar" style={{ backgroundColor: TRIBE_COLORS[creature.type] }}>
          {creature.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="battle-pet__stats">
          <span className="battle-pet__stat battle-pet__stat--attack">{creature.displayAttack}</span>
          <span className="battle-pet__stat-divider">/</span>
          <span className="battle-pet__stat battle-pet__stat--health">{creature.displayHealth}</span>
          <span className="battle-pet__stat-divider">|</span>
          <span className="battle-pet__stat battle-pet__stat--speed">{creature.displaySpeed}</span>
        </div>
        <div className="battle-pet__name">{creature.name}</div>
        {creature.star > 1 && <div className="battle-pet__star">{'★'.repeat(creature.star)}</div>}

        {creature.showAttackEffect && (
          <div key={`atk-${Date.now()}`} className="battle-pet__effect battle-pet__effect--attack" />
        )}
        {creature.showBuffEffect && (
          <div key={`buff-${Date.now()}`} className="battle-pet__effect battle-pet__effect--buff" />
        )}
        {creature.damageNumber !== null && (
          <div className="battle-pet__number battle-pet__number--damage">{creature.damageNumber}</div>
        )}
        {creature.buffNumber && (
          <div className="battle-pet__number battle-pet__number--buff">{creature.buffNumber}</div>
        )}
      </div>
    );
  };

  const renderTeam = (team: BattleCreature[], isPlayer: boolean, label: string) => {
    const frontline = team.filter((c) => c.position === 'frontline');
    const backline = team.filter((c) => c.position === 'backline');

    return (
      <div className={`battle-view__team battle-view__team--${isPlayer ? 'player' : 'opponent'}`}>
        <h3>{label}</h3>
        <div className="battle-view__formation">
          {isPlayer ? (
            <>
              <div className="battle-view__row">
                <span className="battle-view__row-label">Back</span>
                {backline.map((c) => (
                  <div key={c.id} className="battle-view__pet-slot">{renderCreature(c, true)}</div>
                ))}
              </div>
              <div className="battle-view__row">
                <span className="battle-view__row-label battle-view__row-label--front">Front</span>
                {frontline.map((c) => (
                  <div key={c.id} className="battle-view__pet-slot">{renderCreature(c, true)}</div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="battle-view__row">
                <span className="battle-view__row-label battle-view__row-label--front">Front</span>
                {frontline.map((c) => (
                  <div key={c.id} className="battle-view__pet-slot">{renderCreature(c, false)}</div>
                ))}
              </div>
              <div className="battle-view__row">
                <span className="battle-view__row-label">Back</span>
                {backline.map((c) => (
                  <div key={c.id} className="battle-view__pet-slot">{renderCreature(c, false)}</div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="battle-view">
      <div className="battle-view__controls">
        <button className="pixel-btn" onClick={handleSpeedChange}>{battleSpeed}x</button>
        {!isComplete && <button className="pixel-btn" onClick={handleSkip}>Skip</button>}
      </div>

      <div className="battle-view__arena">
        {renderTeam(playerTeam, true, 'Your Team')}
        <div className="battle-view__vs">VS</div>
        {renderTeam(opponentTeam, false, currentOpponent.username)}
      </div>

      {isComplete && (
        <div className="battle-view__result">
          <div className={`battle-view__result-text battle-view__result-text--${winner}`}>
            {winner === 'player' && 'Victory!'}
            {winner === 'opponent' && 'Defeat!'}
            {winner === 'draw' && 'Draw!'}
          </div>
          {winner === 'opponent' && lastBattleResult.damageDealt > 0 && (
            <p className="battle-view__damage">
              You lost {lastBattleResult.damageDealt} life{lastBattleResult.damageDealt > 1 ? 's' : ''}!
            </p>
          )}
          <button className="pixel-btn pixel-btn--wide" onClick={handleContinue}>Continue</button>
        </div>
      )}
    </div>
  );
}
