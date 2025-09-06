import Phaser from 'phaser';
import { WIDTH, HEIGHT, GRAVITY_Y, accelerate, JumpLogic } from './helpers';
import { GameStateManager } from './gameState';
import { levels } from './levels';
import { LevelData, Ring, Enemy, PowerUp } from './types';
import { ObjectPool, ParticlePool } from './systems/ObjectPool';
import { PerformanceMonitor } from './systems/PerformanceMonitor';
import { GameFeelManager } from './systems/GameFeel';
import { DynamicDifficultyAdjuster, DifficultySettings } from './systems/DynamicDifficulty';

class EnhancedLevel extends Phaser.Scene {
  // Original properties
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: any;
  spaceKey!: Phaser.Input.Keyboard.Key;
  ball!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  jump = new JumpLogic();
  gameState = new GameStateManager();
  currentLevelData!: LevelData;
  rings!: Phaser.Physics.Arcade.Group;
  enemies!: Phaser.GameObjects.Group;
  powerUps!: Phaser.Physics.Arcade.Group;
  platforms!: Phaser.Physics.Arcade.StaticGroup;
  exit!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  uiText!: Phaser.GameObjects.Text;
  debugText!: Phaser.GameObjects.Text;
  speedBoostTimer = 0;
  antiGravityTimer = 0;
  pendingRestart = false;
  
  // Enhanced systems
  private performanceMonitor!: PerformanceMonitor;
  private gameFeelManager!: GameFeelManager;
  private difficultyAdjuster!: DynamicDifficultyAdjuster;
  private particlePool!: ParticlePool;
  private ringPool!: ObjectPool<Phaser.GameObjects.Circle>;
  private effectPool!: ObjectPool<Phaser.GameObjects.Image>;
  
  // Enhanced game state
  private trailParticles: any[] = [];
  private lastBallPosition = { x: 0, y: 0 };
  private impactEffectEnabled = true;
  private qualitySettings = { particles: true, trails: true, screenEffects: true };
  
  // Global key state
  gLeft = false;
  gRight = false;
  gJumpPressed = false;

  create() {
    // Initialize enhanced systems
    this.initializeEnhancedSystems();
    
    // Original setup
    this.physics.world.gravity.y = GRAVITY_Y;
    this.cameras.main.setBackgroundColor('#0b0d10');
    
    this.createBall();
    this.loadLevel(this.gameState.getState().level);
    this.createUI();
    this.setupControls();
    this.setupCanvas();
    this.setupCamera();
    this.createDebugUI();
    
    // Enhanced setup
    this.setupPerformanceOptimizations();
    
    console.log('Enhanced Bounce game initialized with cutting-edge systems!');
  }
  
  private initializeEnhancedSystems(): void {
    // Performance monitoring
    this.performanceMonitor = new PerformanceMonitor();
    this.performanceMonitor.addListener((metrics) => {
      this.adaptToPerformance(metrics);
    });
    
    // Game feel system
    this.gameFeelManager = new GameFeelManager(this);
    
    // Dynamic difficulty
    const baseDifficulty: DifficultySettings = {
      enemySpeed: 100,
      enemyCount: 3,
      platformSpacing: 120,
      ringRequirement: 5,
      gravityStrength: GRAVITY_Y,
      powerUpFrequency: 0.3
    };
    this.difficultyAdjuster = new DynamicDifficultyAdjuster(baseDifficulty);
    
    // Object pools
    this.particlePool = new ParticlePool(this, 'particle', 100);
    
    this.ringPool = new ObjectPool(
      () => this.add.circle(0, 0, 12, 0xffff00).setStrokeStyle(3, 0xffffff),
      (ring) => {
        ring.setVisible(false);
        ring.setPosition(0, 0);
        ring.setAlpha(1);
      },
      20, 50
    );
    
    this.effectPool = new ObjectPool(
      () => this.add.image(0, 0, 'spark').setVisible(false),
      (effect) => {
        effect.setVisible(false);
        effect.setPosition(0, 0);
        effect.setAlpha(1);
        effect.setScale(1);
      },
      30, 60
    );
  }
  
