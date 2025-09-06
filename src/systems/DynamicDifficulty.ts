/**
 * Dynamic Difficulty Adjustment System
 * Based on 2024 research for optimal player engagement
 */
export interface PlayerMetrics {
  successRate: number;
  averageAttempts: number;
  reactionTime: number;
  frustrationLevel: number;
  engagementScore: number;
  skillLevel: number;
}

export interface DifficultySettings {
  enemySpeed: number;
  enemyCount: number;
  platformSpacing: number;
  ringRequirement: number;
  gravityStrength: number;
  powerUpFrequency: number;
}

export class DynamicDifficultyAdjuster {
  private playerMetrics: PlayerMetrics;
  private baseSettings: DifficultySettings;
  private currentSettings: DifficultySettings;
  private adjustmentHistory: number[] = [];
  private lastAdjustmentTime = 0;
  
  // Flow state optimization parameters
  private readonly OPTIMAL_SUCCESS_RATE = 0.7;
  private readonly ADJUSTMENT_COOLDOWN = 10000; // 10 seconds
  private readonly MAX_ADJUSTMENT_RATE = 0.15; // 15% per adjustment
  
  // Player state tracking
  private deathCount = 0;
  private levelStartTime = 0;
  private lastActionTime = 0;
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  
  constructor(baseSettings: DifficultySettings) {
    this.baseSettings = { ...baseSettings };
    this.currentSettings = { ...baseSettings };
    this.playerMetrics = {
      successRate: 0.7,
      averageAttempts: 3,
      reactionTime: 300,
      frustrationLevel: 0.3,
      engagementScore: 0.7,
      skillLevel: 0.5
    };
  }
  
  /**
   * Update player metrics based on gameplay events
   */
  updateMetrics(event: string, data?: any): void {
    const now = Date.now();
    
    switch (event) {
      case 'level_start':
        this.levelStartTime = now;
        this.deathCount = 0;
        break;
        
      case 'player_death':
        this.deathCount++;
        this.consecutiveFailures++;
        this.consecutiveSuccesses = 0;
        this.updateFrustrationLevel(0.1);
        break;
        
      case 'level_complete':
        const levelTime = now - this.levelStartTime;
        const attempts = this.deathCount + 1;
        this.updateSuccessRate(attempts);
        this.consecutiveSuccesses++;
        this.consecutiveFailures = 0;
        this.updateEngagementScore(levelTime, attempts);
        break;
        
      case 'ring_collected':
        this.lastActionTime = now;
        // Positive feedback for engagement
        this.updateFrustrationLevel(-0.02);
        break;
        
      case 'power_up_collected':
        this.updateEngagementScore(0, 0, 0.05); // Small boost
        break;
        
      case 'player_input':
        // Track reaction time
        if (data?.expectedTime) {
          const reactionTime = now - data.expectedTime;
          this.playerMetrics.reactionTime = this.lerp(this.playerMetrics.reactionTime, reactionTime, 0.1);
        }
        break;
    }
    
    this.updateSkillLevel();
    this.considerAdjustment();
  }
  
  private updateSuccessRate(attempts: number): void {
    const successRate = 1 / attempts;
    this.playerMetrics.successRate = this.lerp(this.playerMetrics.successRate, successRate, 0.2);
  }
  
  private updateFrustrationLevel(delta: number): void {
    this.playerMetrics.frustrationLevel = Math.max(0, Math.min(1, this.playerMetrics.frustrationLevel + delta));
  }
  
  private updateEngagementScore(levelTime: number, attempts: number, bonus: number = 0): void {
    // Quick completion with few attempts = high engagement
    const timeScore = Math.max(0, 1 - (levelTime / 60000)); // Normalize to 1 minute
    const attemptScore = Math.max(0, 1 - (attempts / 5)); // Normalize to 5 attempts
    const newEngagement = (timeScore + attemptScore) / 2 + bonus;
    
    this.playerMetrics.engagementScore = this.lerp(this.playerMetrics.engagementScore, newEngagement, 0.3);
  }
  
  private updateSkillLevel(): void {
    // Skill level based on success rate, reaction time, and consecutive performance
    const successComponent = this.playerMetrics.successRate;
    const reactionComponent = Math.max(0, 1 - (this.playerMetrics.reactionTime / 1000));
    const consistencyComponent = Math.min(this.consecutiveSuccesses / 5, 1);
    
    const newSkill = (successComponent + reactionComponent + consistencyComponent) / 3;
    this.playerMetrics.skillLevel = this.lerp(this.playerMetrics.skillLevel, newSkill, 0.1);
  }
  
