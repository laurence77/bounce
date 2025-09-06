import { LevelData } from './types';

export const levels: LevelData[] = [
  // Level 1 - Tutorial level
  {
    id: 1,
    rings: [
      { x: 300, y: 400, collected: false },
      { x: 500, y: 350, collected: false },
      { x: 700, y: 300, collected: false },
    ],
    enemies: [
      { x: 560, y: 480, width: 32, height: 32, type: 'static' },
    ],
    powerUps: [],
    platforms: [
      { x: 0, y: 500, width: 960, height: 40, type: 'normal' },
      { x: 250, y: 420, width: 100, height: 20, type: 'normal' },
      { x: 450, y: 370, width: 100, height: 20, type: 'normal' },
      { x: 650, y: 320, width: 100, height: 20, type: 'normal' },
    ],
    exit: { x: 850, y: 450, open: false },
  },
  // Level 2 - Introduces moving enemies
  {
    id: 2,
    rings: [
      { x: 150, y: 400, collected: false },
      { x: 400, y: 250, collected: false },
      { x: 650, y: 400, collected: false },
      { x: 800, y: 300, collected: false },
    ],
    enemies: [
      { x: 300, y: 480, width: 24, height: 24, type: 'static' },
      { 
        x: 200, 
        y: 300, 
        width: 24, 
        height: 24, 
        type: 'moving',
        velocityX: 50,
        velocityY: 0 
      },
    ],
    powerUps: [
      { x: 500, y: 200, type: 'speed', collected: false },
    ],
    platforms: [
      { x: 0, y: 500, width: 960, height: 40, type: 'normal' },
      { x: 100, y: 420, width: 100, height: 20, type: 'normal' },
      { x: 350, y: 270, width: 100, height: 20, type: 'speed' },
      { x: 600, y: 420, width: 100, height: 20, type: 'normal' },
      { x: 750, y: 320, width: 100, height: 20, type: 'bounce' },
    ],
    exit: { x: 50, y: 200, open: false },
  },
  // Level 3 - More complex with extra life
  {
    id: 3,
    rings: [
      { x: 100, y: 350, collected: false },
      { x: 250, y: 200, collected: false },
      { x: 450, y: 150, collected: false },
      { x: 650, y: 350, collected: false },
      { x: 800, y: 250, collected: false },
    ],
    enemies: [
      { x: 180, y: 480, width: 24, height: 24, type: 'static' },
      { x: 380, y: 480, width: 24, height: 24, type: 'static' },
      { 
        x: 300, 
        y: 100, 
        width: 24, 
        height: 24, 
        type: 'moving',
        velocityX: 0,
        velocityY: 30 
      },
    ],
    powerUps: [
      { x: 500, y: 100, type: 'antigravity', collected: false },
      { x: 200, y: 150, type: 'extralife', collected: false },
    ],
    platforms: [
      { x: 0, y: 500, width: 960, height: 40, type: 'normal' },
      { x: 50, y: 370, width: 100, height: 20, type: 'normal' },
      { x: 200, y: 220, width: 100, height: 20, type: 'speed' },
      { x: 400, y: 170, width: 100, height: 20, type: 'bounce' },
      { x: 600, y: 370, width: 100, height: 20, type: 'normal' },
      { x: 750, y: 270, width: 100, height: 20, type: 'speed' },
      { x: 150, y: 50, width: 200, height: 20, type: 'normal' },
    ],
    exit: { x: 850, y: 400, open: false },
  },
];