  private setupPerformanceOptimizations(): void {
    // Adaptive quality based on performance
    this.performanceMonitor.addListener((metrics) => {
      switch (metrics.qualityLevel) {
        case 'low':
          this.qualitySettings.particles = false;
          this.qualitySettings.trails = false;
          this.qualitySettings.screenEffects = false;
          break;
        case 'medium':
          this.qualitySettings.particles = true;
          this.qualitySettings.trails = false;
          this.qualitySettings.screenEffects = false;
          break;
        case 'high':
          this.qualitySettings.particles = true;
          this.qualitySettings.trails = true;
          this.qualitySettings.screenEffects = true;
          break;
      }
    });
  }
  
  private adaptToPerformance(metrics: any): void {
    // Dynamically adjust visual effects based on performance
    if (metrics.fps < 30) {
      this.impactEffectEnabled = false;
      this.qualitySettings.particles = false;
    } else if (metrics.fps > 50) {
      this.impactEffectEnabled = true;
      this.qualitySettings.particles = true;
    }
  }

  update(_t: number, dtMs: number): void {
    const dt = dtMs / 1000;
    
    // Update enhanced systems
    this.performanceMonitor.update();
    this.particlePool.update(dt);
    this.updateTrailEffect();
    
    // Original update logic
    this.updateMovement(dt);
    this.updateTimers(dt);
    this.updateEnemiesEnhanced(dt);
    this.updateUI();
    this.updateDebugEnhanced();
    
    // Reset performance counters
    this.performanceMonitor.resetFrame();
  }
  
  private updateTrailEffect(): void {
    if (!this.qualitySettings.trails) return;
    
    const ballPos = { x: this.ball.x, y: this.ball.y };
    const distance = Phaser.Math.Distance.Between(
      this.lastBallPosition.x, this.lastBallPosition.y,
      ballPos.x, ballPos.y
    );
    
    if (distance > 10) {
      // Create trail particle
      const trail = this.particlePool.emit(
        ballPos.x + Phaser.Math.Between(-5, 5),
        ballPos.y + Phaser.Math.Between(-5, 5),
        Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(-20, 20),
        300
      );
      trail.sprite.setTint(0xff3333);
      trail.sprite.setScale(0.3);
      
      this.lastBallPosition = ballPos;
    }
  }
  
  private updateEnemiesEnhanced(dt: number): void {
    const settings = this.difficultyAdjuster.getCurrentSettings();
    
    this.enemies.children.entries.forEach((enemy, index) => {
      const enemyData = this.currentLevelData.enemies[index];
      if (enemyData && enemyData.type === 'moving' && enemy.body) {
        const body = enemy.body as Phaser.Physics.Arcade.Body;
        
        // Apply difficulty-adjusted speed
        const currentSpeed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
        const targetSpeed = settings.enemySpeed;
        
        if (currentSpeed > 0) {
          const scale = targetSpeed / currentSpeed;
          body.setVelocity(body.velocity.x * scale, body.velocity.y * scale);
        }
        
        // Enhanced boundary bouncing with effects
        if (body.x <= 0 || body.x >= WIDTH - body.width) {
          body.setVelocityX(-body.velocity.x);
          this.createBounceEffect(body.x, body.y);
        }
        if (body.y <= 0 || body.y >= HEIGHT - body.height) {
          body.setVelocityY(-body.velocity.y);
          this.createBounceEffect(body.x, body.y);
        }
      }
    });
  }
  
  private createBounceEffect(x: number, y: number): void {
    if (!this.qualitySettings.particles) return;
    
    // Create spark particles
    for (let i = 0; i < 5; i++) {
      this.particlePool.emit(
        x, y,
        Phaser.Math.Between(-50, 50),
        Phaser.Math.Between(-50, 50),
        200
      );
    }
  }
  
