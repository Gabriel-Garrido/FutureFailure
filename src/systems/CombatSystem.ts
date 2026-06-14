import { combatConfig, type DamagePayload, type HitstopConfig } from '../data/combatConfig';
import { BreakableObject } from '../entities/BreakableObject';
import { EnemyBase } from '../entities/EnemyBase';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { COLORS, EVENTS } from '../game/constants';

export class CombatSystem {
  private hitstopReset?: ReturnType<typeof globalThis.setTimeout>;

  constructor(private readonly scene: Phaser.Scene) {
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cancelHitstop());
  }

  connect(
    player: Player,
    enemies: Phaser.Physics.Arcade.Group,
    breakables: Phaser.Physics.Arcade.Group,
    enemyProjectiles: Phaser.Physics.Arcade.Group,
    playerProjectiles: Phaser.Physics.Arcade.Group,
  ): void {
    this.scene.physics.add.overlap(player.attackZone, enemies, (_zone, enemyObject) => {
      const enemy = enemyObject as EnemyBase;
      const payload = player.currentAttackPayload();
      if (payload && player.canHitAttack(enemy) && !enemy.isDead()) {
        player.markAttackHit(enemy);
        const killed = enemy.takeDamage(payload);
        this.hitstop(killed ? payload.defeatHitstop ?? payload.hitstop : payload.hitstop);
      }
    });

    this.scene.physics.add.overlap(player.attackZone, breakables, (_zone, breakableObject) => {
      const breakable = breakableObject as unknown as BreakableObject;
      const payload = player.currentAttackPayload();
      if (payload && player.canHitAttack(breakable) && breakable.active) {
        player.markAttackHit(breakable);
        const broken = breakable.hit(payload);
        this.scene.events.emit(EVENTS.enemyDamaged, breakable.x, breakable.y, player.movement.state.facing, payload);
        this.hitstop(broken ? payload.defeatHitstop ?? payload.hitstop : payload.hitstop);
      }
    });

    this.scene.physics.add.overlap(player.attackZone, enemyProjectiles, (_zone, projectileObject) => {
      const projectile = projectileObject as Projectile;
      const payload = player.currentAttackPayload();
      if (!payload || !projectile.active || projectile.fromPlayer || !player.canHitAttack(projectile)) return;
      player.markAttackHit(projectile);
      this.deflectEnemyProjectile(player, projectile);
      this.scene.events.emit(EVENTS.enemyDamaged, projectile.x, projectile.y, player.movement.state.facing, payload);
      this.hitstop(combatConfig.projectile.deflect.hitstop);
    });

    this.scene.physics.add.overlap(player, enemies, (_playerObject, enemyObject) => {
      const enemy = enemyObject as EnemyBase;
      if (enemy.isDead()) return;
      const payload = this.enemyContactPayload(player, enemy);
      this.applyPlayerDamage(player, payload);
    });

    this.scene.physics.add.overlap(enemyProjectiles, player.projectileHurtZone, (objectA, objectB) => {
      // Group-vs-single overlaps hand the arguments back as (hurtZone, projectile),
      // so resolve the projectile by type instead of relying on argument order.
      const projectile = (objectA instanceof Projectile ? objectA : objectB) as Projectile;
      if (!projectile.active || projectile.fromPlayer) return;
      const projectileBody = projectile.body as Phaser.Physics.Arcade.Body;
      const projectileRadius = Math.max(projectileBody.halfWidth, projectileBody.halfHeight) * 0.8;
      if (!player.isProjectilePointInsideDamageArea(projectile.x, projectile.y, projectileRadius)) return;
      if (!projectile.consumeImpact()) return;
      const payload = this.enemyProjectilePayload(projectile);
      projectile.kill();
      this.applyPlayerDamage(player, payload);
    });

    this.scene.physics.add.overlap(enemyProjectiles, enemies, (projectileObject, enemyObject) => {
      const projectile = projectileObject as Projectile;
      const enemy = enemyObject as EnemyBase;
      if (!projectile.active || !projectile.fromPlayer || enemy.isDead()) return;
      if (!projectile.consumeImpact()) return;
      const payload = this.deflectedProjectilePayload(projectile);
      projectile.kill();
      const killed = enemy.takeDamage(payload);
      this.hitstop(killed ? payload.defeatHitstop ?? payload.hitstop : payload.hitstop);
    });

    this.scene.physics.add.overlap(playerProjectiles, enemies, (projectileObject, enemyObject) => {
      const projectile = projectileObject as Projectile;
      const enemy = enemyObject as EnemyBase;
      if (!projectile.active || enemy.isDead()) return;
      const payload = this.playerProjectilePayload(projectile);
      projectile.kill();
      const killed = enemy.takeDamage(payload);
      this.hitstop(killed ? payload.defeatHitstop ?? payload.hitstop : payload.hitstop);
    });

    this.scene.physics.add.overlap(playerProjectiles, breakables, (projectileObject, breakableObject) => {
      const projectile = projectileObject as Projectile;
      const breakable = breakableObject as unknown as BreakableObject;
      if (!projectile.active) return;
      const payload = this.playerProjectilePayload(projectile);
      projectile.kill();
      if (breakable.active) {
        const broken = breakable.hit(payload);
        this.scene.events.emit(EVENTS.enemyDamaged, breakable.x, breakable.y, Math.sign(projectile.x - breakable.x) >= 0 ? 1 : -1, payload);
        this.hitstop(broken ? payload.defeatHitstop ?? payload.hitstop : payload.hitstop);
      }
    });
  }

  private hitstop(config: HitstopConfig): void {
    if (config.durationMs <= 0 || config.timeScale >= 1) return;
    if (this.hitstopReset) globalThis.clearTimeout(this.hitstopReset);
    this.scene.events.emit(EVENTS.combatHitstop, config);
    this.scene.time.timeScale = config.timeScale;
    this.hitstopReset = globalThis.setTimeout(() => {
      this.scene.time.timeScale = 1;
      this.hitstopReset = undefined;
    }, config.durationMs);
  }

  private cancelHitstop(): void {
    if (this.hitstopReset) globalThis.clearTimeout(this.hitstopReset);
    this.hitstopReset = undefined;
    this.scene.time.timeScale = 1;
  }

  private applyPlayerDamage(player: Player, payload: DamagePayload): boolean {
    if (payload.source === 'enemyProjectile') this.cancelHitstop();
    const applied = player.takeDamage(payload);
    if (!applied) return false;
    if (payload.reaction?.allowGlobalHitstop !== false) this.hitstop(payload.hitstop);
    return true;
  }

  private playerProjectilePayload(projectile: Projectile): DamagePayload {
    const config = combatConfig.projectile.player;
    return {
      amount: projectile.damage,
      source: 'playerProjectile',
      hitX: projectile.x,
      knockback: config.knockback,
      stunMs: config.stunMs,
      hitstop: config.hitstop,
      defeatHitstop: config.defeatHitstop,
    };
  }

  private deflectedProjectilePayload(projectile: Projectile): DamagePayload {
    const config = combatConfig.projectile.deflect;
    return {
      amount: projectile.damage,
      source: 'deflectedProjectile',
      hitX: projectile.x,
      hitId: projectile.hitId,
      knockback: config.knockback,
      stunMs: config.stunMs,
      hitstop: config.hitstop,
      defeatHitstop: config.defeatHitstop,
    };
  }

  private enemyProjectilePayload(projectile: Projectile): DamagePayload {
    const config = combatConfig.projectile.enemy;
    return {
      amount: projectile.damage,
      source: 'enemyProjectile',
      hitX: projectile.x,
      hitId: projectile.hitId,
      knockback: config.knockback,
      stunMs: config.stunMs,
      invulnerabilityMs: config.invulnerabilityMs,
      hitstop: config.hitstop,
      reaction: config.reaction,
    };
  }

  private enemyContactPayload(player: Player, enemy: EnemyBase): DamagePayload {
    const config = combatConfig.playerDamage.contact;
    return {
      amount: config.amount,
      source: 'enemyContact',
      hitX: enemy.x,
      knockback: config.knockback,
      stunMs: config.stunMs,
      invulnerabilityMs: config.invulnerabilityMs,
      hitstop: config.hitstop,
      reaction: config.reaction,
      isFinisher: player.health <= config.amount,
    };
  }

  private deflectEnemyProjectile(player: Player, projectile: Projectile): void {
    const config = combatConfig.projectile.deflect;
    const velocity = this.reflectedVelocity(player, projectile, config.speed);
    projectile.deflect(velocity.x, velocity.y, COLORS.cyan, config.amount);
  }

  private reflectedVelocity(player: Player, projectile: Projectile, speed: number): Phaser.Math.Vector2 {
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    const incoming = new Phaser.Math.Vector2(body.velocity.x, body.velocity.y);
    if (incoming.lengthSq() <= 1) return new Phaser.Math.Vector2(player.movement.state.facing * speed, 0);
    return incoming.negate().normalize().scale(speed);
  }
}
