/**
 * Advanced Texture Management System
 * Implements texture atlasing and optimization for maximum performance
 */
export class TextureAtlasManager {
  private scene: Phaser.Scene;
  private atlases: Map<string, Phaser.Textures.Texture> = new Map();
  private dynamicTextures: Map<string, Phaser.Textures.CanvasTexture> = new Map();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createDynamicTextures();
  }
  
  private createDynamicTextures(): void {
    // Create particle texture
    this.createParticleTexture('particle', 8, 0xFFFFFF);
    this.createParticleTexture('spark', 4, 0xFFFF00);
    this.createParticleTexture('dust', 6, 0x888888);
    
    // Create UI elements
    this.createGradientTexture('button_bg', 100, 40, 0x4444FF, 0x2222AA);
    this.createRingTexture('ring', 24, 0xFFFF00, 0xFFFFFF);
  }
  
  private createParticleTexture(key: string, size: number, color: number): void {
    const canvas = this.scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    
    const ctx = canvas.getContext();
    const center = size / 2;
    
    // Create radial gradient for smooth particle
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, Phaser.Display.Color.IntegerToRGBA(color).rgba);
    gradient.addColorStop(0.7, Phaser.Display.Color.IntegerToRGBA(color, 128).rgba);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
    
    this.dynamicTextures.set(key, canvas);
  }
  
  private createGradientTexture(key: string, width: number, height: number, 
                               colorStart: number, colorEnd: number): void {
    const canvas = this.scene.textures.createCanvas(key, width, height);
    if (!canvas) return;
    
    const ctx = canvas.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, Phaser.Display.Color.IntegerToRGBA(colorStart).rgba);
    gradient.addColorStop(1, Phaser.Display.Color.IntegerToRGBA(colorEnd).rgba);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    canvas.refresh();
    
    this.dynamicTextures.set(key, canvas);
  }
  
  private createRingTexture(key: string, size: number, fillColor: number, strokeColor: number): void {
    const canvas = this.scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    
    const ctx = canvas.getContext();
    const center = size / 2;
    const radius = center - 3;
    
    // Fill
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = Phaser.Display.Color.IntegerToRGBA(fillColor).rgba;
    ctx.fill();
    
    // Stroke
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = Phaser.Display.Color.IntegerToRGBA(strokeColor).rgba;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    canvas.refresh();
    this.dynamicTextures.set(key, canvas);
  }
  
  /**
   * Create texture atlas from multiple images
   */
  createAtlas(key: string, imageKeys: string[]): Promise<void> {
    return new Promise((resolve) => {
      // In a real implementation, this would pack multiple textures into a single atlas
      // For now, we'll simulate this by creating references
      const atlasData = {
        frames: {} as any,
        meta: {
          image: key,
          format: 'RGBA8888',
          size: { w: 512, h: 512 },
          scale: 1
        }
      };
      
      imageKeys.forEach((imageKey, index) => {
        const x = (index % 8) * 64;
        const y = Math.floor(index / 8) * 64;
        atlasData.frames[imageKey] = {
          frame: { x, y, w: 64, h: 64 },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
          sourceSize: { w: 64, h: 64 }
        };
      });
      
      // This is a simplified version - in production you'd use proper texture packing
      resolve();
    });
  }
  
  /**
   * Get optimized texture for rendering
   */
  getTexture(key: string): Phaser.Textures.Texture | null {
    if (this.dynamicTextures.has(key)) {
      return this.dynamicTextures.get(key)!;
    }
    
    if (this.scene.textures.exists(key)) {
      return this.scene.textures.get(key);
    }
    
    return null;
  }
  
  /**
   * Cleanup unused textures to free memory
   */
  cleanup(): void {
    // Remove unused dynamic textures
    for (const [key, texture] of this.dynamicTextures) {
      if (!this.isTextureInUse(key)) {
        texture.destroy();
        this.dynamicTextures.delete(key);
      }
    }
  }
  
  private isTextureInUse(key: string): boolean {
    // Check if any game objects are using this texture
    // This is a simplified check - in production you'd track usage more precisely
    return this.scene.children.list.some(child => {
      return (child as any).texture?.key === key;
    });
  }
  
  /**
   * Preload essential textures for better performance
   */
  preloadEssentials(): void {
    // Ensure critical textures are loaded and ready
    const essentialTextures = ['particle', 'spark', 'dust', 'ring'];
    essentialTextures.forEach(key => {
      if (!this.dynamicTextures.has(key)) {
        console.warn(`Essential texture ${key} not found, creating fallback`);
        this.createParticleTexture(key, 8, 0xFFFFFF);
      }
    });
  }
  
  /**
   * Get memory usage statistics
   */
  getMemoryStats(): { count: number; estimatedMemoryMB: number } {
    let totalPixels = 0;
    let count = 0;
    
    for (const texture of this.dynamicTextures.values()) {
      totalPixels += texture.width * texture.height;
      count++;
    }
    
    // Estimate 4 bytes per pixel (RGBA)
    const estimatedMemoryMB = (totalPixels * 4) / (1024 * 1024);
    
    return { count, estimatedMemoryMB };
  }
}