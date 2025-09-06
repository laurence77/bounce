import Phaser from 'phaser';
import { WIDTH, HEIGHT, GRAVITY_Y, accelerate, JumpLogic } from './helpers';
import { GameStateManager } from './gameState';
import { levels } from './levels';
import { LevelData, Ring, Enemy, PowerUp } from './types';

class Level extends Phaser.Scene {
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
  // Global key state (works even if canvas loses focus)
  gLeft = false;
  gRight = false;
  gJumpPressed = false;

  create() {
    this.physics.world.gravity.y = GRAVITY_Y;
    this.cameras.main.setBackgroundColor('#0b0d10');
    // Create the player first so subsequent colliders/overlaps have a valid reference
    this.createBall();
    this.loadLevel(this.gameState.getState().level);
    this.createUI();
    this.setupControls();
    
    // Ensure canvas can receive keyboard focus
    const canvas = this.game.canvas as HTMLCanvasElement;
    if (canvas && !canvas.hasAttribute('tabindex')) {
      canvas.setAttribute('tabindex', '0');
    }
    // Try to focus immediately so keys work without an initial click
    try { (this.game.canvas as HTMLCanvasElement)?.focus(); } catch {}
    // Focus on first interaction to make keyboard responsive and unlock audio
    this.input.once('pointerdown', () => {
      canvas?.focus();
      this.sound.unlock();
    });
    this.input.keyboard?.once('keydown', () => this.sound.unlock());
    this.input.mouse?.disableContextMenu();

    // Global key handlers as a fallback when canvas isn't focused
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { this.gLeft = true; }
      if (k === 'arrowright' || k === 'd') { this.gRight = true; }
      if (k === ' ' || k === 'arrowup' || k === 'w') { this.gJumpPressed = true; }
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
    
    this.cameras.main.startFollow(this.ball, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(120, 80);

    // Debug HUD (top-right)
    this.debugText = this.add.text(WIDTH - 8, 8, '', {
      fontSize: '12px',
      color: '#8fd3ff',
      fontFamily: 'monospace'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
  }

  update(_t: number, dtMs: number) {
    const dt = dtMs / 1000;
    this.updateMovement(dt);
    this.updateTimers(dt);
    this.updateEnemies(dt);
    this.updateUI();
    this.updateDebug();
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
  
  createBall() {
    this.ball = this.physics.add.sprite(120, 200, undefined as any).setDisplaySize(32, 32);
    this.ball.body.setCircle(16, 0, 0);
    this.ball.setBounce(0.15);
    this.ball.setMaxVelocity(280, 900);
    
    // Make ball red like Nokia version
    this.ball.setTint(0xff3333);
  }
  
  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    
    this.currentLevelData.platforms.forEach(platform => {
      const p = this.add.rectangle(platform.x + platform.width/2, platform.y + platform.height/2, platform.width, platform.height);
      
      switch(platform.type) {
        case 'speed':
          p.setFillStyle(0x4444ff); // Blue for speed blocks
          break;
        case 'bounce':
          p.setFillStyle(0x44ff44); // Green for bounce blocks
          break;
        default:
          p.setFillStyle(0x2e2f33); // Default gray
      }
      
      this.physics.add.existing(p, true);
      this.platforms.add(p);
      
      this.physics.add.collider(this.ball, p, () => {
        this.jump.onGround = true;
        this.jump.coyoteTimer = 0.12;
        
        if (platform.type === 'speed') {
          this.ball.setVelocityY(this.ball.body.velocity.y * 1.3);
        } else if (platform.type === 'bounce') {
          this.ball.setVelocityY(-600);
        }
      });
    });
  }
  
  createRings() {
    this.rings = this.physics.add.group();
    
    this.currentLevelData.rings.forEach(ringData => {
      if (!ringData.collected) {
        const ring = this.add.circle(ringData.x, ringData.y, 12, 0xffff00);
        ring.setStrokeStyle(3, 0xffffff);
        this.physics.add.existing(ring, false);
        this.rings.add(ring);
      }
    });
    
    this.physics.add.overlap(this.ball, this.rings, (_ball, ring) => {
      // Defer collection to avoid mutating groups mid-physics step
      this.time.delayedCall(0, () => this.collectRing(ring as Phaser.GameObjects.GameObject));
    });
  }
  
  createEnemies() {
    // Create separate groups for static and moving enemies
    const staticEnemies: Phaser.GameObjects.GameObject[] = [];
    const movingEnemies: Phaser.GameObjects.GameObject[] = [];
    
    this.currentLevelData.enemies.forEach(enemyData => {
      if (enemyData.type === 'static') {
        // Static spikes - use rectangles
        const enemy = this.add.rectangle(enemyData.x + enemyData.width/2, enemyData.y + enemyData.height/2, enemyData.width, enemyData.height);
        enemy.setFillStyle(0xffff00); // Yellow spikes
        this.physics.add.existing(enemy, true);
        staticEnemies.push(enemy);
      } else {
        // Moving enemies - use circles
        const enemy = this.add.circle(enemyData.x + enemyData.width/2, enemyData.y + enemyData.height/2, enemyData.width/2);
        enemy.setFillStyle(0x4444ff); // Blue moving enemies
        this.physics.add.existing(enemy, false);
        (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(enemyData.velocityX || 0, enemyData.velocityY || 0);
        (enemy.body as Phaser.Physics.Arcade.Body).setBounce(1, 1);
        movingEnemies.push(enemy);
      }
    });
    
    // Add collision detection for all enemies
    if (staticEnemies.length > 0) {
      staticEnemies.forEach(enemy => {
        this.physics.add.overlap(this.ball, enemy, () => {
          this.time.delayedCall(0, () => this.playerDied());
        });
      });
    }
    
    if (movingEnemies.length > 0) {
      movingEnemies.forEach(enemy => {
        this.physics.add.overlap(this.ball, enemy, () => {
          this.time.delayedCall(0, () => this.playerDied());
        });
      });
    }
    
    // Store all enemies for update loop
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
    
    // Touch zones
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

    // Pointer fallback: hold left/middle/right of screen
    const p = this.input.activePointer;
    if (p.isDown) {
      if (p.x < WIDTH * 0.33) { left = true; right = false; }
      else if (p.x > WIDTH * 0.66) { left = false; right = true; }
      // middle area acts as jump (buffered)
      else { this.jump.inputBuffer = 0.12; }
    }
    
    if (jumpKey) this.jump.inputBuffer = 0.12;
    
    const baseSpeed = this.speedBoostTimer > 0 ? 240 : 160;
    const target = left ? -baseSpeed : right ? baseSpeed : 0;
    const vx = accelerate(this.ball.body.velocity.x, target, 8 * dt);
    this.ball.setVelocityX(vx);
    
    // Anti-gravity effect
    if (this.antiGravityTimer > 0) {
      this.physics.world.gravity.y = -GRAVITY_Y;
    } else {
      this.physics.world.gravity.y = GRAVITY_Y;
    }
    
    if (this.jump.onGround && this.jump.inputBuffer > 0) {
      this.ball.setVelocityY(-420);
      this.jump.onGround = false;
      this.jump.inputBuffer = 0;
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
  
  updateEnemies(_dt: number) {
    this.enemies.children.entries.forEach((enemy, index) => {
      const enemyData = this.currentLevelData.enemies[index];
      if (enemyData && enemyData.type === 'moving' && enemy.body) {
        const body = enemy.body as Phaser.Physics.Arcade.Body;
        
        // Simple boundary bouncing
        if (body.x <= 0 || body.x >= WIDTH - body.width) {
          body.setVelocityX(-body.velocity.x);
        }
        if (body.y <= 0 || body.y >= HEIGHT - body.height) {
          body.setVelocityY(-body.velocity.y);
        }
      }
    });
  }
  
  updateUI() {
    const state = this.gameState.getState();
    this.uiText.setText([
      `Score: ${state.score}`,
      `Lives: ${state.lives}`,
      `Level: ${state.level}`,
      `Rings: ${state.ringsCollected}/${state.totalRings}`
    ]);
    
    // Update exit door color
    if (this.gameState.allRingsCollected() && !this.currentLevelData.exit.open) {
      this.currentLevelData.exit.open = true;
      this.exit.setTint(0x00ff00);
    }
  }

  updateDebug() {
    const p = this.input.activePointer;
    const canvas = this.game.canvas as HTMLCanvasElement;
    const hasFocus = (document.activeElement === canvas);
    const left = (this.cursors.left?.isDown || this.wasd?.A?.isDown || (p.isDown && p.x < WIDTH * 0.33)) ? 'ON' : 'off';
    const right = (this.cursors.right?.isDown || this.wasd?.D?.isDown || (p.isDown && p.x > WIDTH * 0.66)) ? 'ON' : 'off';
    const jump = (this.jump.inputBuffer > 0) ? 'BUF' : 'off';
    const vx = Math.round(this.ball.body.velocity.x);
    const vy = Math.round(this.ball.body.velocity.y);
    const px = Math.round(p.x);
    const py = Math.round(p.y);
    this.debugText.setText([
      `L:${left} R:${right} J:${jump}`,
      `v=(${vx}, ${vy}) focus:${hasFocus ? 'yes' : 'no'}`,
      `ptr:${p.isDown ? 'down' : 'up'} @ (${px}, ${py})`
    ]);
  }
  
  collectRing(ring: Phaser.GameObjects.GameObject) {
    // Safe destroy after physics step
    this.time.delayedCall(0, () => ring.destroy());
    this.gameState.collectRing();
  }
  
  collectPowerUp(powerUp: Phaser.GameObjects.GameObject) {
    // Safe destroy after physics step
    this.time.delayedCall(0, () => powerUp.destroy());
    
    // Determine power-up type (simplified - in real game you'd track this better)
    const powerUpIndex = this.powerUps.children.entries.indexOf(powerUp);
    const powerUpData = this.currentLevelData.powerUps[powerUpIndex];
    
    if (powerUpData) {
      switch(powerUpData.type) {
        case 'speed':
          this.speedBoostTimer = 5;
          this.gameState.addScore(200);
          break;
        case 'antigravity':
          this.antiGravityTimer = 3;
          this.gameState.addScore(300);
          break;
        case 'extralife':
          this.gameState.addLife();
          this.gameState.addScore(500);
          break;
      }
      powerUpData.collected = true;
    }
  }
  
  playerDied() {
    if (this.gameState.loseLife()) {
      // Respawn
      this.ball.setPosition(120, 200);
      this.ball.setVelocity(0, 0);
    } else if (!this.pendingRestart) {
      // Game over: defer restart to avoid collider update re-entrancy
      this.pendingRestart = true;
      this.time.delayedCall(0, () => {
        this.scene.restart();
        this.gameState.reset();
        this.pendingRestart = false;
      });
    }
  }
  
  nextLevel() {
    this.gameState.nextLevel();
    const nextLevelIndex = this.gameState.getState().level;
    
    if (nextLevelIndex <= levels.length) {
      if (!this.pendingRestart) {
        this.pendingRestart = true;
        this.time.delayedCall(0, () => {
          this.scene.restart();
          this.pendingRestart = false;
        });
      }
    } else {
      // Game completed!
      this.add.text(WIDTH/2, HEIGHT/2, 'Congratulations!\nYou completed all levels!', {
        fontSize: '32px',
        color: '#ffffff',
        align: 'center'
      }).setOrigin(0.5).setScrollFactor(0);
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: 'game',
  backgroundColor: '#0b0d10',
  audio: { disableWebAudio: true },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: GRAVITY_Y }, debug: false }
  },
  scene: [Level]
});
