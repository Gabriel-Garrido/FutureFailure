import Phaser from 'phaser';
import { combatConfig, type DamagePayload } from '../data/combatConfig';
import { gameText } from '../data/gameText';
import { levelOne } from '../data/levelOne';
import { tutorialPresentationConfig, type TutorialActionId, type TutorialPromptPayload } from '../data/tutorialConfig';
import { type RectData } from '../data/levelTypes';
import { EnemyBase } from '../entities/EnemyBase';
import { Hazard } from '../entities/Hazard';
import { Pickup } from '../entities/Pickup';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { COLORS, EVENTS } from '../game/constants';
import { AudioSystem } from '../systems/AudioSystem';
import { CameraSystem } from '../systems/CameraSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { DebugSystem } from '../systems/DebugSystem';
import { InputSystem } from '../systems/InputSystem';
import { LevelBuilder, type BuiltLevel } from '../systems/LevelBuilder';
import { ParticleSystem } from '../systems/ParticleSystem';
import { SaveSystem, type SaveState } from '../systems/SaveSystem';
import { PauseMenu } from '../ui/PauseMenu';
import { TouchControls } from '../ui/TouchControls';

export class LevelOneScene extends Phaser.Scene {
  private inputSystem?: InputSystem;
  private player?: Player;
  private cameraSystem?: CameraSystem;
  private particles?: ParticleSystem;
  private audioSystem?: AudioSystem;
  private debugSystem?: DebugSystem;
  private pauseMenu?: PauseMenu;
  private level?: BuiltLevel;
  private enemyProjectiles?: Phaser.Physics.Arcade.Group;
  private playerProjectiles?: Phaser.Physics.Arcade.Group;
  private checkpoint: SaveState = { checkpointId: 'awakening', x: levelOne.playerSpawn.x, y: levelOne.playerSpawn.y, health: 5, hasKeycard: false };
  private nearbyDoor?: import('../entities/Door').Door;
  private nearbyTerminal?: Phaser.GameObjects.Zone;
  private finalOpen = false;
  private shootCooldownMs = 0;
  private mapEmitMs = 0;
  private objectiveLockMs = 0;
  private lastGuidance = '';
  private readonly seenTutorialPrompts = new Set<string>();
  private readonly completedObjectives = new Set<'movement' | 'combat' | 'arena'>();

  constructor() {
    super('LevelOneScene');
  }

  create(): void {
    this.time.timeScale = 1;
    this.scene.launch('UIScene');
    this.physics.world.setBounds(0, 0, levelOne.width, levelOne.height);
    this.inputSystem = new InputSystem(this);
    this.particles = new ParticleSystem(this);
    this.audioSystem = new AudioSystem(this);
    this.debugSystem = new DebugSystem(this);
    this.pauseMenu = new PauseMenu(this);

    const saved = new SaveSystem().load();
    this.checkpoint = this.normalizeCheckpoint(saved ?? this.checkpoint);
    this.restoreProgressFromCheckpoint();

    const builder = new LevelBuilder(this);
    this.level = builder.build(levelOne);
    this.player = new Player(this, this.checkpoint.x, this.checkpoint.y, this.particles, this.audioSystem);
    this.player.hasKeycard = this.checkpoint.hasKeycard;
    this.player.health = this.checkpoint.health;
    this.cameraSystem = new CameraSystem(this, this.player, levelOne);
    new TouchControls(this, this.inputSystem);

    this.enemyProjectiles = this.physics.add.group({ classType: Projectile, maxSize: 40, runChildUpdate: true });
    this.playerProjectiles = this.physics.add.group({ classType: Projectile, maxSize: 12, runChildUpdate: true });
    this.connectPhysics();
    new CombatSystem(this).connect(this.player, this.level.enemies, this.level.breakables, this.enemyProjectiles, this.playerProjectiles);
    this.connectEvents();
    this.emitInitialUi();
  }

