import type { Pet } from '../types/game';
import './PetCard.css';

interface PetCardProps {
  pet: Pet;
  onSell?: () => void;
  showSell?: boolean;
  compact?: boolean;
}

const tierColors: Record<number, string> = {
  1: '#aaa',
  2: '#4ecdc4',
  3: '#45b7d1',
  4: '#a66cff',
  5: '#ffd700',
  6: '#ff6b6b',
};

export function PetCard({ pet, onSell, showSell = true, compact = false }: PetCardProps) {
  const tierColor = tierColors[pet.tier] || '#aaa';

  return (
    <div className={`pet-card ${compact ? 'compact' : ''}`} style={{ borderColor: tierColor }}>
      <div className="pet-header">
        <span className="pet-name">{pet.name}</span>
        <span className="pet-level" style={{ background: tierColor }}>
          Lv.{pet.level}
        </span>
      </div>

      <div className="pet-stats">
        <span className="stat attack">{pet.currentAttack} ATK</span>
        <span className="stat health">{pet.currentHealth} HP</span>
      </div>

      {!compact && (
        <div className="pet-ability">
          <span className="ability-trigger">{pet.ability.trigger}</span>
          <span className="ability-desc">{pet.ability.description}</span>
        </div>
      )}

      <div className="pet-footer">
        <span className="tier-badge" style={{ color: tierColor }}>
          Tier {pet.tier}
        </span>
        {showSell && onSell && (
          <button className="sell-button" onClick={(e) => { e.stopPropagation(); onSell(); }}>
            Sell (+1g)
          </button>
        )}
      </div>
    </div>
  );
}
