import React from 'react';
import { Pet, PetTemplate } from '../types';
import './PetCard.css';

interface PetCardProps {
  pet: Pet | PetTemplate | null;
  onClick?: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  selected?: boolean;
  empty?: boolean;
  highlighted?: boolean;
  showStats?: boolean;
  frozen?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function PetCard({
  pet,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  selected = false,
  empty = false,
  highlighted = false,
  showStats = true,
  frozen = false,
  size = 'medium',
}: PetCardProps) {
  if (!pet && empty) {
    return (
      <div
        className={`pet-card pet-card--empty pet-card--${size} ${highlighted ? 'pet-card--highlighted' : ''}`}
        onClick={onClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <span className="pet-card__empty-text">+</span>
      </div>
    );
  }

  if (!pet) {
    return null;
  }

  const isPetInstance = 'currentAttack' in pet;
  const attack = isPetInstance ? (pet as Pet).currentAttack : pet.baseAttack;
  const health = isPetInstance ? (pet as Pet).currentHealth : pet.baseHealth;
  const level = isPetInstance ? (pet as Pet).level : 1;

  return (
    <div
      className={`pet-card pet-card--${size} pet-card--tier-${pet.tier} ${selected ? 'pet-card--selected' : ''} ${frozen ? 'pet-card--frozen' : ''}`}
      onClick={onClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {frozen && <div className="pet-card__frozen-badge">Frozen</div>}
      {level > 1 && <div className="pet-card__level">Lv.{level}</div>}
      <div className="pet-card__emoji">{pet.emoji || '?'}</div>
      <div className="pet-card__name">{pet.name}</div>
      {showStats && (
        <div className="pet-card__stats">
          <span className="pet-card__attack">{attack}</span>
          <span className="pet-card__divider">/</span>
          <span className="pet-card__health">{health}</span>
        </div>
      )}
      <div className="pet-card__ability-hint" title={pet.ability.description}>
        {pet.ability.trigger === 'passive' ? 'Passive' : pet.ability.trigger}
      </div>
    </div>
  );
}