  // Enhanced collision handling with juice
  private handleBallPlatformCollision = (ball: any, platform: any) => {
    this.jump.onGround = true;
    this.jump.coyoteTimer = 0.12;
    
    // Enhanced collision effects
    this.gameFeelManager.screenShake(3, 100);
    this.gameFeelManager.squashAndStretch(this.ball, 1.2, 0.8, 150);
    
    // Create impact particles
    if (this.qualitySettings.particles) {
      this.gameFeelManager.particleBurst(platform.x, platform.y - 10, 8);
    }
    
    // Platform-specific effects
    const platformIndex = this.platforms.children.entries.indexOf(platform);
    const platformData = this.currentLevelData.platforms[platformIndex];
    
    if (platformData?.type === 'speed') {
      this.ball.setVelocityY(this.ball.body.velocity.y * 1.3);
      this.gameFeelManager.impactFlash(platform, 0x4444ff, 0.8, 200);
    } else if (platformData?.type === 'bounce') {
      this.ball.setVelocityY(-600);
      this.gameFeelManager.cameraPunch(1.15, 200);
      this.gameFeelManager.rippleEffect(platform.x, platform.y, 80, 400);
    }
    
    this.performanceMonitor.trackRenderCall();
  };
  
  // Enhanced ring collection with effects
  collectRing(ring: Phaser.GameObjects.GameObject): void {
    // Juice effects
    this.gameFeelManager.cameraPunch(1.05, 100);
    this.gameFeelManager.impactFlash(ring, 0xFFFF00, 1, 150);
    
    if (this.qualitySettings.particles) {
      this.gameFeelManager.particleBurst((ring as any).x, (ring as any).y, 12, [0xFFFF00, 0xFFFFFF, 0xFFA500]);
    }
    
    // Play collection sound effect (if available)
    try { this.sound.play('collect', { volume: 0.3 }); } catch {}
    
    this.time.delayedCall(0, () => {
      this.ringPool.release(ring as any);
      this.gameState.collectRing();
      this.difficultyAdjuster.updateMetrics('ring_collected');
    });
  }
  
  // Enhanced power-up collection
  collectPowerUp(powerUp: Phaser.GameObjects.GameObject): void {
    const powerUpIndex = this.powerUps.children.entries.indexOf(powerUp);
    const powerUpData = this.currentLevelData.powerUps[powerUpIndex];
    
    if (powerUpData) {
      // Enhanced effects based on power-up type
      switch(powerUpData.type) {
        case 'speed':
          this.speedBoostTimer = 5;
          this.gameState.addScore(200);
          this.gameFeelManager.screenShake(5, 150);
          this.gameFeelManager.chromaticAberration(3, 300);
          break;
        case 'antigravity':
          this.antiGravityTimer = 3;
          this.gameState.addScore(300);
          this.gameFeelManager.slowMotion(0.7, 500);
          break;
        case 'extralife':
          this.gameState.addLife();
          this.gameState.addScore(500);
          this.gameFeelManager.freezeFrame(200);
          this.gameFeelManager.rippleEffect((powerUp as any).x, (powerUp as any).y, 120, 600);
          break;
      }
      
      // Universal power-up effects
      this.gameFeelManager.particleBurst((powerUp as any).x, (powerUp as any).y, 15);
      this.difficultyAdjuster.updateMetrics('power_up_collected');
      powerUpData.collected = true;
    }
    
    this.time.delayedCall(0, () => powerUp.destroy());
  }
  