  update(_time: number, delta: number): void {
    if (!this.inputSystem || !this.player || !this.level || !this.cameraSystem || !this.pauseMenu) return;
    const input = this.inputSystem.snapshot();
    if (input.pausePressed) this.pauseMenu.toggle();
    if (this.pauseMenu.isPaused()) return;
    if (input.debugPressed) this.debugSystem?.toggle();

    this.shootCooldownMs = Math.max(0, this.shootCooldownMs - delta);
    this.mapEmitMs = Math.max(0, this.mapEmitMs - delta);
    this.objectiveLockMs = Math.max(0, this.objectiveLockMs - delta);
    this.player.updatePlayer(delta, input);
    this.cameraSystem.update(this.player.movement.state.facing, (this.player.body as Phaser.Physics.Arcade.Body).velocity.x);
    if (this.mapEmitMs <= 0) {
      this.game.events.emit(EVENTS.playerPositionChanged, this.player.x, this.player.y);
      this.mapEmitMs = 80;
    }
    if (input.shootPressed) this.firePlayerProjectile();
    if (input.interactPressed) this.interact();

    for (const hazard of this.level.hazards) hazard.updateHazard(delta);
    for (const pickup of this.level.pickups.getChildren() as Pickup[]) pickup.updatePickup(delta);
    for (const enemy of this.level.enemies.getChildren() as EnemyBase[]) enemy.updateEnemy(delta, this.player, this.enemyProjectiles!);
    this.updateContextPrompts();
    this.updateTriggerObjectives();
    this.updateTutorialPrompts();
    this.updateGuidance();
    this.checkFallDeath();
  }

  private connectPhysics(): void {
    if (!this.level || !this.player || !this.enemyProjectiles || !this.playerProjectiles) return;
    this.physics.add.collider(this.player, this.level.platforms);
    this.physics.add.collider(this.player, this.level.breakables);
    this.physics.add.collider(this.level.enemies, this.level.platforms);
    this.physics.add.collider(this.level.enemies, this.level.breakables);
    this.physics.add.collider(this.enemyProjectiles, this.level.platforms, (projectile) => (projectile as Projectile).kill());
    this.physics.add.collider(this.enemyProjectiles, this.level.breakables, (projectile) => (projectile as Projectile).kill());
    this.physics.add.collider(this.playerProjectiles, this.level.platforms, (projectile) => (projectile as Projectile).kill());
    for (const door of this.level.doors) {
      this.physics.add.collider(this.player, door);
      this.physics.add.collider(this.level.enemies, door);
    }
    for (const hazard of this.level.hazards) {
      this.physics.add.overlap(this.player, hazard.zone, () => this.player?.takeDamage(this.hazardDamagePayload(hazard)));
    }
    this.physics.add.overlap(this.player, this.level.pickups, (_playerObject, pickupObject) => {
      const pickup = pickupObject as Pickup;
      pickup.collect(this.player!);
      this.particles?.pickup(pickup.x, pickup.y);
      this.audioSystem?.blip('pickup');
    });
    for (const checkpoint of this.level.checkpoints) {
      this.physics.add.overlap(this.player, checkpoint.zone, () => this.activateCheckpoint(checkpoint));
    }
    this.physics.add.overlap(this.player, this.level.finalPortal, () => this.tryFinishLevel());
  }

  private connectEvents(): void {
    this.events.on(EVENTS.enemyDamaged, (x: number, y: number, direction: 1 | -1 = 1) => {
      this.particles?.enemyHit(x, y, direction);
      this.cameraSystem?.shake('light');
      this.audioSystem?.blip('hit');
    });
    this.events.on(EVENTS.enemyDefeated, (x: number, y: number) => {
      this.particles?.enemyDefeat(x, y);
      this.cameraSystem?.shake('hit');
      this.audioSystem?.blip('finisher');
      if (x > 2440 && x < 2940 && !this.completedObjectives.has('combat')) {
        this.completedObjectives.add('combat');
        this.emitObjective(gameText.objectives.combatComplete, 2600);
      }
      if (this.remainingArenaEnemies() === 0) {
        this.finalOpen = true;
        this.completedObjectives.add('arena');
        this.emitObjective(gameText.objectives.portalReady, 3200);
      }
    });
    this.events.on('breakable-broken', (x: number, y: number) => {
      this.particles?.explosion(x, y);
      this.cameraSystem?.shake('light');
      this.audioSystem?.blip('hit');
    });
    this.events.on('enemy-shoot', () => this.audioSystem?.blip('shoot'));
    this.events.on('player-dash', () => this.cameraSystem?.shake('light'));
    this.events.on(EVENTS.playerWallJump, (x: number, y: number) => {
      this.particles?.jump(x, y);
      this.cameraSystem?.shake('light');
    });
    this.events.on(EVENTS.playerDamaged, (_x: number, _y: number, payload: DamagePayload) => {
      if (payload.source === 'enemyProjectile') {
        this.time.timeScale = 1;
        this.cameraSystem?.shake('light');
        this.flashDamageOverlay(0.1, 160);
        return;
      }
      this.cameraSystem?.shake(payload.amount >= 3 ? 'heavy' : 'hit');
      this.flashDamageOverlay(0.18, 220);
    });
    this.events.on(EVENTS.playerDied, () => {
      this.cameraSystem?.shake('heavy');
      this.time.delayedCall(900, () => {
        this.scene.stop('UIScene');
        this.scene.start('GameOverScene');
      });
    });
  }

