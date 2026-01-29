import React, { useState } from 'react';
import { Pet, PetTemplate } from '../types';
import './PetCard.css';

interface PetCardProps {
  pet: Pet | PetTemplate | null;
  onClick?: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  selected?: boolean;
  dragging?: boolean;
  empty?: boolean;
  showStats?: boolean;
  frozen?: boolean;
  size?: 'small' | 'medium' | 'large';
  showAbilityOnHover?: boolean;
}

export function PetCard({
  pet,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  selected = false,
  dragging = false,
  empty = false,
  showStats = true,
  frozen = false,
  size = 'medium',
  showAbilityOnHover = false,
}: PetCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  if (!pet && empty) {
    return (
      <div
        className={`pet-card pet-card--empty pet-card--${size}`}
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

  const classNames = [
    'pet-card',
    `pet-card--${size}`,
    `pet-card--tier-${pet.tier}`,
    selected && 'pet-card--selected',
    frozen && 'pet-card--frozen',
    dragging && 'pet-card--dragging',
  ].filter(Boolean).join(' ');

  const handleMouseEnter = () => {
    if (showAbilityOnHover) setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    if (showAbilityOnHover) setShowTooltip(false);
  };

  const handleTouchStart = () => {
    if (showAbilityOnHover) setShowTooltip(true);
  };

  const handleTouchEnd = () => {
    if (showAbilityOnHover) {
      // Keep tooltip visible briefly on touch
      setTimeout(() => setShowTooltip(false), 2000);
    }
  };

  return (
    <div
      className={classNames}
      onClick={onClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
      {showAbilityOnHover && showTooltip && (
        <div className="pet-card__tooltip">
          <div className="pet-card__tooltip-trigger">
            {pet.ability.trigger === 'passive' ? 'Passive' : pet.ability.trigger}
          </div>
          <div className="pet-card__tooltip-desc">{pet.ability.description}</div>
        </div>
      )}
    </div>
  );
}