  // Enhanced player death with dramatic effects
  playerDied(): void {
    // Dramatic death effects
    this.gameFeelManager.screenShake(15, 300);
    this.gameFeelManager.freezeFrame(150);
    this.gameFeelManager.chromaticAberration(8, 500);
    
    // Massive particle explosion
    if (this.qualitySettings.particles) {
      this.gameFeelManager.particleBurst(this.ball.x, this.ball.y, 25, [0xFF3333, 0xFF6B6B, 0xFFFFFF]);
    }
    
    // Update difficulty system
    this.difficultyAdjuster.updateMetrics('player_death');
    
    if (this.gameState.loseLife()) {
      // Respawn with anticipation effect
      this.time.delayedCall(500, async () => {
        await this.gameFeelManager.anticipation(this.ball, { x: 0, y: -1 }, 20, 200);
        this.ball.setPosition(120, 200);
        this.ball.setVelocity(0, 0);
      });
    } else if (!this.pendingRestart) {
      this.pendingRestart = true;
      this.time.delayedCall(1000, () => {
        this.scene.restart();
        this.gameState.reset();
        this.difficultyAdjuster.reset();
        this.pendingRestart = false;
      });
    }
  }
  
  // Enhanced level completion
  nextLevel(): void {
    // Celebration effects
    this.gameFeelManager.cameraPunch(1.2, 300);
    this.gameFeelManager.rippleEffect(this.exit.x, this.exit.y, 150, 800);
    
    if (this.qualitySettings.particles) {
      // Victory fireworks
      for (let i = 0; i < 20; i++) {
        this.time.delayedCall(i * 100, () => {
          this.gameFeelManager.particleBurst(
            this.exit.x + Phaser.Math.Between(-50, 50),
            this.exit.y + Phaser.Math.Between(-50, 50),
            8, [0x00FF00, 0xFFFF00, 0xFFFFFF]
          );
        });
      }
    }
    
    this.difficultyAdjuster.updateMetrics('level_complete');
    this.gameState.nextLevel();
    
    const nextLevelIndex = this.gameState.getState().level;
    if (nextLevelIndex <= levels.length) {
      if (!this.pendingRestart) {
        this.pendingRestart = true;
        this.time.delayedCall(1500, () => {
          this.scene.restart();
          this.pendingRestart = false;
        });
      }
    } else {
      // Game completed celebration
      this.add.text(WIDTH/2, HEIGHT/2, 'LEGENDARY!\nYou mastered all levels!', {
        fontSize: '32px',
        color: '#FFD700',
        align: 'center',
        fontStyle: 'bold'
      }).setOrigin(0.5).setScrollFactor(0);
      
      // Epic completion effects
      for (let i = 0; i < 50; i++) {
        this.time.delayedCall(i * 50, () => {
          this.gameFeelManager.particleBurst(
            Phaser.Math.Between(0, WIDTH),
            Phaser.Math.Between(0, HEIGHT),
            10, [0xFFD700, 0xFF6B6B, 0x4ECDC4, 0xFFE66D]
          );
        });
      }
    }
  }
  
  // Enhanced debug information
  private updateDebugEnhanced(): void {
    const metrics = this.performanceMonitor.getMetrics();
    const difficulty = this.difficultyAdjuster.getDebugInfo();
    const poolStats = this.particlePool.getStats();
    
    const p = this.input.activePointer;
    const canvas = this.game.canvas as HTMLCanvasElement;
    const hasFocus = (document.activeElement === canvas);
    
    this.debugText.setText([
      `FPS: ${metrics.fps} (${metrics.frameTime}ms)`,
      `Quality: ${metrics.qualityLevel} | Memory: ${metrics.memoryUsage}MB`,
      `Particles: ${poolStats.active}/${poolStats.total}`,
      `Difficulty: ${(difficulty.metrics.skillLevel * 100).toFixed(0)}% skill`,
      `Engagement: ${(difficulty.metrics.engagementScore * 100).toFixed(0)}%`,
      `Focus: ${hasFocus ? 'YES' : 'NO'} | Ptr: ${p.isDown ? 'DOWN' : 'UP'}`
    ]);
  }
  