  private emitInitialUi(): void {
    if (!this.player) return;
    this.game.events.emit(EVENTS.healthChanged, this.player.health, this.player.maxHealth);
    this.game.events.emit(EVENTS.energyChanged, this.player.energy, 5);
    this.game.events.emit(EVENTS.keycardChanged, this.player.hasKeycard);
    this.game.events.emit(EVENTS.mapConfigured, levelOne.width, levelOne.mapMarkers);
    this.emitObjective(this.initialObjective());
    this.game.events.emit(EVENTS.playerPositionChanged, this.player.x, this.player.y);
  }

  private normalizeCheckpoint(state: SaveState): SaveState {
    const hasValidPosition = Number.isFinite(state.x)
      && Number.isFinite(state.y)
      && state.x >= 80
      && state.x <= levelOne.width - 80
      && state.y >= 80
      && state.y <= levelOne.height - 80;

    if (!hasValidPosition) {
      return { checkpointId: 'inicio', x: levelOne.playerSpawn.x, y: levelOne.playerSpawn.y, health: 5, hasKeycard: false };
    }

    return {
      checkpointId: state.checkpointId || 'inicio',
      x: state.x,
      y: state.y,
      health: Phaser.Math.Clamp(Math.round(state.health || 5), 1, 5),
      hasKeycard: Boolean(state.hasKeycard),
    };
  }

  private updateContextPrompts(): void {
    if (!this.level || !this.player) return;
    this.nearbyDoor = this.level.doors.find((door) => !door.isOpen() && Phaser.Math.Distance.Between(this.player!.x, this.player!.y, door.x, door.y) < 110);
    this.nearbyTerminal = this.level.terminals.find((terminal) => Phaser.Math.Distance.Between(this.player!.x, this.player!.y, terminal.x, terminal.y) < 95);
    if (this.nearbyDoor) this.game.events.emit(EVENTS.contextChanged, this.nearbyDoor.canOpen(this.player, this.isDoorRequirementMet(this.nearbyDoor)) ? gameText.prompts.openDoor : this.lockedDoorMessage(this.nearbyDoor));
    else if (this.nearbyTerminal) this.game.events.emit(EVENTS.contextChanged, gameText.prompts.readTerminal);
    else this.game.events.emit(EVENTS.contextChanged, '');
  }

  private updateGuidance(): void {
    if (!this.player) return;
    if (this.objectiveLockMs > 0) return;
    const x = this.player.x;
    if (x > 700 && !this.completedObjectives.has('movement')) {
      this.completeMovementObjective();
      return;
    }
    let next = '';
    if (this.player.hasKeycard && x < 4440) next = gameText.guidance.returnWithKey;
    else if (x < 720) next = gameText.guidance.start;
    else if (x < 1540) next = gameText.guidance.climb;
    else if (x < 2390) next = gameText.guidance.wallJump;
    else if (x < 3230) next = gameText.guidance.hub;
    else if (x < 4440) next = gameText.guidance.reactor;
    else if (x < 5450) next = this.finalOpen ? gameText.guidance.exit : gameText.guidance.arena;
    else next = gameText.guidance.exit;

    this.emitObjective(next);
  }

