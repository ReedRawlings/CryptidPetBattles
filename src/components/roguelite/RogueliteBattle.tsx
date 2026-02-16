import { useState, useEffect, useRef } from 'react';
import { useRoguelite } from '../../game/roguelite/RogueliteContext';
import type { Creature, BattleEvent, RogueliteCreature, BuffType } from '../../types';
import { BUFF_DEFINITIONS } from '../../types';
import './RogueliteBattle.css';

const BUFF_ICONS: Partial<Record<BuffType, string>> = {
  strengthen: '/assets/icons/Strengthen.png',
  weaken: '/assets/icons/Weaken.png',
  haste: '/assets/icons/Haste.png',
  slow: '/assets/icons/Slow.png',
  burn: '/assets/icons/Burn.png',
  poison: '/assets/icons/Poison.png',
  gigantify: '/assets/icons/Gigantify.png',
};

const BUFF_LABELS: Record<BuffType, string> = {
  strengthen: 'STR',
  weaken: 'WK',
  thorns: 'THN',
  haste: 'HST',
  slow: 'SLW',
  burn: 'BRN',
  poison: 'PSN',
  bleed: 'BLD',
  taunt: 'TNT',
  gigantify: 'GIG',
};

interface BattleCreature extends Creature {
  displayHealth: number;
  displayAttack: number;
  displayBuffs: { type: BuffType; stacks: number }[];
  isAttacking: boolean;
  showAttackEffect: boolean;
  isFainted: boolean;
  damageNumber: number | null;
  buffLabel: string | null;
}

function cloneBattle(c: Creature): BattleCreature {
  return {
    ...c,
    displayHealth: c.currentHealth,
    displayAttack: c.currentAttack,
    displayBuffs: c.buffs.map((b) => ({ type: b.type, stacks: b.stacks })),
    isAttacking: false,
    showAttackEffect: false,
    isFainted: false,
    damageNumber: null,
    buffLabel: null,
  };
}

