/**
 * Advanced Object Pool System
 * Implements cutting-edge object pooling for maximum performance
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private active: Set<T> = new Set();
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;
  
  constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 10, maxSize: number = 100) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
    
    // Pre-allocate objects
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }
  
  get(): T {
    let obj: T;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.factory();
    }
    
    this.active.add(obj);
    return obj;
  }
  
  release(obj: T): void {
    if (!this.active.has(obj)) return;
    
    this.active.delete(obj);
    this.reset(obj);
    
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }
  
  releaseAll(): void {
    for (const obj of this.active) {
      this.reset(obj);
      if (this.pool.length < this.maxSize) {
        this.pool.push(obj);
      }
    }
    this.active.clear();
  }
  
  getStats() {
    return {
      pooled: this.pool.length,
      active: this.active.size,
      total: this.pool.length + this.active.size
    };
  }
}

/**
 * Particle Object Pool
 */
export interface PooledParticle {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  velocity: { x: number; y: number };
  life: number;
  maxLife: number;
  fadeRate: number;
}

export class ParticlePool extends ObjectPool<PooledParticle> {
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene, textureKey: string, initialSize: number = 50) {
    super(
      () => ({
        sprite: scene.add.image(0, 0, textureKey).setVisible(false),
        velocity: { x: 0, y: 0 },
        life: 0,
        maxLife: 1,
        fadeRate: 1
      }),
      (particle) => {
        particle.sprite.setVisible(false);
        particle.sprite.setAlpha(1);
        particle.sprite.setScale(1);
        particle.velocity.x = 0;
        particle.velocity.y = 0;
        particle.life = 0;
      },
      initialSize
    );
    this.scene = scene;
  }
  
  emit(x: number, y: number, velocityX: number, velocityY: number, life: number = 1000): PooledParticle {
    const particle = this.get();
    particle.sprite.setPosition(x, y);
    particle.sprite.setVisible(true);
    particle.velocity.x = velocityX;
    particle.velocity.y = velocityY;
    particle.life = life;
    particle.maxLife = life;
    particle.fadeRate = 1 / life;
    return particle;
  }
  
  update(dt: number): void {
    for (const particle of this.active) {
      particle.life -= dt * 1000;
      
      if (particle.life <= 0) {
        this.release(particle);
        continue;
      }
      
      // Update position
      particle.sprite.x += particle.velocity.x * dt;
      particle.sprite.y += particle.velocity.y * dt;
      
      // Apply gravity
      particle.velocity.y += 200 * dt;
      
      // Fade out
      const alpha = particle.life / particle.maxLife;
      particle.sprite.setAlpha(alpha);
    }
  }
}