  private interact(): void {
    if (!this.player) return;
    if (this.nearbyDoor?.interact(this.player, this.isDoorRequirementMet(this.nearbyDoor))) {
      this.audioSystem?.blip('door');
      this.cameraSystem?.shake('light');
      const requirement = this.nearbyDoor.requirement();
      if (requirement === 'movement') this.emitObjective(gameText.guidance.wallJump, 2200);
      else if (requirement === 'combat') this.emitObjective(gameText.guidance.reactor, 2200);
      else if (requirement === 'keycard') this.emitObjective(gameText.objectives.arenaDoorOpened, 2600);
      return;
    }
    if (this.nearbyTerminal) {
      this.emitObjective(this.nearbyTerminal.getData('message') as string, 3200);
    }
  }

  private firePlayerProjectile(): void {
    if (!this.player || !this.playerProjectiles || this.shootCooldownMs > 0 || this.player.energy <= 0) return;
    const projectile = this.playerProjectiles.get(this.player.x, this.player.y - 10) as Projectile | null;
    if (!projectile) return;
    projectile.fire(
      this.player.x + this.player.movement.state.facing * 30,
      this.player.y - 8,
      combatConfig.projectile.player.speed * this.player.movement.state.facing,
      0,
      true,
      COLORS.cyan,
      combatConfig.projectile.player.amount,
    );
    this.player.addEnergy(-combatConfig.projectile.player.energyCost);
    this.shootCooldownMs = combatConfig.projectile.player.cooldownMs;
    this.audioSystem?.blip('shoot');
  }

