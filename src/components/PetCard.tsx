import React, { useState } from 'react';
import { Creature, CreatureTemplate, Tribe } from '../types';
import './PetCard.css';

// Tribe colors for placeholder avatars
const TRIBE_COLORS: Record<Tribe, string> = {
  Spirit: '#8B5CF6',
  Flora: '#22C55E',
  Fauna: '#F59E0B',
  Kami: '#3B82F6',
  Dessert: '#EC4899',
};

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

interface PetCardProps {
  pet: Creature | CreatureTemplate | null;
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

  const isInstance = 'currentAttack' in pet;
  const attack = isInstance ? (pet as Creature).currentAttack : (pet as CreatureTemplate).tiers['1'].baseStats.attack;
  const health = isInstance ? (pet as Creature).currentHealth : (pet as CreatureTemplate).tiers['1'].baseStats.health;
  const speed = isInstance ? (pet as Creature).currentSpeed : (pet as CreatureTemplate).tiers['1'].baseStats.speed;
  const star = isInstance ? (pet as Creature).star : 1;
  const tribe = isInstance ? (pet as Creature).type : (pet as CreatureTemplate).type;
  const shopTier = isInstance ? (pet as Creature).shopTier : (pet as CreatureTemplate).shopTier;

  // Get ability for tooltip
  const ability = isInstance
    ? (pet as Creature).ability
    : (pet as CreatureTemplate).tiers['1'].ability;

  const classNames = [
    'pet-card',
    `pet-card--${size}`,
    `pet-card--tier-${shopTier}`,
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
      setTimeout(() => setShowTooltip(false), 2000);
    }
  };

  const tribeColor = TRIBE_COLORS[tribe];

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
      {star > 1 && (
        <div className="pet-card__star">{'★'.repeat(star)}</div>
      )}
      <div className="pet-card__tribe-icon" style={{ backgroundColor: tribeColor }}>
        {tribe.slice(0, 2).toUpperCase()}
      </div>
      <div
        className="pet-card__avatar"
        style={{ backgroundColor: tribeColor }}
      >
        {getInitials(pet.name)}
      </div>
      {showStats && (
        <div className="pet-card__stats">
          <span className="pet-card__attack">{attack}</span>
          <span className="pet-card__divider">/</span>
          <span className="pet-card__health">{health}</span>
          <span className="pet-card__divider">|</span>
          <span className="pet-card__speed">{speed}</span>
        </div>
      )}
      {showAbilityOnHover && showTooltip && (
        <div className="pet-card__tooltip">
          <div className="pet-card__tooltip-trigger">
            {ability.trigger.replace(/_/g, ' ')}
          </div>
          <div className="pet-card__tooltip-name">{ability.name}</div>
          <div className="pet-card__tooltip-desc">{ability.description}</div>
        </div>
      )}
    </div>
  );
}