export function RogueliteBattle() {
  const { state, dispatch } = useRoguelite();
  const run = state.currentRun;

  const [playerTeam, setPlayerTeam] = useState<BattleCreature[]>([]);
  const [opponentTeam, setOpponentTeam] = useState<BattleCreature[]>([]);
  const [eventIndex, setEventIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [battleSpeed, setBattleSpeed] = useState(2);
  const [battleStarted, setBattleStarted] = useState(false);
  const [attackQueue, setAttackQueue] = useState<{ id: string; name: string; isPlayer: boolean }[]>([]);

  // Track which IDs belong to the player for identifying teams in events
  const playerIdsRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<{ id: string; name: string; isPlayer: boolean }[]>([]);

  const battleResult = state.lastBattleResult;

  // When phase becomes 'battle' and we haven't resolved yet, trigger resolution
  useEffect(() => {
    if (state.phase === 'battle' && !battleStarted) {
      setBattleStarted(true);
      dispatch({ type: 'RESOLVE_BATTLE' });
    }
  }, [state.phase, battleStarted]);

  // When we get battle result + enemy team + pre-battle team, set up animation
  useEffect(() => {
    if (battleResult && state.enemyTeam && state.preBattleTeam && battleStarted) {
      // Use pre-battle team snapshot (still has original HP) for player display
      const pTeam = state.preBattleTeam
        .filter((c): c is RogueliteCreature => c !== null && !c.isDead)
        .map(cloneBattle);

      const oTeam = state.enemyTeam.map(cloneBattle);

      // Track player IDs
      playerIdsRef.current = new Set(pTeam.map((c) => c.id));

      // Build initial attack queue sorted by speed
      const allForQueue = [
        ...pTeam.map((c) => ({ id: c.id, name: c.name, isPlayer: true, speed: c.currentSpeed })),
        ...oTeam.map((c) => ({ id: c.id, name: c.name, isPlayer: false, speed: c.currentSpeed })),
      ];
      allForQueue.sort((a, b) => b.speed - a.speed);
      const q = allForQueue.map(({ id, name, isPlayer }) => ({ id, name, isPlayer }));
      queueRef.current = q;
      setAttackQueue(q);

      setPlayerTeam(pTeam);
      setOpponentTeam(oTeam);
      setEventIndex(0);
      setIsComplete(false);
    }
  }, [battleResult, state.enemyTeam, state.preBattleTeam, battleStarted]);

  // Animate events
  useEffect(() => {
    if (!battleResult || isComplete || playerTeam.length === 0) return;
    const events = battleResult.events;
    if (eventIndex >= events.length) {
      setIsComplete(true);
      return;
    }

    const delay = 600 / battleSpeed;
    const timeout = setTimeout(() => {
      processEvent(events[eventIndex]);
      setEventIndex((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timeout);
  }, [eventIndex, battleResult, isComplete, battleSpeed, playerTeam.length]);

  const updateQueue = (newQueue: { id: string; name: string; isPlayer: boolean }[]) => {
    queueRef.current = newQueue;
    setAttackQueue(newQueue);
  };

  const processEvent = (event: BattleEvent) => {
    // Clear previous effects
    const clear = (prev: BattleCreature[]) =>
      prev.map((c) => ({ ...c, isAttacking: false, showAttackEffect: false, damageNumber: null, buffLabel: null }));
    setPlayerTeam(clear);
    setOpponentTeam(clear);

    const isPlayerId = (id: string) => playerIdsRef.current.has(id);

    const update = (isPlayer: boolean, id: string, updates: Partial<BattleCreature>) => {
      const setter = isPlayer ? setPlayerTeam : setOpponentTeam;
      setter((prev) => {
        const idx = prev.findIndex((c) => c.id === id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], ...updates };
        return next;
      });
    };

    // Use functional updates for HP changes to avoid stale closures
    const applyHpChange = (isPlayer: boolean, id: string, delta: number, extraUpdates: Partial<BattleCreature>) => {
      const setter = isPlayer ? setPlayerTeam : setOpponentTeam;
      setter((prev) => {
        const idx = prev.findIndex((c) => c.id === id);
        if (idx === -1) return prev;
        const next = [...prev];
        const c = next[idx];
        const newHp = delta > 0
          ? Math.min(c.maxHealth, c.displayHealth + delta)
          : Math.max(0, c.displayHealth + delta);
        next[idx] = { ...c, displayHealth: newHp, ...extraUpdates };
        return next;
      });
    };

    const addBuff = (isPlayer: boolean, id: string, buffType: BuffType, stacks: number) => {
      const setter = isPlayer ? setPlayerTeam : setOpponentTeam;
      setter((prev) => {
        const idx = prev.findIndex((c) => c.id === id);
        if (idx === -1) return prev;
        const next = [...prev];
        const c = { ...next[idx] };
        const buffs = [...c.displayBuffs];
        const existing = buffs.findIndex((b) => b.type === buffType);
        if (existing >= 0) {
          buffs[existing] = { ...buffs[existing], stacks: buffs[existing].stacks + stacks };
        } else {
          buffs.push({ type: buffType, stacks });
        }
        c.displayBuffs = buffs;
        next[idx] = c;
        return next;
      });
    };

    const removeBuff = (isPlayer: boolean, id: string, buffType: BuffType) => {
      const setter = isPlayer ? setPlayerTeam : setOpponentTeam;
      setter((prev) => {
        const idx = prev.findIndex((c) => c.id === id);
        if (idx === -1) return prev;
        const next = [...prev];
        const c = { ...next[idx] };
        c.displayBuffs = c.displayBuffs.filter((b) => b.type !== buffType);
        next[idx] = c;
        return next;
      });
    };

    switch (event.type) {
      case 'attack': {
        if (event.source) {
          update(isPlayerId(event.source), event.source, { isAttacking: true });
          // Rotate queue: move attacker from wherever it is to the back
          const q = [...queueRef.current];
          const idx = q.findIndex((c) => c.id === event.source);
          if (idx !== -1) {
            const [attacker] = q.splice(idx, 1);
            q.push(attacker);
            updateQueue(q);
          }
        }
        break;
      }
      case 'damage':
      case 'dot_tick':
      case 'thorns_damage': {
        if (event.target) {
          const ip = isPlayerId(event.target);
          applyHpChange(ip, event.target, -event.value, {
            showAttackEffect: true,
            damageNumber: -event.value,
          });
        }
        break;
      }
      case 'heal': {
        if (event.target) {
          const ip = isPlayerId(event.target);
          applyHpChange(ip, event.target, event.value, {
            buffLabel: `+${event.value} HP`,
          });
        }
        break;
      }
      case 'buff_applied':
      case 'buff': {
        if (event.target && event.buffType) {
          const ip = isPlayerId(event.target);
          update(ip, event.target, {
            buffLabel: `+${BUFF_DEFINITIONS[event.buffType].name}`,
          });
          addBuff(ip, event.target, event.buffType, event.value || 1);
        }
        break;
      }
      case 'debuff_applied': {
        if (event.target && event.buffType) {
          const ip = isPlayerId(event.target);
          update(ip, event.target, {
            buffLabel: `${BUFF_DEFINITIONS[event.buffType].name}!`,
          });
          addBuff(ip, event.target, event.buffType, event.value || 1);
        }
        break;
      }
      case 'buff_removed': {
        if (event.target && event.buffType) {
          removeBuff(isPlayerId(event.target), event.target, event.buffType);
        }
        break;
      }
      case 'faint': {
        const faintId = event.source;
        if (faintId) {
          // Mark as fainted in whichever team it belongs to
          const ip = isPlayerId(faintId);
          update(ip, faintId, { isFainted: true, displayHealth: 0 });
          // Remove from attack queue
          updateQueue(queueRef.current.filter((c) => c.id !== faintId));
          setTimeout(() => {
            const setter = ip ? setPlayerTeam : setOpponentTeam;
            setter((prev) => prev.filter((c) => c.id !== faintId));
          }, 300);
        }
        break;
      }
      case 'summon': {
        if (event.target && event.source) {
          const ip = isPlayerId(event.source);
          // Track summoned creature's team affiliation
          if (ip) playerIdsRef.current.add(event.target);

          const statsMatch = event.description?.match(/(\d+)\/(\d+)/);
          const summonAtk = statsMatch ? parseInt(statsMatch[1], 10) : 5;
          const summonHp = statsMatch ? parseInt(statsMatch[2], 10) : 10;

          const summoned: BattleCreature = {
            id: event.target,
            templateId: 'bone',
            name: 'Bone',
            type: 'Spirit',
            role: 'brawler',
            shopTier: 0,
            tier: 1,
            experience: 0,
            baseAttack: summonAtk,
            baseHealth: summonHp,
            baseSpeed: 1,
            currentAttack: summonAtk,
            currentHealth: summonHp,
            currentSpeed: 1,
            maxHealth: summonHp,
            position: 'frontline',
            slotIndex: 0,
            teamIndex: 0,
            ability: { name: 'None', id: 'none', trigger: 'passive', description: '', effects: [] },
            buffs: [],
            battlesParticipated: 0,
            displayHealth: summonHp,
            displayAttack: summonAtk,
            displayBuffs: [],
            isAttacking: false,
            showAttackEffect: false,
            isFainted: false,
            damageNumber: null,
            buffLabel: 'Summoned!',
          };

          const setter = ip ? setPlayerTeam : setOpponentTeam;
          setter((prev) => [...prev, summoned]);
          // Add summoned creature to attack queue
          updateQueue([...queueRef.current, { id: event.target, name: 'Bone', isPlayer: ip }]);
        }
        break;
      }
      case 'battleEnd':
        setIsComplete(true);
        break;
    }
  };

  // "Continue" after animation: apply results and transition
  const handleContinue = () => {
    dispatch({ type: 'CONTINUE_AFTER_BATTLE' });
    // Reset local state for next battle
    setBattleStarted(false);
    setPlayerTeam([]);
    setOpponentTeam([]);
    setEventIndex(0);
    setIsComplete(false);
  };

  const handleSkip = () => setIsComplete(true);

  if (!run) return null;

  // Battle animation / result
  return (
    <div className="roguelite-battle">
      <div className="roguelite-battle__controls">
        <button className="pixel-btn" onClick={() => setBattleSpeed((s) => s >= 3 ? 1 : s + 1)}>
          {battleSpeed}x
        </button>
        {!isComplete && <button className="pixel-btn" onClick={handleSkip}>Skip</button>}
      </div>

      {attackQueue.length > 0 && !isComplete && (
        <div className="roguelite-battle__queue">
          <span className="roguelite-battle__queue-label">Next</span>
          <div className="roguelite-battle__queue-list">
            {attackQueue.map((c, i) => (
              <div
                key={c.id}
                className={`roguelite-battle__queue-item ${c.isPlayer ? 'roguelite-battle__queue-item--player' : 'roguelite-battle__queue-item--enemy'} ${i === 0 ? 'roguelite-battle__queue-item--next' : ''}`}
              >
                {c.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="roguelite-battle__arena">
        <div className="roguelite-battle__side">
          <h3>Your Team</h3>
          <div className="roguelite-battle__creatures">
            {playerTeam.map((c) => (
              <div key={c.id} className={`roguelite-battle__creature ${c.isFainted ? 'roguelite-battle__creature--fainted' : ''} ${c.isAttacking ? 'roguelite-battle__creature--attacking' : ''}`}>
                <div className="roguelite-battle__avatar" style={{ borderColor: c.isFainted ? '#555' : '#22c55e' }}>
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="roguelite-battle__creature-name">{c.name}</div>
                <div className="roguelite-battle__hp-bar">
                  <div className="roguelite-battle__hp-fill" style={{ width: `${(c.displayHealth / c.maxHealth) * 100}%` }} />
                </div>
                <div className="roguelite-battle__creature-stats">{c.displayAttack} ATK | {c.displayHealth} HP</div>
                {c.displayBuffs.length > 0 && (
                  <div className="roguelite-battle__buffs">
                    {c.displayBuffs.map((b) => {
                      const def = BUFF_DEFINITIONS[b.type];
                      const isDebuff = def.category === 'debuff' || def.category === 'dot';
                      const iconSrc = BUFF_ICONS[b.type];
                      return (
                        <div key={b.type} className={`roguelite-battle__buff-icon ${isDebuff ? 'roguelite-battle__buff-icon--debuff' : ''}`} title={`${def.name} x${b.stacks}`}>
                          {iconSrc ? (
                            <img src={iconSrc} alt={def.name} className="roguelite-battle__buff-img" />
                          ) : (
                            <span className="roguelite-battle__buff-text">{BUFF_LABELS[b.type]}</span>
                          )}
                          {b.stacks > 1 && <span className="roguelite-battle__buff-stacks">{b.stacks}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {c.damageNumber !== null && <div className="roguelite-battle__dmg-number">{c.damageNumber}</div>}
                {c.buffLabel && <div className="roguelite-battle__buff-label">{c.buffLabel}</div>}
                {c.showAttackEffect && <div className="roguelite-battle__hit-flash" />}
              </div>
            ))}
          </div>
        </div>

        <div className="roguelite-battle__vs">VS</div>

        <div className="roguelite-battle__side">
          <h3>Enemies</h3>
          <div className="roguelite-battle__creatures">
            {opponentTeam.map((c) => (
              <div key={c.id} className={`roguelite-battle__creature ${c.isFainted ? 'roguelite-battle__creature--fainted' : ''} ${c.isAttacking ? 'roguelite-battle__creature--attacking' : ''}`}>
                <div className="roguelite-battle__avatar" style={{ borderColor: c.isFainted ? '#555' : '#ef4444' }}>
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="roguelite-battle__creature-name">{c.name}</div>
                <div className="roguelite-battle__hp-bar">
                  <div className="roguelite-battle__hp-fill roguelite-battle__hp-fill--enemy" style={{ width: `${(c.displayHealth / c.maxHealth) * 100}%` }} />
                </div>
                <div className="roguelite-battle__creature-stats">{c.displayAttack} ATK | {c.displayHealth} HP</div>
                {c.displayBuffs.length > 0 && (
                  <div className="roguelite-battle__buffs">
                    {c.displayBuffs.map((b) => {
                      const def = BUFF_DEFINITIONS[b.type];
                      const isDebuff = def.category === 'debuff' || def.category === 'dot';
                      const iconSrc = BUFF_ICONS[b.type];
                      return (
                        <div key={b.type} className={`roguelite-battle__buff-icon ${isDebuff ? 'roguelite-battle__buff-icon--debuff' : ''}`} title={`${def.name} x${b.stacks}`}>
                          {iconSrc ? (
                            <img src={iconSrc} alt={def.name} className="roguelite-battle__buff-img" />
                          ) : (
                            <span className="roguelite-battle__buff-text">{BUFF_LABELS[b.type]}</span>
                          )}
                          {b.stacks > 1 && <span className="roguelite-battle__buff-stacks">{b.stacks}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {c.damageNumber !== null && <div className="roguelite-battle__dmg-number">{c.damageNumber}</div>}
                {c.buffLabel && <div className="roguelite-battle__buff-label">{c.buffLabel}</div>}
                {c.showAttackEffect && <div className="roguelite-battle__hit-flash" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isComplete && battleResult && (
        <div className="roguelite-battle__result">
          <div className={`roguelite-battle__result-text roguelite-battle__result-text--${battleResult.winner}`}>
            {battleResult.winner === 'player' && 'Victory!'}
            {battleResult.winner === 'opponent' && 'Defeat'}
            {battleResult.winner === 'draw' && 'Draw'}
          </div>
          <button className="pixel-btn pixel-btn--wide" onClick={handleContinue}>Continue</button>
        </div>
      )}
    </div>
  );
}
