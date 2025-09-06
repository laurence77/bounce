/**
 * Cutting-Edge Performance Monitoring System
 * Real-time metrics tracking with adaptive optimization
 */
export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private fps = 60;
  private frameTime = 16.67;
  private renderCalls = 0;
  private memoryUsage = 0;
  private metrics: {[key: string]: number} = {};
  
  // Performance thresholds
  private readonly LOW_FPS_THRESHOLD = 45;
  private readonly HIGH_FRAME_TIME_THRESHOLD = 20;
  
  // Adaptive quality settings
  public qualityLevel: 'low' | 'medium' | 'high' = 'high';
  
  private listeners: Array<(metrics: any) => void> = [];
  
  update(): void {
    const now = performance.now();
    
    if (this.lastTime > 0) {
      this.frameTime = now - this.lastTime;
      this.frameCount++;
      
      // Calculate FPS every 60 frames
      if (this.frameCount % 60 === 0) {
        this.fps = 1000 / this.frameTime;
        this.updateQualityLevel();
        this.notifyListeners();
      }
    }
    
    this.lastTime = now;
    this.updateMemoryUsage();
  }
  
  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
    }
  }
  
  private updateQualityLevel(): void {
    if (this.fps < this.LOW_FPS_THRESHOLD) {
      this.qualityLevel = 'low';
    } else if (this.fps < 55) {
      this.qualityLevel = 'medium';
    } else {
      this.qualityLevel = 'high';
    }
  }
  
  addListener(callback: (metrics: any) => void): void {
    this.listeners.push(callback);
  }
  
  private notifyListeners(): void {
    const metrics = this.getMetrics();
    this.listeners.forEach(listener => listener(metrics));
  }
  
  trackRenderCall(): void {
    this.renderCalls++;
  }
  
  setCustomMetric(key: string, value: number): void {
    this.metrics[key] = value;
  }
  
  getMetrics() {
    return {
      fps: Math.round(this.fps),
      frameTime: Math.round(this.frameTime * 100) / 100,
      memoryUsage: Math.round(this.memoryUsage * 100) / 100,
      renderCalls: this.renderCalls,
      qualityLevel: this.qualityLevel,
      custom: { ...this.metrics }
    };
  }
  
  resetFrame(): void {
    this.renderCalls = 0;
  }
  
  // Performance recommendations
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    
    if (this.fps < this.LOW_FPS_THRESHOLD) {
      suggestions.push('Consider reducing particle count');
      suggestions.push('Disable advanced visual effects');
    }
    
    if (this.renderCalls > 100) {
      suggestions.push('Too many render calls - use object pooling');
    }
    
    if (this.memoryUsage > 100) {
      suggestions.push('High memory usage - check for memory leaks');
    }
    
    return suggestions;
  }
}