import { assetKey, frameFor } from '../data/assetMap';
import { elementSprites, portalSpriteMetrics, portalVisualRect } from '../data/elementSpriteConfig';
import { enemyConfig } from '../data/enemyConfig';
import { enemySpriteProfileFor } from '../data/enemySpriteConfig';
import { fitSpriteToOpaqueRect, hasOpaqueBounds } from './spriteFit';
import { tutorialActions } from '../data/tutorialConfig';
import { type LevelData, type RectData, type SignpostData, type TutorialPromptData, type VisualTileData } from '../data/levelTypes';
import { BreakableObject } from '../entities/BreakableObject';
import { DroneEnemy } from '../entities/DroneEnemy';
import { EnemyBase } from '../entities/EnemyBase';
import { MechEnemy } from '../entities/MechEnemy';
import { Pickup } from '../entities/Pickup';
import { ScoutEnemy } from '../entities/ScoutEnemy';
import { SentinelEnemy } from '../entities/SentinelEnemy';
import { TrooperEnemy } from '../entities/TrooperEnemy';
import { COLORS, DEPTHS } from '../game/constants';

export type BuiltLevel = {
  platforms: Phaser.Physics.Arcade.StaticGroup;
  oneWayPlatforms: Phaser.Physics.Arcade.StaticGroup;
  enemies: Phaser.Physics.Arcade.Group;
  pickups: Phaser.Physics.Arcade.Group;
  breakables: Phaser.Physics.Arcade.Group;
  terminals: Phaser.GameObjects.Zone[];
  tutorialPrompts: TutorialPromptData[];
  finalPortal: Phaser.GameObjects.Zone;
};

export class LevelBuilder {
  constructor(private readonly scene: Phaser.Scene) {}