  // Original methods adapted with enhanced features
  setupCanvas(): void {
    const canvas = this.game.canvas as HTMLCanvasElement;
    if (canvas && !canvas.hasAttribute('tabindex')) {
      canvas.setAttribute('tabindex', '0');
    }
    
    try { canvas?.focus(); } catch {}
    
    this.input.once('pointerdown', () => {
      canvas?.focus();
      this.sound.unlock();
    });
    this.input.keyboard?.once('keydown', () => this.sound.unlock());
    this.input.mouse?.disableContextMenu();

    // Global key handlers
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { this.gLeft = true; }
      if (k === 'arrowright' || k === 'd') { this.gRight = true; }
      if (k === ' ' || k === 'arrowup' || k === 'w') { this.gJumpPressed = true; }
      this.difficultyAdjuster.updateMetrics('player_input', { expectedTime: Date.now() });
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { this.gLeft = false; }
      if (k === 'arrowright' || k === 'd') { this.gRight = false; }
    };
    
    window.addEventListener('keydown', onKeyDown, { passive: true });
    window.addEventListener('keyup', onKeyUp, { passive: true });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onKeyDown as any);
      window.removeEventListener('keyup', onKeyUp as any);
    });
  }
  
  setupCamera(): void {
    this.cameras.main.startFollow(this.ball, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(120, 80);
  }
  
  createDebugUI(): void {
    this.debugText = this.add.text(WIDTH - 8, 8, '', {
      fontSize: '12px',
      color: '#8fd3ff',
      fontFamily: 'monospace'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
  }
  
  // Include all original methods with enhanced features integrated...
  // (Continuing with createBall, loadLevel, createPlatforms, etc. with enhancements)
  
  createBall() {
    this.ball = this.physics.add.sprite(120, 200, undefined as any).setDisplaySize(32, 32);
    this.ball.body.setCircle(16, 0, 0);
    this.ball.setBounce(0.15);
    this.ball.setMaxVelocity(280, 900);
    this.ball.setTint(0xff3333);
    
    // Initialize position tracking
    this.lastBallPosition = { x: this.ball.x, y: this.ball.y };
    
    // Start level timer for difficulty adjustment
    this.difficultyAdjuster.updateMetrics('level_start');
  }
  
  loadLevel(levelNumber: number) {
    this.currentLevelData = levels[levelNumber - 1] || levels[0];
    this.gameState.setTotalRings(this.currentLevelData.rings.length);
    this.gameState.resetLevel();
    
    this.createPlatforms();
    this.createRings();
    this.createEnemies();
    this.createPowerUps();
    this.createExit();
  }
  
  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    
    this.currentLevelData.platforms.forEach(platform => {
      const p = this.add.rectangle(platform.x + platform.width/2, platform.y + platform.height/2, platform.width, platform.height);
      
      switch(platform.type) {
        case 'speed':
          p.setFillStyle(0x4444ff);
          break;
        case 'bounce':
          p.setFillStyle(0x44ff44);
          break;
        default:
          p.setFillStyle(0x2e2f33);
      }
      
      this.physics.add.existing(p, true);
      this.platforms.add(p);
      this.physics.add.collider(this.ball, p, this.handleBallPlatformCollision);
    });
  }
  
  createRings() {
    this.rings = this.physics.add.group();
    
    this.currentLevelData.rings.forEach(ringData => {
      if (!ringData.collected) {
        const ring = this.ringPool.get();
        ring.setPosition(ringData.x, ringData.y);
        ring.setVisible(true);
        this.physics.add.existing(ring, false);
        this.rings.add(ring);
      }
    });
    
    this.physics.add.overlap(this.ball, this.rings, (_ball, ring) => {
      this.time.delayedCall(0, () => this.collectRing(ring as Phaser.GameObjects.GameObject));
    });
  }
  
  createEnemies() {
    const staticEnemies: Phaser.GameObjects.GameObject[] = [];
    const movingEnemies: Phaser.GameObjects.GameObject[] = [];
    
    this.currentLevelData.enemies.forEach(enemyData => {
      if (enemyData.type === 'static') {
        const enemy = this.add.rectangle(enemyData.x + enemyData.width/2, enemyData.y + enemyData.height/2, enemyData.width, enemyData.height);
        enemy.setFillStyle(0xffff00);
        this.physics.add.existing(enemy, true);
        staticEnemies.push(enemy);
      } else {
        const enemy = this.add.circle(enemyData.x + enemyData.width/2, enemyData.y + enemyData.height/2, enemyData.width/2);
        enemy.setFillStyle(0x4444ff);
        this.physics.add.existing(enemy, false);
        (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(enemyData.velocityX || 0, enemyData.velocityY || 0);
        (enemy.body as Phaser.Physics.Arcade.Body).setBounce(1, 1);
        movingEnemies.push(enemy);
      }
    });
    
    [...staticEnemies, ...movingEnemies].forEach(enemy => {
      this.physics.add.overlap(this.ball, enemy, () => {
        this.time.delayedCall(0, () => this.playerDied());
      });
    });
    
    this.enemies = this.add.group([...staticEnemies, ...movingEnemies]);
  }
  
  createPowerUps() {
    this.powerUps = this.physics.add.group();
    
    this.currentLevelData.powerUps.forEach(powerUpData => {
      if (!powerUpData.collected) {
        const powerUp = this.add.rectangle(powerUpData.x, powerUpData.y, 20, 20);
        
        switch(powerUpData.type) {
          case 'speed':
            powerUp.setFillStyle(0xffff00);
            powerUp.setStrokeStyle(2, 0xff0000);
            break;
          case 'antigravity':
            powerUp.setFillStyle(0x00ffff);
            break;
          case 'extralife':
            powerUp.setFillStyle(0xffffff);
            break;
        }
        
        this.physics.add.existing(powerUp, false);
        this.powerUps.add(powerUp);
      }
    });
    
    this.physics.add.overlap(this.ball, this.powerUps, (_ball, powerUp) => {
      this.time.delayedCall(0, () => this.collectPowerUp(powerUp as Phaser.GameObjects.GameObject));
    });
  }
  
  createExit() {
    const exitData = this.currentLevelData.exit;
    this.exit = this.physics.add.sprite(exitData.x, exitData.y, undefined as any).setDisplaySize(40, 60);
    this.exit.setTint(exitData.open ? 0x00ff00 : 0x888888);
    
    this.physics.add.overlap(this.ball, this.exit, () => {
      if (this.gameState.allRingsCollected()) {
        this.time.delayedCall(0, () => this.nextLevel());
      }
    });
  }
  
  createUI() {
    this.uiText = this.add.text(16, 16, '', {
      fontSize: '20px',
      color: '#ffffff'
    }).setScrollFactor(0);
  }
  
  setupControls() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D');
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.W,
    ]);
    
    // Touch controls
    const left = this.add.zone(0, HEIGHT, WIDTH*0.33, HEIGHT).setOrigin(0,1).setScrollFactor(0).setInteractive();
    const right = this.add.zone(WIDTH*0.33, HEIGHT, WIDTH*0.33, HEIGHT).setOrigin(0,1).setScrollFactor(0).setInteractive();
    const jumpZ = this.add.zone(WIDTH*0.66, HEIGHT, WIDTH*0.34, HEIGHT).setOrigin(0,1).setScrollFactor(0).setInteractive();
    
    const releaseLeft = () => { (this.cursors.left as any).isDown = false; };
    const releaseRight = () => { (this.cursors.right as any).isDown = false; };

    left.on('pointerdown', () => { (this.cursors.left as any).isDown = true; });
    left.on('pointerup', releaseLeft);
    left.on('pointerout', releaseLeft);
    left.on('pointerupoutside', releaseLeft as any);
    left.on('pointercancel', releaseLeft as any);

    right.on('pointerdown', () => { (this.cursors.right as any).isDown = true; });
    right.on('pointerup', releaseRight);
    right.on('pointerout', releaseRight);
    right.on('pointerupoutside', releaseRight as any);
    right.on('pointercancel', releaseRight as any);

    jumpZ.on('pointerdown', () => { this.jump.inputBuffer = 0.12; });
  }
  
  updateMovement(dt: number) {
    let left = this.cursors.left?.isDown || this.wasd?.A?.isDown || this.gLeft || false;
    let right = this.cursors.right?.isDown || this.wasd?.D?.isDown || this.gRight || false;
    let jumpKey = Phaser.Input.Keyboard.JustDown(this.cursors.up!) || Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.wasd?.W);
    if (this.gJumpPressed) { jumpKey = true; this.gJumpPressed = false; }

    const p = this.input.activePointer;
    if (p.isDown) {
      if (p.x < WIDTH * 0.33) { left = true; right = false; }
      else if (p.x > WIDTH * 0.66) { left = false; right = true; }
      else { this.jump.inputBuffer = 0.12; }
    }
    
    if (jumpKey) this.jump.inputBuffer = 0.12;
    
    const baseSpeed = this.speedBoostTimer > 0 ? 240 : 160;
    const target = left ? -baseSpeed : right ? baseSpeed : 0;
    const vx = accelerate(this.ball.body.velocity.x, target, 8 * dt);
    this.ball.setVelocityX(vx);
    
    // Apply difficulty-adjusted gravity
    const settings = this.difficultyAdjuster.getCurrentSettings();
    if (this.antiGravityTimer > 0) {
      this.physics.world.gravity.y = -settings.gravityStrength;
    } else {
      this.physics.world.gravity.y = settings.gravityStrength;
    }
    
    if (this.jump.onGround && this.jump.inputBuffer > 0) {
      this.ball.setVelocityY(-420);
      this.jump.onGround = false;
      this.jump.inputBuffer = 0;
      
      // Jump effect
      this.gameFeelManager.squashAndStretch(this.ball, 0.8, 1.2, 100);
    }
    
    this.jump.coyoteTimer = Math.max(0, this.jump.coyoteTimer - dt);
    this.jump.inputBuffer = Math.max(0, this.jump.inputBuffer - dt);
    
    if (!this.ball.body.blocked.down) {
      if (this.jump.coyoteTimer <= 0) this.jump.onGround = false;
    }
  }
  
  updateTimers(dt: number) {
    this.speedBoostTimer = Math.max(0, this.speedBoostTimer - dt);
    this.antiGravityTimer = Math.max(0, this.antiGravityTimer - dt);
  }
  
  updateUI() {
    const state = this.gameState.getState();
    this.uiText.setText([
      `Score: ${state.score}`,
      `Lives: ${state.lives}`,
      `Level: ${state.level}`,
      `Rings: ${state.ringsCollected}/${state.totalRings}`
    ]);
    
    if (this.gameState.allRingsCollected() && !this.currentLevelData.exit.open) {
      this.currentLevelData.exit.open = true;
      this.exit.setTint(0x00ff00);
      this.gameFeelManager.impactFlash(this.exit, 0x00ff00, 1, 300);
    }
  }
}

// Enhanced game configuration
new Phaser.Game({
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: 'game',
  backgroundColor: '#0b0d10',
  audio: { disableWebAudio: false },
  physics: {
    default: 'arcade',
    arcade: { 
      gravity: { x: 0, y: GRAVITY_Y }, 
      debug: false,
      // Enhanced physics settings
      fps: 60,
      fixedStep: true
    }
  },
  // Performance optimizations
  render: {
    antialias: true,
    pixelArt: false,
    autoResize: true,
    powerPreference: 'high-performance'
  },
  scene: [EnhancedLevel]
});