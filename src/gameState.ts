import { GameState } from './types';

export class GameStateManager {
  private state: GameState = {
    score: 0,
    lives: 3,
    level: 1,
    ringsCollected: 0,
    totalRings: 0,
  };

  getState(): GameState {
    return { ...this.state };
  }

  addScore(points: number): void {
    this.state.score += points;
  }

  collectRing(): void {
    this.state.ringsCollected++;
    this.addScore(100);
  }

  loseLife(): boolean {
    this.state.lives--;
    return this.state.lives > 0;
  }

  addLife(): void {
    if (this.state.lives < 5) {
      this.state.lives++;
    }
  }

  nextLevel(): void {
    this.state.level++;
    this.state.ringsCollected = 0;
    this.addScore(500); // Level completion bonus
  }

  setTotalRings(count: number): void {
    this.state.totalRings = count;
  }

  allRingsCollected(): boolean {
    return this.state.ringsCollected >= this.state.totalRings;
  }

  reset(): void {
    this.state = {
      score: 0,
      lives: 3,
      level: 1,
      ringsCollected: 0,
      totalRings: 0,
    };
  }

  resetLevel(): void {
    this.state.ringsCollected = 0;
  }
}