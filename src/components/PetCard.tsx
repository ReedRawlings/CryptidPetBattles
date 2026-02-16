import React, { useState } from 'react';
import { Creature, CreatureTemplate, Tribe, Role, BuffType, BUFF_DEFINITIONS } from '../types';
import './PetCard.css';

const BUFF_ICONS: Partial<Record<BuffType, string>> = {
  strengthen: '/assets/icons/Strengthen.png',
  weaken: '/assets/icons/Weaken.png',
  haste: '/assets/icons/Haste.png',
  slow: '/assets/icons/Slow.png',
  burn: '/assets/icons/Burn.png',
  poison: '/assets/icons/Poison.png',
  gigantify: '/assets/icons/Gigantify.png',
};

const BUFF_FALLBACK: Record<BuffType, string> = {
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

// Tribe colors for placeholder avatars
const TRIBE_COLORS: Record<Tribe, string> = {
  Spirit: '#8B5CF6',
  Flora: '#22C55E',
  Fauna: '#F59E0B',
  Kami: '#3B82F6',
  Dessert: '#EC4899',
};

const TRIBE_ICONS: Record<Tribe, string> = {
  Spirit: '/assets/icons/Spirits.png',
  Flora: '/assets/icons/FloraIcon.png',
  Fauna: '/assets/icons/Fauna.png',
  Kami: '/assets/icons/Kami.png',
  Dessert: '/assets/icons/dessert.png',
};

const ROLE_COLORS: Record<Role, string> = {
  tank: '#4A90D9',
  brawler: '#E74C3C',
  support: '#2ECC71',
  mage: '#9B59B6',
  assassin: '#E67E22',
};

const ROLE_LABELS: Record<Role, string> = {
  tank: 'TNK',
  brawler: 'BRW',
  support: 'SUP',
  mage: 'MGE',
  assassin: 'ASN',
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
  const creatureTier = isInstance ? (pet as Creature).tier : 1;
  const tribe = isInstance ? (pet as Creature).type : (pet as CreatureTemplate).type;
  const shopTier = isInstance ? (pet as Creature).shopTier : (pet as CreatureTemplate).shopTier;
  const role = isInstance ? (pet as Creature).role : (pet as CreatureTemplate).role;

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
      {creatureTier > 1 && (
        <div className="pet-card__star">T{creatureTier}</div>
      )}
      <div className="pet-card__tribe-icon">
        <img src={TRIBE_ICONS[tribe]} alt={tribe} className="pet-card__tribe-img" />
      </div>
      <div
        className="pet-card__role-badge"
        style={{ backgroundColor: ROLE_COLORS[role] }}
        title={role}
      >
        {ROLE_LABELS[role]}
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
      {isInstance && (pet as Creature).buffs.length > 0 && (
        <div className="pet-card__buffs">
          {(pet as Creature).buffs.map((buff) => {
            const iconSrc = BUFF_ICONS[buff.type];
            const isDebuff = BUFF_DEFINITIONS[buff.type].category !== 'buff';
            return (
              <div
                key={buff.type}
                className={`pet-card__buff-icon ${isDebuff ? 'pet-card__buff-icon--debuff' : ''}`}
                title={`${BUFF_DEFINITIONS[buff.type].name} x${buff.stacks}`}
              >
                {iconSrc ? (
                  <img src={iconSrc} alt={BUFF_DEFINITIONS[buff.type].name} className="pet-card__buff-img" />
                ) : (
                  <span className="pet-card__buff-text">{BUFF_FALLBACK[buff.type]}</span>
                )}
                {buff.stacks > 1 && <span className="pet-card__buff-stacks">{buff.stacks}</span>}
              </div>
            );
          })}
        </div>
      )}
      {showAbilityOnHover && showTooltip && (
        <div className="pet-card__tooltip">
          <div className="pet-card__tooltip-role" style={{ color: ROLE_COLORS[role] }}>
            {role}
          </div>
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