  private flashDamageOverlay(alpha: number, duration: number): void {
    const overlay = this.add.rectangle(480, 270, 960, 540, COLORS.red, alpha)
      .setScrollFactor(0)
      .setDepth(2100);
    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => overlay.destroy(),
    });
  }

  private activateCheckpoint(checkpoint: import('../entities/Checkpoint').Checkpoint): void {
    if (!this.player) return;
    if (checkpoint.activeCheckpoint) return;
    checkpoint.activate();
    this.checkpoint = { checkpointId: checkpoint.id, x: checkpoint.x, y: checkpoint.y, health: this.player.maxHealth, hasKeycard: this.player.hasKeycard };
    new SaveSystem().save(this.checkpoint);
    this.emitObjective(gameText.objectives.checkpoint, 1600);
  }

  private checkFallDeath(): void {
    if (!this.player || this.player.movement.state.dead) return;
    if (this.player.y > levelOne.height + 120) this.player.takeDamage(this.fallDamagePayload());
  }

  private remainingArenaEnemies(): number {
    if (!this.level) return 1;
    return (this.level.enemies.getChildren() as EnemyBase[]).filter((enemy) => !enemy.isDead() && enemy.x > 4590).length;
  }

  private tryFinishLevel(): void {
    if (!this.finalOpen) {
      this.game.events.emit(EVENTS.contextChanged, gameText.objectives.portalLocked);
      return;
    }
    this.game.events.emit(EVENTS.objectiveChanged, gameText.objectives.levelComplete);
    this.scene.pause();
    this.add.text(this.cameras.main.scrollX + 480, this.cameras.main.scrollY + 240, 'GRIETA ASEGURADA', { fontFamily: 'Arial Black, Arial', fontSize: '40px', color: '#d7fbff' }).setOrigin(0.5).setDepth(2000);
  }

  private isDoorRequirementMet(door: import('../entities/Door').Door): boolean {
    const requirement = door.requirement();
    if (!requirement || requirement === 'keycard') return false;
    return this.completedObjectives.has(requirement);
  }

  private lockedDoorMessage(door: import('../entities/Door').Door): string {
    const requirement = door.requirement();
    if (requirement === 'keycard') return gameText.prompts.keycardRequired;
    if (requirement === 'movement') return gameText.prompts.movementRequired;
    if (requirement === 'combat') return gameText.prompts.combatRequired;
    if (requirement === 'arena') return gameText.prompts.arenaRequired;
    return '';
  }

  private updateTriggerObjectives(): void {
    if (!this.player) return;
    const movementTrigger = levelOne.triggers.find((trigger) => trigger.id === 'trigger-movement-complete');
    if (movementTrigger && !this.completedObjectives.has('movement') && this.playerInside(movementTrigger)) {
      this.completeMovementObjective();
    }
    const arenaTrigger = levelOne.triggers.find((trigger) => trigger.id === 'trigger-arena-entry');
    if (arenaTrigger && !this.seenTutorialPrompts.has(arenaTrigger.id) && this.playerInside(arenaTrigger)) {
      this.seenTutorialPrompts.add(arenaTrigger.id);
      this.emitTutorialPrompt({ id: arenaTrigger.id, text: gameText.guidance.arena, actionId: 'arena', durationMs: tutorialPresentationConfig.promptDurationMs });
      this.emitObjective(gameText.guidance.arena, 2400);
    }
  }

  private updateTutorialPrompts(): void {
    if (!this.level) return;
    for (const prompt of this.level.tutorialPrompts) {
      if (prompt.once && this.seenTutorialPrompts.has(prompt.id)) continue;
      if (!this.playerInside(prompt)) continue;
      this.seenTutorialPrompts.add(prompt.id);
      this.emitTutorialPrompt({
        id: prompt.id,
        text: prompt.text,
        actionId: prompt.actionId ?? this.actionForPrompt(prompt.id),
        priority: prompt.priority,
        durationMs: tutorialPresentationConfig.promptDurationMs,
      });
      if (!prompt.suppressObjective) this.objectiveLockMs = Math.max(this.objectiveLockMs, tutorialPresentationConfig.reminderCooldownMs);
      return;
    }
  }

  private emitTutorialPrompt(payload: TutorialPromptPayload): void {
    this.game.events.emit(EVENTS.tutorialChanged, payload);
  }

  private actionForPrompt(id: string): TutorialActionId {
    if (id.includes('dash')) return 'dash';
    if (id.includes('jump')) return 'jump';
    if (id.includes('wall')) return 'wallJump';
    if (id.includes('attack') || id.includes('combat')) return 'attack';
    if (id.includes('keycard')) return 'keycard';
    if (id.includes('hazard')) return 'avoid';
    return 'move';
  }

  private completeMovementObjective(): void {
    this.completedObjectives.add('movement');
    this.emitObjective(gameText.objectives.movementComplete, 2600);
  }

  private emitObjective(text: string, lockMs = 0): void {
    if (!text) return;
    if (text !== this.lastGuidance) {
      this.lastGuidance = text;
      this.game.events.emit(EVENTS.objectiveChanged, text);
    }
    this.objectiveLockMs = Math.max(this.objectiveLockMs, lockMs);
  }

  private playerInside(rect: RectData): boolean {
    if (!this.player) return false;
    return this.player.x >= rect.x
      && this.player.x <= rect.x + rect.width
      && this.player.y >= rect.y
      && this.player.y <= rect.y + rect.height;
  }

  private restoreProgressFromCheckpoint(): void {
    const movementDoor = levelOne.doors.find((door) => door.requiresObjective === 'movement');
    const combatDoor = levelOne.doors.find((door) => door.requiresObjective === 'combat');
    if (this.checkpoint.hasKeycard || (movementDoor && this.checkpoint.x > movementDoor.x + movementDoor.width)) {
      this.completedObjectives.add('movement');
    }
    if (this.checkpoint.hasKeycard || (combatDoor && this.checkpoint.x > combatDoor.x + combatDoor.width)) {
      this.completedObjectives.add('combat');
    }
  }

  private initialObjective(): string {
    if (this.player?.hasKeycard) return gameText.objectives.hasKeycard;
    if (this.completedObjectives.has('combat')) return gameText.guidance.reactor;
    if (this.completedObjectives.has('movement')) return gameText.guidance.hub;
    return gameText.objectives.first;
  }

  private hazardDamagePayload(hazard: Hazard): DamagePayload {
    const config = combatConfig.playerDamage.hazard;
    return {
      amount: hazard.damage,
      source: 'hazard',
      hitX: hazard.x,
      knockback: config.knockback,
      stunMs: config.stunMs,
      invulnerabilityMs: config.invulnerabilityMs,
      hitstop: config.hitstop,
      reaction: config.reaction,
      isFinisher: Boolean(this.player && this.player.health <= hazard.damage),
    };
  }

  private fallDamagePayload(): DamagePayload {
    const config = combatConfig.playerDamage.fall;
    return {
      amount: config.amount,
      source: 'fall',
      hitX: this.player?.x ?? levelOne.playerSpawn.x,
      knockback: config.knockback,
      stunMs: config.stunMs,
      invulnerabilityMs: config.invulnerabilityMs,
      hitstop: config.hitstop,
      reaction: config.reaction,
      isFinisher: true,
    };
  }
}