  build(data: LevelData): BuiltLevel {
    this.createBackground(data.width, data.height, data.backgroundKey);
    this.createDebugRect(data.cameraBounds, 0x7a5cff, 'camera');
    for (const zone of data.zones) this.createDebugRect(zone, 0x0c7486, zone.label);
    const platforms = this.scene.physics.add.staticGroup();
    const oneWayPlatforms = this.scene.physics.add.staticGroup();
    const solidRects = [...data.walls, ...data.platforms.filter((rect) => rect.collision !== 'oneWay')];
    const oneWayRects = data.platforms.filter((rect) => rect.collision === 'oneWay');
    const platformKeys = new Set([...solidRects, ...oneWayRects].map((rect) => this.rectKey(rect)));
    const platformVisuals = new Map(data.visualTiles.filter((visual) => visual.category === 'tiles').map((visual) => [this.rectKey(visual), visual]));

    for (const rect of solidRects) {
      const platform = this.scene.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, COLORS.steel, 0);
      this.scene.physics.add.existing(platform, true);
      platforms.add(platform);
      this.createDebugRect(rect, 0x36f6ff, rect.id ?? 'solid');
      this.renderPlatformVisual(rect, platformVisuals.get(this.rectKey(rect)));
    }
    for (const rect of oneWayRects) {
      const platform = this.scene.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, COLORS.steel, 0);
      platform.setData('oneWayPlatform', true);
      platform.setData('platformTop', rect.y);
      this.scene.physics.add.existing(platform, true);
      oneWayPlatforms.add(platform);
      this.createDebugRect(rect, 0x9dff5c, rect.id ?? 'one-way');
      this.renderPlatformVisual(rect, platformVisuals.get(this.rectKey(rect)));
    }

    for (const visual of data.visualTiles) {
      if (visual.category === 'tiles' && platformKeys.has(this.rectKey(visual))) continue;
      this.renderLooseVisual(visual);
    }
    for (const decoration of data.decorations) this.renderLooseVisual(decoration);
    for (const signpost of data.design.signposts) this.renderSignpost(signpost);
    this.renderLandmarkCues(data);

    const breakables = this.scene.physics.add.group({ allowGravity: false, immovable: true });
    for (const breakable of data.destructibles) {
      const instance = new BreakableObject(this.scene, breakable);
      breakables.add(instance);
      this.createDebugRect(breakable, 0xffc857, breakable.id);
    }

    const pickups = this.scene.physics.add.group({ allowGravity: false });
    const pickupTexture = assetKey('pickups', 'fallback-pickup');
    for (const pickup of data.pickups) {
      const frame = elementSprites.pickups[pickup.type].frame;
      pickups.add(new Pickup(this.scene, pickup.x, pickup.y, pickup.type, pickupTexture, frame));
      this.createDebugPoint(pickup.x, pickup.y, COLORS.green, pickup.id);
    }

    const enemies = this.scene.physics.add.group({ runChildUpdate: false });
    for (const enemy of data.enemies) {
      const patrolMin = enemy.patrolMin ?? enemy.x - 120;
      const patrolMax = enemy.patrolMax ?? enemy.x + 120;
      const spriteProfile = enemySpriteProfileFor(enemy.type);
      let instance: EnemyBase;
      if (enemy.type === 'drone') instance = new DroneEnemy(this.scene, enemy.x, enemy.y, spriteProfile, patrolMin, patrolMax);
      else if (enemy.type === 'mech') instance = new MechEnemy(this.scene, enemy.x, enemy.y, spriteProfile, patrolMin, patrolMax);
      else if (enemy.type === 'boss') instance = new MechEnemy(this.scene, enemy.x, enemy.y, spriteProfile, patrolMin, patrolMax, {
        health: enemyConfig.boss.health,
        sizeScale: enemyConfig.boss.sizeScale,
        detectRange: enemyConfig.boss.detectRange,
        closeRetreatDistance: enemyConfig.boss.closeRetreatDistance,
        attackStopDistance: enemyConfig.boss.attackStopDistance,
        leashDistance: enemyConfig.boss.leashDistance,
        shootCooldownMs: enemyConfig.boss.shootCooldownMs,
        windupMs: enemyConfig.boss.windupMs,
        enrageHealthFraction: enemyConfig.boss.enrageHealthFraction,
        enrageCooldownMultiplier: enemyConfig.boss.enrageCooldownMultiplier,
        droneVolley: {
          everyNthBurst: enemyConfig.boss.droneVolleyEveryNthBurst,
          count: enemyConfig.boss.droneVolleyCount,
          cooldownMultiplier: enemyConfig.boss.droneVolleyCooldownMultiplier,
        },
        stun: {
          energyThreshold: enemyConfig.boss.energyStunThreshold,
          durationMs: enemyConfig.boss.stunDurationMs,
        },
      });
      else if (enemy.type === 'scout') instance = new ScoutEnemy(this.scene, enemy.x, enemy.y, spriteProfile, patrolMin, patrolMax);
      else if (enemy.type === 'sentinel') instance = new SentinelEnemy(this.scene, enemy.x, enemy.y, spriteProfile, patrolMin, patrolMax);
      else instance = new TrooperEnemy(this.scene, enemy.x, enemy.y, spriteProfile, patrolMin, patrolMax);
      enemies.add(instance);
      this.createDebugPoint(enemy.x, enemy.y, COLORS.red, enemy.id);
    }

    const terminals = data.terminals.map((terminal) => {
      const zone = this.scene.add.zone(terminal.x, terminal.y - 50, 130, 130);
      zone.setData('message', terminal.message);
      this.scene.physics.add.existing(zone);
      (zone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      this.renderTerminal(terminal.x, terminal.y - 54);
      this.createDebugRect({ x: terminal.x - 65, y: terminal.y - 115, width: 130, height: 130, id: terminal.id }, COLORS.purple, terminal.id);
      return zone;
    });
    for (const trigger of data.triggers) this.createDebugRect(trigger, 0xffffff, trigger.id);
    for (const prompt of data.tutorialPrompts) {
      this.createDebugRect(prompt, 0x5cff9d, prompt.id);
      this.renderTutorialCue(prompt);
    }

    const finalPortal = this.scene.add.zone(data.finalPortal.x + data.finalPortal.width / 2, data.finalPortal.y + data.finalPortal.height / 2, data.finalPortal.width, data.finalPortal.height);
    this.scene.physics.add.existing(finalPortal);
    const portalBody = finalPortal.body as Phaser.Physics.Arcade.Body;
    portalBody.setAllowGravity(false);
    portalBody.setImmovable(true);
    this.renderPortal(data.finalPortal);
    this.createDebugRect(data.finalPortal, COLORS.purple, data.finalPortal.id ?? 'portal');

    return { platforms, oneWayPlatforms, enemies, pickups, breakables, terminals, tutorialPrompts: data.tutorialPrompts, finalPortal };
  }

  private createBackground(width: number, height: number, backgroundKey?: string): void {
    this.scene.add.rectangle(width / 2, height / 2, width, height, COLORS.background, 1).setDepth(DEPTHS.background);
    if (backgroundKey && this.scene.textures.exists(backgroundKey)) {
      const frame = this.scene.textures.getFrame(backgroundKey);
      const sourceWidth = frame?.width ?? 1672;
      const sourceHeight = frame?.height ?? 941;
      const scale = Math.max(height / sourceHeight, 960 / sourceWidth);
      const segmentWidth = sourceWidth * scale;
      const count = Math.ceil(width / segmentWidth) + 1;
      for (let i = 0; i < count; i += 1) {
        this.scene.add.image(segmentWidth * (i + 0.5), height / 2, backgroundKey)
          .setScale(scale)
          .setAlpha(0.44)
          .setDepth(DEPTHS.background + 1)
          .setScrollFactor(0.88, 1);
      }
      this.scene.add.rectangle(width / 2, height / 2, width, height, COLORS.background, 0.32).setDepth(DEPTHS.background + 2);
    }
    for (let x = 160; x < width; x += 320) {
      const alpha = x % 640 === 0 ? 0.22 : 0.12;
      this.scene.add.rectangle(x, height / 2, 2, height, COLORS.cyanDark, alpha).setDepth(DEPTHS.background + 3);
    }
    for (let y = 250; y < height; y += 260) {
      this.scene.add.rectangle(width / 2, y, width, 2, COLORS.cyanDark, 0.08).setDepth(DEPTHS.background + 3);
    }
  }

  private renderPlatformVisual(rect: RectData, visual?: VisualTileData): void {
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    const isCeiling = rect.id === 'wall-ceiling' || (rect.type === 'wall' && rect.width > rect.height * 4);
    const isWall = !isCeiling && rect.width <= 70 && rect.height > 180;
    const isGround = isCeiling || rect.height >= 70;
    const frame = isWall ? frameFor.wall : isCeiling ? frameFor.floor : visual?.frame ?? (isGround ? frameFor.floor : frameFor.ledge);

    const key = assetKey('tiles', '');
    if (!key || !this.scene.textures.exists(key)) {
      this.scene.add.rectangle(x, y, rect.width, rect.height, COLORS.steel, 0.9).setStrokeStyle(1, COLORS.cyanDark, 0.5).setDepth(DEPTHS.terrain);
      return;
    }

    this.scene.add.rectangle(x, y, rect.width, rect.height, COLORS.darkSteel, isWall ? 0.045 : 0.028).setDepth(DEPTHS.terrain - 1);

    if (isWall) {
      const count = Math.max(1, Math.ceil(rect.height / 150));
      for (let i = 0; i < count; i += 1) {
        const segmentHeight = rect.height / count;
        const sprite = this.scene.add.sprite(x, rect.y + segmentHeight * (i + 0.5), key, frame);
        fitSpriteToOpaqueRect(sprite, 'tiles', frame, { x: rect.x, y: rect.y + segmentHeight * i, width: rect.width, height: segmentHeight }, 'cover');
        sprite.setAlpha(0.98).setDepth(DEPTHS.terrain);
      }
      return;
    }

    if (isGround) {
      const count = Math.max(1, Math.ceil(rect.width / 190));
      const verticalAlign = rect.y <= 1 ? 'bottom' : 'top';
      for (let i = 0; i < count; i += 1) {
        const segmentWidth = rect.width / count;
        const spriteFrame = isCeiling ? frameFor.floor : i % 2 === 0 ? frame : frameFor.floorPanel;
        const sprite = this.scene.add.sprite(rect.x + segmentWidth * (i + 0.5), y, key, spriteFrame);
        fitSpriteToOpaqueRect(sprite, 'tiles', spriteFrame, { x: rect.x + segmentWidth * i, y: rect.y, width: segmentWidth, height: rect.height }, 'cover', verticalAlign);
        sprite.setAlpha(0.98).setDepth(DEPTHS.terrain);
      }
      return;
    }

    const count = rect.width <= 280 ? 1 : Math.max(1, Math.ceil(rect.width / 180));
    for (let i = 0; i < count; i += 1) {
      const segmentWidth = rect.width / count;
      const spriteFrame = visual?.frame ?? (i === 0 || i === count - 1 ? frameFor.ledgeHeavy : frame);
      const sprite = this.scene.add.sprite(rect.x + segmentWidth * (i + 0.5), rect.y + rect.height / 2, key, spriteFrame);
      fitSpriteToOpaqueRect(sprite, 'tiles', spriteFrame, { x: rect.x + segmentWidth * i, y: rect.y, width: segmentWidth, height: Math.max(rect.height + 42, 72) }, 'cover', 'top');
      sprite.setAlpha(0.99).setDepth(DEPTHS.terrain);
    }
  }

  private renderLooseVisual(visual: VisualTileData): void {
    const key = visual.category ? assetKey(visual.category, '') : '';
    const x = visual.x + visual.width / 2;
    const y = visual.y + visual.height / 2;
    if (key && this.scene.textures.exists(key)) {
      const frame = visual.frame ?? 0;
      const sprite = this.scene.add.sprite(x, y, key, frame);
      const decorativeProp = visual.category === 'props';
      const decorativeInteractable = visual.category === 'interactables';
      if (hasOpaqueBounds(visual.category, frame)) {
        const align = visual.category === 'props' || visual.category === 'destructibles' || visual.category === 'interactables' ? 'bottom' : 'center';
        fitSpriteToOpaqueRect(sprite, visual.category, frame, visual, 'contain', align);
      } else {
        this.fitSprite(sprite, visual.width, visual.height, 'contain');
      }
      sprite
        .setAlpha(decorativeProp ? 0.18 : decorativeInteractable ? 0.3 : 0.82)
        .setDepth(decorativeProp || decorativeInteractable ? DEPTHS.decorations : DEPTHS.terrain);
      if (visual.tint) sprite.setTint(visual.tint);
      else if (decorativeProp) sprite.setTint(0x7f98a0);
      return;
    }
    this.scene.add.rectangle(x, y, visual.width, visual.height, visual.tint ?? COLORS.darkSteel, 0.14).setDepth(DEPTHS.decorations);
  }

  private renderSignpost(signpost: SignpostData): void {
    const x = signpost.x + signpost.width / 2;
    const y = signpost.y + signpost.height / 2;
    const alphaByIntensity = { subtle: 0.12, normal: 0.2, strong: 0.28 };
    const colorByRole = {
      criticalPath: COLORS.cyan,
      danger: COLORS.red,
      reward: COLORS.green,
      shortcut: COLORS.amber,
      exit: COLORS.purple,
    };
    const color = colorByRole[signpost.role];
    const alpha = alphaByIntensity[signpost.intensity ?? 'normal'];
    this.scene.add.rectangle(x, y, signpost.width, signpost.height, color, alpha)
      .setDepth(DEPTHS.decorations + 1);
    const direction = signpost.direction ?? 1;
    const chevrons = Math.max(1, Math.floor(signpost.width / 48));
    for (let i = 0; i < chevrons; i += 1) {
      const chevronX = signpost.x + 28 + i * 48;
      const marker = this.scene.add.triangle(
        chevronX,
        y,
        direction > 0 ? 0 : 22,
        0,
        direction > 0 ? 22 : 0,
        signpost.height / 2,
        direction > 0 ? 0 : 22,
        signpost.height,
        color,
        alpha + 0.12,
      );
      marker.setDepth(DEPTHS.decorations + 2);
    }
  }

  private renderLandmarkCues(data: LevelData): void {
    const targets = new Map<string, RectData>();
    const addPoint = (id: string, x: number, y: number, width = 96, height = 96): void => {
      targets.set(id, { id, x: x - width / 2, y: y - height / 2, width, height });
    };
    const addRect = (rect: RectData & { id: string }): void => {
      targets.set(rect.id, rect);
    };

    for (const terminal of data.terminals) addPoint(terminal.id, terminal.x, terminal.y - 54, 118, 132);
    for (const pickup of data.pickups) addPoint(pickup.id, pickup.x, pickup.y, 82, 82);
    for (const destructible of data.destructibles) addRect(destructible);
    addRect(data.finalPortal as RectData & { id: string });

    for (const landmarkId of data.design.landmarks) {
      const target = targets.get(landmarkId);
      if (!target) continue;
      const x = target.x + target.width / 2;
      const y = target.y + target.height / 2;
      const width = Math.max(target.width + 52, 110);
      const height = Math.max(target.height + 36, 82);
      const cue = this.scene.add.ellipse(x, y, width, height)
        .setStrokeStyle(2, COLORS.cyan, 0.16)
        .setFillStyle(COLORS.cyanDark, 0.035)
        .setDepth(DEPTHS.decorations + 2);
      this.scene.tweens.add({
        targets: cue,
        alpha: 0.55,
        yoyo: true,
        repeat: -1,
        duration: 1400,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private renderTutorialCue(prompt: TutorialPromptData): void {
    if (!prompt.actionId) return;
    const action = tutorialActions[prompt.actionId];
    const x = prompt.x + prompt.width / 2;
    const y = Math.max(prompt.y + 24, prompt.y + prompt.height * 0.22);
    const bg = this.scene.add.rectangle(x, y, 72, 28, COLORS.darkSteel, 0.34)
      .setStrokeStyle(1, COLORS.cyan, 0.22)
      .setDepth(DEPTHS.decorations + 3);
    const text = this.scene.add.text(x, y, action.keyboard, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '13px',
      color: '#9beef4',
      stroke: '#031014',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTHS.decorations + 4);
    this.scene.tweens.add({
      targets: [bg, text],
      alpha: 0.46,
      yoyo: true,
      repeat: -1,
      duration: 1250,
      ease: 'Sine.easeInOut',
    });
  }

  private renderTerminal(x: number, y: number): void {
    const key = assetKey('interactables', '');
    const glow = this.scene.add.rectangle(x, y + 16, 50, 80, COLORS.cyan, 0.08).setStrokeStyle(1, COLORS.cyan, 0.24).setDepth(DEPTHS.decorations + 1);
    if (key && this.scene.textures.exists(key)) {
      const frame = elementSprites.interactables.terminal.frame;
      const sprite = this.scene.add.sprite(x, y, key, frame);
      fitSpriteToOpaqueRect(sprite, 'interactables', frame, { x: x - 42, y: y - 48, width: 84, height: 96 }, 'contain', 'bottom');
      sprite.setAlpha(0.72).setDepth(DEPTHS.decorations + 2);
    }
    this.scene.tweens.add({ targets: glow, alpha: 0.16, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
  }

  private renderPortal(portal: RectData): void {
    const x = portal.x + portal.width / 2;
    const y = portal.y + portal.height / 2;
    const backGlow = this.scene.add.ellipse(
      x,
      y,
      portal.width + portalSpriteMetrics.ringPaddingX,
      portal.height + portalSpriteMetrics.ringPaddingY,
      COLORS.purple,
      0.07,
    ).setDepth(DEPTHS.effects - 2);
    const ringOuter = this.scene.add.ellipse(x, y, portal.width + 64, portal.height + 38)
      .setStrokeStyle(2, COLORS.cyan, 0.32)
      .setDepth(DEPTHS.effects - 1);
    const ringInner = this.scene.add.ellipse(x, y, portal.width + 24, portal.height - 16)
      .setStrokeStyle(1, COLORS.purple, 0.34)
      .setDepth(DEPTHS.effects - 1);
    const key = assetKey('doors', '');
    if (key && this.scene.textures.exists(key)) {
      const frame = elementSprites.doors.portal.frame;
      const sprite = this.scene.add.sprite(x, y, key, frame);
      const target = portalVisualRect(portal);
      fitSpriteToOpaqueRect(sprite, 'doors', frame, target, 'cover');
      sprite.setAlpha(0.86).setDepth(DEPTHS.effects);
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0.62,
        scaleX: sprite.scaleX * 1.035,
        scaleY: sprite.scaleY * 1.035,
        yoyo: true,
        repeat: -1,
        duration: 1100,
        ease: 'Sine.easeInOut',
      });
    }
    this.scene.tweens.add({ targets: backGlow, alpha: 0.13, scaleX: 1.06, scaleY: 1.03, yoyo: true, repeat: -1, duration: 980, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({ targets: ringOuter, alpha: 0.58, scaleX: 1.05, scaleY: 1.03, yoyo: true, repeat: -1, duration: 1260, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({ targets: ringInner, alpha: 0.18, scaleX: 0.95, scaleY: 0.98, yoyo: true, repeat: -1, duration: 920, ease: 'Sine.easeInOut' });
    for (let i = 0; i < 7; i += 1) {
      const angle = (Math.PI * 2 * i) / 7;
      const particle = this.scene.add.circle(
        x + Math.cos(angle) * (portal.width * 0.42),
        y + Math.sin(angle) * (portal.height * 0.37),
        2 + (i % 2),
        COLORS.cyan,
        0.42,
      ).setDepth(DEPTHS.effects + 1).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: particle,
        alpha: 0.08,
        x: x + Math.cos(angle + 0.45) * (portal.width * 0.56),
        y: y + Math.sin(angle + 0.45) * (portal.height * 0.43),
        duration: 900 + i * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private fitSprite(sprite: Phaser.GameObjects.Sprite, maxWidth: number, maxHeight: number, mode: 'contain' | 'cover'): void {
    const frame = sprite.frame;
    const scaleX = maxWidth / frame.width;
    const scaleY = maxHeight / frame.height;
    const scale = mode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
    sprite.setScale(scale);
  }

  private rectKey(rect: RectData): string {
    return `${rect.x},${rect.y},${rect.width},${rect.height}`;
  }

  private createDebugRect(rect: RectData, color: number, label: string): void {
    const shape = this.scene.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, color, 0.08)
      .setStrokeStyle(1, color, 0.75)
      .setDepth(DEPTHS.ui + 40)
      .setVisible(false);
    shape.setData('debug-visual', true);
    const text = this.scene.add.text(rect.x + 3, rect.y + 3, label, {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#ffffff',
      stroke: '#031014',
      strokeThickness: 2,
    }).setDepth(DEPTHS.ui + 41).setVisible(false);
    text.setData('debug-visual', true);
  }

  private createDebugPoint(x: number, y: number, color: number, label: string): void {
    const marker = this.scene.add.rectangle(x, y, 12, 12, color, 0.78)
      .setStrokeStyle(1, 0xffffff, 0.75)
      .setDepth(DEPTHS.ui + 42)
      .setVisible(false);
    marker.setData('debug-visual', true);
    const text = this.scene.add.text(x + 8, y - 8, label, {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#ffffff',
      stroke: '#031014',
      strokeThickness: 2,
    }).setDepth(DEPTHS.ui + 43).setVisible(false);
    text.setData('debug-visual', true);
  }
}