  /**
   * Consider making a difficulty adjustment
   */
  private considerAdjustment(): void {
    const now = Date.now();
    if (now - this.lastAdjustmentTime < this.ADJUSTMENT_COOLDOWN) return;
    
    const shouldAdjust = this.shouldAdjustDifficulty();
    if (shouldAdjust.adjust) {
      this.adjustDifficulty(shouldAdjust.direction, shouldAdjust.intensity);
      this.lastAdjustmentTime = now;
    }
  }
  
  /**
   * Determine if difficulty should be adjusted
   */
  private shouldAdjustDifficulty(): { adjust: boolean; direction: 'increase' | 'decrease'; intensity: number } {
    const { successRate, frustrationLevel, engagementScore, skillLevel } = this.playerMetrics;
    
    // High frustration or very low success rate = decrease difficulty
    if (frustrationLevel > 0.7 || successRate < 0.4 || this.consecutiveFailures > 3) {
      return { adjust: true, direction: 'decrease', intensity: Math.min(frustrationLevel, 0.2) };
    }
    
    // Low engagement or very high success rate = increase difficulty
    if (engagementScore < 0.4 || successRate > 0.9 || this.consecutiveSuccesses > 5) {
      const intensity = successRate > 0.9 ? 0.15 : 0.1;
      return { adjust: true, direction: 'increase', intensity };
    }
    
    // Skill-based adjustment for flow state
    const skillDifference = skillLevel - 0.5; // 0.5 is baseline
    if (Math.abs(skillDifference) > 0.2) {
      const direction = skillDifference > 0 ? 'increase' : 'decrease';
      return { adjust: true, direction, intensity: Math.abs(skillDifference) * 0.1 };
    }
    
    return { adjust: false, direction: 'increase', intensity: 0 };
  }
  
  /**
   * Apply difficulty adjustment
   */
  private adjustDifficulty(direction: 'increase' | 'decrease', intensity: number): void {
    const multiplier = direction === 'increase' ? 1 + intensity : 1 - intensity;
    
    // Adjust various game parameters
    this.currentSettings.enemySpeed *= multiplier;
    this.currentSettings.gravityStrength *= multiplier;
    
    if (direction === 'increase') {
      this.currentSettings.enemyCount = Math.min(10, Math.ceil(this.currentSettings.enemyCount * multiplier));
      this.currentSettings.platformSpacing *= 1.1;
      this.currentSettings.powerUpFrequency *= 0.9; // Fewer power-ups when harder
    } else {
      this.currentSettings.enemyCount = Math.max(1, Math.floor(this.currentSettings.enemyCount * multiplier));
      this.currentSettings.platformSpacing *= 0.9;
      this.currentSettings.powerUpFrequency *= 1.1; // More power-ups when easier
    }
    
    // Keep settings within reasonable bounds
    this.clampSettings();
    
    // Track adjustment history
    this.adjustmentHistory.push(direction === 'increase' ? intensity : -intensity);
    if (this.adjustmentHistory.length > 10) {
      this.adjustmentHistory.shift();
    }
    
    console.log(`DDA: ${direction} difficulty by ${(intensity * 100).toFixed(1)}%`, this.getDebugInfo());
  }
  
  private clampSettings(): void {
    this.currentSettings.enemySpeed = Math.max(50, Math.min(300, this.currentSettings.enemySpeed));
    this.currentSettings.enemyCount = Math.max(1, Math.min(10, this.currentSettings.enemyCount));
    this.currentSettings.platformSpacing = Math.max(50, Math.min(200, this.currentSettings.platformSpacing));
    this.currentSettings.gravityStrength = Math.max(300, Math.min(800, this.currentSettings.gravityStrength));
    this.currentSettings.powerUpFrequency = Math.max(0.1, Math.min(1, this.currentSettings.powerUpFrequency));
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  
  /**
   * Get current difficulty settings
   */
  getCurrentSettings(): DifficultySettings {
    return { ...this.currentSettings };
  }
  
  /**
   * Get player metrics for debugging
   */
  getPlayerMetrics(): PlayerMetrics {
    return { ...this.playerMetrics };
  }
  
  /**
   * Reset to base settings
   */
  reset(): void {
    this.currentSettings = { ...this.baseSettings };
    this.adjustmentHistory = [];
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.deathCount = 0;
  }
  
  /**
   * Get debug information
   */
  getDebugInfo(): any {
    return {
      metrics: this.playerMetrics,
      settings: this.currentSettings,
      consecutive: {
        failures: this.consecutiveFailures,
        successes: this.consecutiveSuccesses
      },
      adjustments: this.adjustmentHistory.length
    };
  }
}