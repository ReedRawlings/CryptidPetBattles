import { useState, useEffect } from 'react';
import { useGame } from '../game';
import { Pet, BattleEvent } from '../types';
import './BattleView.css';

interface BattlePet extends Pet {
  displayHealth: number;
  displayAttack: number;
  displayArmor: number;
  isAttacking: boolean;
  showAttackEffect: boolean;
  showBuffEffect: boolean;
  showDamageEffect: boolean;
  isFainted: boolean;
  damageNumber: number | null;
  buffNumber: string | null;
}

function cloneBattlePet(pet: Pet): BattlePet {
  return {
    ...pet,
    displayHealth: pet.currentHealth,
    displayAttack: pet.currentAttack,
    displayArmor: pet.armor || 0,
    isAttacking: false,
    showAttackEffect: false,
    showBuffEffect: false,
    showDamageEffect: false,
    isFainted: false,
    damageNumber: null,
    buffNumber: null,
  };
}

export function BattleView() {
  const { state, nextTurn } = useGame();
  const { lastBattleResult, currentOpponent, player } = state;

  const [playerTeam, setPlayerTeam] = useState<BattlePet[]>([]);
  const [opponentTeam, setOpponentTeam] = useState<BattlePet[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [battleSpeed, setBattleSpeed] = useState(2); // Default to 2x speed

  // Track original pet IDs to determine team ownership even after pets are removed
  const [originalPlayerPetIds, setOriginalPlayerPetIds] = useState<Set<string>>(new Set());

  // Track where pets fainted so summons appear in the right spot
  const [faintedPositions, setFaintedPositions] = useState<Map<string, { team: 'player' | 'opponent', index: number }>>(new Map());

  // Initialize teams from player state (filter out nulls)
  useEffect(() => {
    if (player && currentOpponent) {
      const playerPets = player.team.filter((p): p is Pet => p !== null).map(cloneBattlePet);
      const opponentPets = currentOpponent.team.filter((p): p is Pet => p !== null).map(cloneBattlePet);
      setPlayerTeam(playerPets);
      setOpponentTeam(opponentPets);
      // Store original player pet IDs for team lookup after pets are removed
      setOriginalPlayerPetIds(new Set(playerPets.map(p => p.id)));
      setCurrentEventIndex(0);
      setIsComplete(false);
    }
  }, [player, currentOpponent]);

  // Process events one by one
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
      setCurrentEventIndex(prev => prev + 1);
    }, baseDelay);

    return () => clearTimeout(timeout);
  }, [currentEventIndex, lastBattleResult, isComplete, battleSpeed]);

  const findPetById = (id: string | null): { pet: BattlePet | null; team: 'player' | 'opponent' | null; index: number } => {
    if (!id) return { pet: null, team: null, index: -1 };

    for (let i = 0; i < playerTeam.length; i++) {
      if (playerTeam[i]?.id === id) {
        return { pet: playerTeam[i], team: 'player', index: i };
      }
    }
    for (let i = 0; i < opponentTeam.length; i++) {
      if (opponentTeam[i]?.id === id) {
        return { pet: opponentTeam[i], team: 'opponent', index: i };
      }
    }
    return { pet: null, team: null, index: -1 };
  };

  // Update pet by ID to avoid race conditions with index shifts after summons
  const updatePetById = (team: 'player' | 'opponent', petId: string, updates: Partial<BattlePet>) => {
    const setState = team === 'player' ? setPlayerTeam : setOpponentTeam;
    setState(prev => {
      const index = prev.findIndex(p => p?.id === petId);
      if (index === -1) return prev;
      const newTeam = [...prev];
      newTeam[index] = { ...newTeam[index], ...updates };
      return newTeam;
    });
  };

  // Legacy index-based update for cases where we know index is stable
  const updatePet = (team: 'player' | 'opponent', index: number, updates: Partial<BattlePet>) => {
    if (team === 'player') {
      setPlayerTeam(prev => {
        const newTeam = [...prev];
        if (newTeam[index]) {
          newTeam[index] = { ...newTeam[index], ...updates };
        }
        return newTeam;
      });
    } else {
      setOpponentTeam(prev => {
        const newTeam = [...prev];
        if (newTeam[index]) {
          newTeam[index] = { ...newTeam[index], ...updates };
        }
        return newTeam;
      });
    }
  };

  const clearEffects = () => {
    setPlayerTeam(prev => prev.map(p => ({
      ...p,
      isAttacking: false,
      showAttackEffect: false,
      showBuffEffect: false,
      showDamageEffect: false,
      damageNumber: null,
      buffNumber: null,
    })));
    setOpponentTeam(prev => prev.map(p => ({
      ...p,
      isAttacking: false,
      showAttackEffect: false,
      showBuffEffect: false,
      showDamageEffect: false,
      damageNumber: null,
      buffNumber: null,
    })));
  };

  const processEvent = (event: BattleEvent) => {
    clearEffects();

    const { team: sourceTeam, index: sourceIndex } = findPetById(event.source);
    const { pet: targetPet, team: targetTeam, index: targetIndex } = findPetById(event.target);

    switch (event.type) {
      case 'battleStart':
        // Battle begins - no action needed
        break;

      case 'attack':
        // Show attack animation on the attacker (lunging)
        if (sourceTeam && sourceIndex >= 0) {
          updatePet(sourceTeam, sourceIndex, {
            isAttacking: true,
          });
        }
        break;

      case 'damage':
        // Show attack effect on the TARGET being hit
        if (targetTeam && targetIndex >= 0 && targetPet) {
          const newHealth = Math.max(0, targetPet.displayHealth - event.value);
          updatePet(targetTeam, targetIndex, {
            displayHealth: newHealth,
            showAttackEffect: true,
            damageNumber: -event.value,
          });
          // Hide attack effect after sprite animation completes (0.3s)
          setTimeout(() => {
            updatePet(targetTeam, targetIndex, { showAttackEffect: false });
          }, 350);
        }
        break;

      case 'heal':
        if (targetTeam && targetIndex >= 0 && targetPet) {
          const newHealth = Math.min(targetPet.maxHealth, targetPet.displayHealth + event.value);
          updatePet(targetTeam, targetIndex, {
            displayHealth: newHealth,
            showBuffEffect: true,
            buffNumber: `+${event.value} HP`,
          });
        }
        break;

      case 'buff':
        if (targetTeam && targetPet && event.target) {
          const desc = event.description || '';
          const isArmor = desc.includes('armor');
          const isBothStats = desc.includes('/+') || desc.includes('+1/+1') || desc.includes('+2/+2') || desc.includes('+3/+3');
          const isAttackOnly = desc.includes('ATK') && !isBothStats;
          const isHealthOnly = desc.includes('HP') && !isBothStats;

          const updates: Partial<BattlePet> = {
            showBuffEffect: true,
            buffNumber: `+${event.value}`,
          };

          if (isArmor) {
            updates.displayArmor = (targetPet.displayArmor || 0) + event.value;
            updates.buffNumber = `+${event.value} DEF`;
          } else if (isBothStats) {
            // Format like "+1/+1" - buff both attack AND health
            updates.displayAttack = targetPet.displayAttack + event.value;
            updates.displayHealth = targetPet.displayHealth + event.value;
            updates.maxHealth = targetPet.maxHealth + event.value;
            updates.buffNumber = `+${event.value}/+${event.value}`;
          } else if (isAttackOnly) {
            updates.displayAttack = targetPet.displayAttack + event.value;
            updates.buffNumber = `+${event.value} ATK`;
          } else if (isHealthOnly) {
            updates.displayHealth = targetPet.displayHealth + event.value;
            updates.maxHealth = targetPet.maxHealth + event.value;
            updates.buffNumber = `+${event.value} HP`;
          }

          // Use ID-based update to avoid race conditions with summon index shifts
          const petId = event.target;
          updatePetById(targetTeam, petId, updates);
          // Hide buff effect after sprite animation completes (0.6s)
          setTimeout(() => {
            updatePetById(targetTeam, petId, { showBuffEffect: false });
          }, 650);
        }
        break;

      case 'faint':
        if (sourceTeam && sourceIndex >= 0 && event.source) {
          // Track where this pet fainted for summon positioning
          setFaintedPositions(prev => new Map(prev).set(event.source!, { team: sourceTeam, index: sourceIndex }));

          updatePet(sourceTeam, sourceIndex, { isFainted: true, displayHealth: 0 });
          // Remove fainted pet from visual team after a short delay
          setTimeout(() => {
            if (sourceTeam === 'player') {
              setPlayerTeam(prev => prev.filter((_, i) => i !== sourceIndex));
            } else {
              setOpponentTeam(prev => prev.filter((_, i) => i !== sourceIndex));
            }
          }, 300);
        }
        break;

      case 'summon':
        // Add the summoned pet to the team at the position where the summoner fainted
        if (event.target && event.source) {
          // Get the fainted position of the summoner
          const faintedPos = faintedPositions.get(event.source);
          const isPlayerSummon = originalPlayerPetIds.has(event.source);

          // Parse stats from event description (e.g., "Bee summons 2/2 Honeybee")
          const isHoneybee = event.description?.includes('Honeybee');
          const statsMatch = event.description?.match(/(\d+)\/(\d+)/);
          const summonAttack = statsMatch ? parseInt(statsMatch[1], 10) : (isHoneybee ? 1 : 2);
          const summonHealth = statsMatch ? parseInt(statsMatch[2], 10) : (isHoneybee ? 1 : 4);

          const summonedPet: BattlePet = {
            id: event.target,
            templateId: isHoneybee ? 'honeybee' : 'hydra-head',
            name: isHoneybee ? 'Honeybee' : 'Hydra Head',
            tier: 0,
            level: 1,
            experience: 0,
            baseAttack: summonAttack,
            baseHealth: summonHealth,
            currentAttack: summonAttack,
            currentHealth: summonHealth,
            maxHealth: summonHealth,
            displayAttack: summonAttack,
            displayHealth: summonHealth,
            displayArmor: 0,
            ability: { trigger: 'passive', effect: 'gainAttack', baseValue: 0, target: 'none', description: 'No ability' },
            battlesParticipated: 0,
            foodSlot: null,
            position: 0,
            emoji: isHoneybee ? '🐝' : '🐲',
            isAttacking: false,
            showAttackEffect: false,
            showBuffEffect: true,
            showDamageEffect: false,
            isFainted: false,
            damageNumber: null,
            buffNumber: 'Summoned!',
          };

          // Add summoned pet's ID to the original set so future summons from it work
          if (isPlayerSummon) {
            setOriginalPlayerPetIds(prev => new Set([...prev, event.target!]));
            setPlayerTeam(prev => {
              const newTeam = [...prev];
              // Insert at the fainted pet's position, or at the start if not found
              const insertIndex = faintedPos ? Math.min(faintedPos.index, newTeam.length) : 0;
              newTeam.splice(insertIndex, 0, summonedPet);
              return newTeam;
            });
          } else {
            setOpponentTeam(prev => {
              const newTeam = [...prev];
              const insertIndex = faintedPos ? Math.min(faintedPos.index, newTeam.length) : 0;
              newTeam.splice(insertIndex, 0, summonedPet);
              return newTeam;
            });
          }
        }
        break;

      case 'ability':
        if (sourceTeam && sourceIndex >= 0) {
          updatePet(sourceTeam, sourceIndex, { showBuffEffect: true });
        }
        break;

      case 'battleEnd':
        setIsComplete(true);
        break;
    }
  };

  const handleSkip = () => {
    setIsComplete(true);
  };

  const handleContinue = () => {
    nextTurn(); // Go directly to shop, skip the result screen
  };

  const handleSpeedChange = () => {
    setBattleSpeed(prev => prev >= 3 ? 1 : prev + 1);
  };

  if (!lastBattleResult || !currentOpponent) {
    return null;
  }

  const { winner } = lastBattleResult;

  const renderPet = (pet: BattlePet, isPlayerTeam: boolean) => {
    if (pet.isFainted) {
      return (
        <div className="battle-pet battle-pet--fainted">
          <div className="battle-pet__emoji">{pet.emoji || '?'}</div>
          <div className="battle-pet__fainted-text">Fainted</div>
        </div>
      );
    }

    return (
      <div className={`battle-pet ${pet.isAttacking ? (isPlayerTeam ? 'battle-pet--attacking-right' : 'battle-pet--attacking-left') : ''}`}>
        <div className="battle-pet__emoji">{pet.emoji || '?'}</div>

        {/* Stats display */}
        <div className="battle-pet__stats">
          <span className="battle-pet__stat battle-pet__stat--attack">
            {pet.displayAttack}
          </span>
          <span className="battle-pet__stat-divider">/</span>
          <span className="battle-pet__stat battle-pet__stat--health">
            {pet.displayHealth}
          </span>
          {pet.displayArmor > 0 && (
            <span className="battle-pet__stat battle-pet__stat--armor">
              +{pet.displayArmor}
            </span>
          )}
        </div>

        {/* Name */}
        <div className="battle-pet__name">{pet.name}</div>

        {/* Attack effect - sprite animation plays exactly once */}
        {pet.showAttackEffect && (
          <div
            key={`atk-${Date.now()}`}
            className="battle-pet__effect battle-pet__effect--attack"
          />
        )}

        {/* Buff effect - sprite animation plays exactly once */}
        {pet.showBuffEffect && (
          <div
            key={`buff-${Date.now()}`}
            className="battle-pet__effect battle-pet__effect--buff"
          />
        )}

        {/* Damage number */}
        {pet.damageNumber !== null && (
          <div className="battle-pet__number battle-pet__number--damage">
            {pet.damageNumber}
          </div>
        )}

        {/* Buff number */}
        {pet.buffNumber && (
          <div className="battle-pet__number battle-pet__number--buff">
            {pet.buffNumber}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="battle-view">
      <div className="battle-view__controls">
        <button className="pixel-btn" onClick={handleSpeedChange}>
          {battleSpeed}x
        </button>
        {!isComplete && (
          <button className="pixel-btn" onClick={handleSkip}>
            Skip
          </button>
        )}
      </div>

      <div className="battle-view__arena">
        <div className="battle-view__team battle-view__team--player">
          <h3>Your Team</h3>
          <div className="battle-view__pets">
            <span className="battle-view__position">Back</span>
            {playerTeam.map((pet, index) => (
              <div key={pet.id || index} className="battle-view__pet-slot">
                {renderPet(pet, true)}
              </div>
            ))}
            <span className="battle-view__position battle-view__position--front">Front</span>
          </div>
        </div>

        <div className="battle-view__vs">VS</div>

        <div className="battle-view__team battle-view__team--opponent">
          <h3>{currentOpponent.username}</h3>
          <div className="battle-view__pets">
            <span className="battle-view__position battle-view__position--front">Front</span>
            {opponentTeam.map((pet, index) => (
              <div key={pet.id || index} className="battle-view__pet-slot">
                {renderPet(pet, false)}
              </div>
            ))}
            <span className="battle-view__position">Back</span>
          </div>
        </div>
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
          <button className="pixel-btn pixel-btn--wide" onClick={handleContinue}>
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
