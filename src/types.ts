export interface GameState {
  score: number;
  lives: number;
  level: number;
  ringsCollected: number;
  totalRings: number;
}

export interface Ring {
  x: number;
  y: number;
  collected: boolean;
}

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX?: number;
  velocityY?: number;
  type: 'static' | 'moving';
}

export interface PowerUp {
  x: number;
  y: number;
  type: 'speed' | 'antigravity' | 'extralife';
  collected: boolean;
}

export interface LevelData {
  id: number;
  rings: Ring[];
  enemies: Enemy[];
  powerUps: PowerUp[];
  platforms: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'normal' | 'speed' | 'bounce';
  }>;
  exit: {
    x: number;
    y: number;
    open: boolean;
  };
}