export interface Pet {
  id: string;
  templateId: string;
  name: string;
  tier: number;
  level: number;
  experience: number;
  baseAttack: number;
  baseHealth: number;
  currentAttack: number;
  currentHealth: number;
  ability: {
    trigger: string;
    effect: string;
    description: string;
  };
}

export interface Food {
  id: string;
  name: string;
  effect: string;
  value: number;
  description: string;
}

export interface ShopSlot {
  type: 'pet' | 'food';
  item: Pet | Food | null;
  frozen: boolean;
}

export interface Shop {
  slots: ShopSlot[];
  rollCost: number;
}

export interface Player {
  id: string;
  username: string;
  team: (Pet | null)[];
  gold: number;
  lives: number;
  wins: number;
  turn: number;
}

export interface BattleEvent {
  type: string;
  attacker?: string;
  defender?: string;
  damage?: number;
  description: string;
}

export interface BattleResult {
  winner: 'player' | 'opponent' | 'draw';
  playerTeamSurvivors: number;
  opponentTeamSurvivors: number;
  events: BattleEvent[];
  livesLost: number;
}

export interface GameState {
  player: Player;
  shop: Shop;
  phase: 'shop' | 'battle' | 'gameOver';
  battleResult?: BattleResult;
  gameOver?: boolean;
  gameWon?: boolean;
}
