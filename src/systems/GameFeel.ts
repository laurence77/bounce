/**
 * Advanced Game Feel System
 * Implements cutting-edge juice techniques for maximum player satisfaction
 */
export class GameFeelManager {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private originalCameraZoom: number;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.originalCameraZoom = this.camera.zoom;
  }
  
  /**
   * Screen shake with customizable intensity and duration
   */
  screenShake(intensity: number = 10, duration: number = 200, frequency: number = 0.1): void {
    if (this.camera.isShaking) return;
    
    this.camera.shake(duration, intensity * 0.01, false, (camera, progress) => {
      // Custom shake pattern for more organic feel
      const shake = Math.sin(progress * Math.PI * frequency) * intensity * (1 - progress);
      return shake;
    });
  }
  
  /**
   * Camera punch effect for impactful moments
   */
  cameraPunch(scale: number = 1.1, duration: number = 150): void {
    const originalZoom = this.camera.zoom;
    
    this.scene.tweens.add({
      targets: this.camera,
      zoom: originalZoom * scale,
      duration: duration * 0.3,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.camera.setZoom(originalZoom);
      }
    });
  }
  
  /**
   * Freeze frame effect for dramatic moments
   */
  freezeFrame(duration: number = 100): void {
    this.scene.physics.world.pause();
    this.scene.time.delayedCall(duration, () => {
      this.scene.physics.world.resume();
    });
  }
  
  /**
   * Chromatic aberration effect (simulated with color shifts)
   */
  chromaticAberration(intensity: number = 5, duration: number = 300): void {
    const camera = this.camera;
    const originalTint = camera.backgroundColor.color;
    
    this.scene.tweens.add({
      targets: { value: 0 },
      value: intensity,
      duration: duration * 0.5,
      yoyo: true,
      onUpdate: (tween) => {
        const progress = tween.getValue();
        // Simulate RGB channel shift
        const r = Math.sin(progress * 0.1) * intensity;
        const g = Math.sin(progress * 0.1 + 2) * intensity;
        const b = Math.sin(progress * 0.1 + 4) * intensity;
        
        // Apply subtle color shift to simulate chromatic aberration
        camera.setTint(Phaser.Display.Color.GetColor(255 + r, 255 + g, 255 + b));
      },
      onComplete: () => {
        camera.clearTint();
      }
    });
  }
  
  /**
   * Squash and stretch animation for objects
   */
  squashAndStretch(target: Phaser.GameObjects.GameObject, 
                  squashScale: number = 0.8, 
                  stretchScale: number = 1.2, 
                  duration: number = 200): void {
    if (!target || target.displayWidth === undefined) return;
    
    const originalScaleX = (target as any).scaleX || 1;
    const originalScaleY = (target as any).scaleY || 1;
    
    this.scene.tweens.add({
      targets: target,
      scaleX: originalScaleX * squashScale,
      scaleY: originalScaleY * stretchScale,
      duration: duration * 0.3,
      ease: 'Back.easeOut',
      yoyo: true,
      onComplete: () => {
        (target as any).setScale(originalScaleX, originalScaleY);
      }
    });
  }
  
  /**
   * Impact flash effect
   */
  impactFlash(target: Phaser.GameObjects.GameObject, 
             color: number = 0xFFFFFF, 
             intensity: number = 0.8, 
             duration: number = 100): void {
    if (!target) return;
    
    const originalTint = (target as any).tint || 0xFFFFFF;
    
    (target as any).setTint(color);
    (target as any).setAlpha(intensity);
    
    this.scene.tweens.add({
      targets: target,
      alpha: 1,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
        (target as any).setTint(originalTint);
      }
    });
  }
  
  /**
   * Slow motion effect
   */
  slowMotion(timeScale: number = 0.3, duration: number = 1000): void {
    this.scene.physics.world.timeScale = timeScale;
    this.scene.tweens.timeScale = timeScale;
    
    this.scene.time.delayedCall(duration, () => {
      this.scene.physics.world.timeScale = 1;
      this.scene.tweens.timeScale = 1;
    });
  }
  
  /**
   * Ripple effect from point
   */
  rippleEffect(x: number, y: number, maxRadius: number = 100, duration: number = 500): void {
    const circle = this.scene.add.circle(x, y, 5, 0xFFFFFF, 0.3);
    circle.setStrokeStyle(2, 0xFFFFFF, 0.8);
    
    this.scene.tweens.add({
      targets: circle,
      radius: maxRadius,
      alpha: 0,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
        circle.destroy();
      }
    });
  }
  
  /**
   * Particle burst effect
   */
  particleBurst(x: number, y: number, count: number = 10, colors: number[] = [0xFF6B6B, 0x4ECDC4, 0xFFE66D]): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = Phaser.Math.Between(50, 150);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      const particle = this.scene.add.circle(x, y, Phaser.Math.Between(2, 6), 
        colors[Math.floor(Math.random() * colors.length)]);
      
      this.scene.tweens.add({
        targets: particle,
        x: x + vx,
        y: y + vy,
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(300, 800),
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }
  
  /**
   * Anticipation animation before action
   */
  anticipation(target: Phaser.GameObjects.GameObject, 
              direction: { x: number, y: number }, 
              pullback: number = 0.2, 
              duration: number = 150): Promise<void> {
    return new Promise((resolve) => {
      const originalX = (target as any).x;
      const originalY = (target as any).y;
      
      this.scene.tweens.add({
        targets: target,
        x: originalX - direction.x * pullback,
        y: originalY - direction.y * pullback,
        duration: duration,
        ease: 'Power2',
        yoyo: true,
        onComplete: () => {
          resolve();
        }
      });
    });
  }
  
  /**
   * Chain multiple effects together
   */
  async comboEffect(effects: Array<() => Promise<void> | void>): Promise<void> {
    for (const effect of effects) {
      const result = effect();
      if (result instanceof Promise) {
        await result;
      }
    }
  }
}