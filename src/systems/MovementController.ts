import { type DamageReactionConfig, type KnockbackConfig } from '../data/combatConfig';
import { type MovementFeelConfig } from '../data/movementFeelConfig';
import { EVENTS } from '../game/constants';
import { type InputSnapshot } from './InputSystem';

export type MovementState = {
  facing: 1 | -1;
  grounded: boolean;
  dashing: boolean;
  wallSliding: boolean;
  hitstun: boolean;
  invulnerable: boolean;
  dead: boolean;
  jumping: boolean;
  falling: boolean;
  cornerCorrecting: boolean;
  groundSnapping: boolean;
  dashAvailable: boolean;
  dashRecovering: boolean;
};

type ContactSnapshot = {
  grounded: boolean;
  touchingWall: boolean;
  wallDir: 1 | -1;
};

type ResolvedInput = {
  moveX: number;
  jumpPressed: boolean;
  jumpDown: boolean;
  dashPressed: boolean;
};

export class MovementController {
  readonly state: MovementState = {
    facing: 1,
    grounded: false,
    dashing: false,
    wallSliding: false,
    hitstun: false,
    invulnerable: false,
    dead: false,
    jumping: false,
    falling: false,
    cornerCorrecting: false,
    groundSnapping: false,
    dashAvailable: true,
    dashRecovering: false,
  };

  private coyoteMs = 0;
  private wallCoyoteMs = 0;
  private wallCoyoteDir: 1 | -1 = 1;
  private jumpBufferMs = 0;
  private dashMs = 0;
  private dashBufferMs = 0;
  private dashCooldownMs = 0;
  private dashRecoverMs = 0;
  private dashControlLockMs = 0;
  private airDashesRemaining: number;
  private hitstunMs = 0;
  private invulnerabilityMs = 0;
  private wallJumpLockMs = 0;
  private groundSnapMs = 0;
  private lastInputX: 1 | -1 = 1;
  private jumpCutApplied = false;
  private dashDirection: 1 | -1 = 1;

  constructor(
    private readonly sprite: Phaser.Physics.Arcade.Sprite,
    private readonly config: MovementFeelConfig,
  ) {
    this.airDashesRemaining = config.dashAirUses;
    this.body.setAllowGravity(false);
    this.body.setMaxVelocity(Math.max(config.dashSpeed, config.wallJumpVelocityX) + 140, config.maxFallSpeed);
    this.body.setBounce(0, 0);
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  update(deltaMs: number, input: InputSnapshot): void {
    const dt = deltaMs / 1000;
    const wasGrounded = this.state.grounded;
    const wasWallSliding = this.state.wallSliding;
    const contacts = this.resolveContacts();
    const resolvedInput = this.resolveInput(input);

    this.state.grounded = contacts.grounded;
    this.state.cornerCorrecting = false;
    this.state.groundSnapping = false;

    if (this.state.dead) {
      this.body.setVelocityX(0);
      this.applyGravity(dt, false);
      this.refreshDerivedState();
      return;
    }

    this.tickTimers(deltaMs);
    this.updateFacing(resolvedInput.moveX);
    this.updateForgiveness(contacts, resolvedInput);

    if (this.hitstunMs > 0) {
      this.applyGravity(dt, resolvedInput.jumpDown);
      this.refreshDerivedState();
      return;
    }

    this.resolveDash(resolvedInput.moveX);
    if (this.state.dashing) {
      this.updateDash(deltaMs);
      this.refreshDerivedState();
      return;
    }

    this.applyHorizontal(dt, resolvedInput.moveX);
    this.resolveWallSlide(contacts, resolvedInput.moveX);
    this.resolveJump();
    this.applyVariableJump(resolvedInput.jumpDown);
    this.tryCornerCorrection(resolvedInput.moveX);
    this.applyGravity(dt, resolvedInput.jumpDown);
    this.applyWallSlideClamp();
    this.applyGroundSnap(resolvedInput.jumpDown);
    this.refreshDerivedState();
    this.emitTransitions(wasGrounded, wasWallSliding);
  }

  damageKnockback(
    fromX: number,
    knockback: KnockbackConfig = { enabled: true, x: this.config.damageKnockbackX, y: this.config.damageKnockbackY },
    hitstunMs = this.config.hitstunMs,
    invulnerabilityMs = this.config.invulnerabilityMs,
    reaction?: DamageReactionConfig,
  ): void {
    if (this.invulnerabilityMs > 0 || this.state.dead) return;
    const dir = this.sprite.x >= fromX ? 1 : -1;
    this.startDamageRecovery(hitstunMs, invulnerabilityMs, true, reaction);
    this.body.setVelocity(knockback.x * dir, knockback.y);
  }

  damageWithoutKnockback(hitstunMs = 80, invulnerabilityMs = this.config.invulnerabilityMs, reaction?: DamageReactionConfig): void {
    if (this.invulnerabilityMs > 0 || this.state.dead) return;
    this.startDamageRecovery(hitstunMs, invulnerabilityMs, false, reaction);
  }

  kill(): void {
    this.state.dead = true;
    this.state.dashing = false;
    this.dashMs = 0;
    this.dashRecoverMs = 0;
    this.body.setVelocity(0, -280);
    this.sprite.setTint(0xff355f);
  }

  respawn(x: number, y: number): void {
    this.state.dead = false;
    this.state.dashing = false;
    this.state.hitstun = false;
    this.state.invulnerable = false;
    this.state.wallSliding = false;
    this.state.cornerCorrecting = false;
    this.state.groundSnapping = false;
    this.coyoteMs = 0;
    this.wallCoyoteMs = 0;
    this.jumpBufferMs = 0;
    this.dashMs = 0;
    this.dashBufferMs = 0;
    this.dashCooldownMs = 0;
    this.dashRecoverMs = 0;
    this.dashControlLockMs = 0;
    this.airDashesRemaining = this.config.dashAirUses;
    this.hitstunMs = 0;
    this.invulnerabilityMs = 900;
    this.wallJumpLockMs = 0;
    this.groundSnapMs = 0;
    this.sprite.clearTint();
    this.sprite.setPosition(x, y);
    this.body.setVelocity(0, 0);
    this.refreshDerivedState();
  }

  private resolveContacts(): ContactSnapshot {
    const body = this.body;
    const touchingLeft = body.blocked.left || body.touching.left;
    const touchingRight = body.blocked.right || body.touching.right;
    return {
      grounded: body.blocked.down || body.touching.down,
      touchingWall: touchingLeft || touchingRight,
      wallDir: touchingLeft ? -1 : 1,
    };
  }

  private resolveInput(input: InputSnapshot): ResolvedInput {
    const moveX = Math.abs(input.moveX) > this.config.inputDeadzone ? Phaser.Math.Clamp(input.moveX, -1, 1) : 0;
    return {
      moveX,
      jumpPressed: input.jumpPressed,
      jumpDown: input.jumpDown,
      dashPressed: input.dashPressed,
    };
  }

  private updateFacing(moveX: number): void {
    if (moveX === 0) return;
    this.lastInputX = moveX > 0 ? 1 : -1;
    this.state.facing = this.lastInputX;
    this.sprite.setFlipX(this.state.facing < 0);
  }

  private updateForgiveness(contacts: ContactSnapshot, input: ResolvedInput): void {
    if (contacts.grounded) {
      this.coyoteMs = this.config.coyoteTimeMs;
      this.airDashesRemaining = this.config.dashAirUses;
      this.state.wallSliding = false;
      this.jumpCutApplied = false;
      this.groundSnapMs = this.config.groundSnapMs;
    } else {
      this.groundSnapMs = Math.max(0, this.groundSnapMs);
    }

    if (!contacts.grounded && contacts.touchingWall) {
      this.wallCoyoteMs = this.config.wallCoyoteTimeMs;
      this.wallCoyoteDir = contacts.wallDir;
    }

    if (input.jumpPressed) this.jumpBufferMs = this.config.jumpBufferMs;
    if (input.dashPressed) this.dashBufferMs = this.config.dashBufferMs;
  }

  private resolveDash(moveX: number): void {
    if (this.dashBufferMs > 0 && this.canDash()) {
      this.startDash(this.resolveDashDirection(moveX));
    }
  }

  private updateDash(deltaMs: number): void {
    this.dashMs -= deltaMs;
    this.body.setVelocity(this.config.dashSpeed * this.dashDirection, 0);
    if (this.dashMs > 0) return;
    this.finishDash();
  }

  private finishDash(): void {
    this.state.dashing = false;
    this.dashMs = 0;
    this.dashRecoverMs = this.config.dashRecoverMs;
    this.dashControlLockMs = this.config.dashEndControlLockMs;
    this.body.setVelocity(this.config.dashEndSpeed * this.dashDirection, 0);
    this.sprite.scene.events.emit(EVENTS.playerDashEnded, this.sprite.x, this.sprite.y, this.dashDirection);
  }

  private resolveWallSlide(contacts: ContactSnapshot, moveX: number): void {
    const pressingIntoWall = Math.abs(moveX) > this.config.wallSlideInputGrace && Math.sign(moveX) === contacts.wallDir;
    this.state.wallSliding = !this.state.grounded
      && contacts.touchingWall
      && pressingIntoWall
      && this.body.velocity.y > 0
      && !this.state.dashing;
  }

  private resolveJump(): void {
    if (this.jumpBufferMs <= 0) return;
    if (this.coyoteMs > 0) {
      this.startGroundJump();
      return;
    }
    if (this.state.wallSliding || this.wallCoyoteMs > 0) {
      this.startWallJump(this.state.wallSliding ? this.resolveContacts().wallDir : this.wallCoyoteDir);
    }
  }

  private startGroundJump(): void {
    this.body.setVelocityY(this.config.jumpVelocity);
    this.jumpCutApplied = false;
    this.coyoteMs = 0;
    this.jumpBufferMs = 0;
    this.groundSnapMs = 0;
  }

  private startWallJump(wallDir: 1 | -1): void {
    const jumpFacing = -wallDir as 1 | -1;
    this.body.setVelocity(this.config.wallJumpVelocityX * jumpFacing, this.config.wallJumpVelocityY);
    this.wallJumpLockMs = this.config.wallJumpLockMs;
    this.wallCoyoteMs = 0;
    this.coyoteMs = 0;
    this.state.facing = jumpFacing;
    this.sprite.setFlipX(this.state.facing < 0);
    this.jumpCutApplied = false;
    this.jumpBufferMs = 0;
    this.groundSnapMs = 0;
    this.state.wallSliding = false;
    this.sprite.scene.events.emit(EVENTS.playerWallJump, this.sprite.x, this.sprite.y, jumpFacing);
  }

  private applyVariableJump(jumpDown: boolean): void {
    if (!jumpDown && this.body.velocity.y < 0 && !this.jumpCutApplied) {
      this.body.setVelocityY(this.body.velocity.y * this.config.variableJumpCutMultiplier);
      this.jumpCutApplied = true;
    }
  }

  private tryCornerCorrection(moveX: number): void {
    const body = this.body;
    const hitCeiling = body.blocked.up || body.touching.up;
    if (!hitCeiling || this.state.grounded || body.velocity.y > this.config.cornerCorrectionMaxUpSpeed) return;
    const direction = Math.abs(moveX) > this.config.inputDeadzone ? Math.sign(moveX) : this.state.facing;
    const step = this.config.cornerCorrectionPixels / Math.max(1, this.config.cornerCorrectionChecks);
    this.sprite.x += step * direction;
    this.state.cornerCorrecting = true;
    if (body.velocity.y <= 0) body.setVelocityY(Math.max(body.velocity.y, 18));
  }

  private applyGroundSnap(jumpDown: boolean): void {
    const body = this.body;
    if (
      this.state.grounded
      || this.state.dashing
      || this.state.wallSliding
      || jumpDown
      || this.groundSnapMs <= 0
      || this.coyoteMs <= 0
      || body.velocity.y < -12
    ) {
      return;
    }
    body.setVelocityY(Math.max(body.velocity.y, this.config.groundSnapVelocity));
    this.state.groundSnapping = true;
  }

  private applyHorizontal(dt: number, moveX: number): void {
    const body = this.body;
    const onGround = this.state.grounded;
    const lockDir = Math.sign(body.velocity.x);
    const lockedAgainstWallJump = this.wallJumpLockMs > 0 && !onGround && lockDir !== 0 && Math.sign(moveX) !== 0 && Math.sign(moveX) !== lockDir;
    const lockedAfterDash = this.dashControlLockMs > 0 && Math.sign(moveX) !== 0 && Math.sign(moveX) !== this.dashDirection;
    const appliedMoveX = lockedAgainstWallJump || lockedAfterDash ? 0 : moveX;
    const nearApex = !onGround && Math.abs(body.velocity.y) < this.config.apexThreshold;
    const airMultiplier = nearApex ? this.config.apexAirControlMultiplier : 1;
    const acceleration = onGround ? this.config.groundAcceleration : this.config.airAcceleration * airMultiplier;
    const deceleration = onGround ? this.config.groundDeceleration : this.config.airDeceleration * airMultiplier;

    if (Math.abs(appliedMoveX) > this.config.inputDeadzone) {
      const target = appliedMoveX * this.config.maxRunSpeed;
      const turning = Math.abs(body.velocity.x) > 24 && Math.sign(body.velocity.x) !== Math.sign(target);
      const accel = acceleration * (turning ? this.config.turnaroundAccelerationMultiplier : 1);
      body.setVelocityX(this.moveTowards(body.velocity.x, target, accel * dt));
    } else {
      body.setVelocityX(this.moveTowards(body.velocity.x, 0, deceleration * dt));
    }
  }

  private applyGravity(dt: number, jumpDown: boolean): void {
    const body = this.body;
    if (this.state.grounded && body.velocity.y >= 0) {
      body.setVelocityY(25);
      return;
    }
    if ((body.blocked.up || body.touching.up) && body.velocity.y <= 0 && !this.state.cornerCorrecting) {
      body.setVelocityY(32);
      this.jumpCutApplied = true;
      return;
    }
    const nearApex = Math.abs(body.velocity.y) < this.config.apexThreshold && jumpDown;
    const gravity = nearApex ? this.config.apexGravity : body.velocity.y < 0 ? this.config.gravityUp : this.config.gravityDown;
    body.setVelocityY(Phaser.Math.Clamp(body.velocity.y + gravity * dt, -9999, this.config.maxFallSpeed));
  }

  private applyWallSlideClamp(): void {
    if (this.state.wallSliding && this.body.velocity.y > this.config.wallSlideMaxSpeed) {
      this.body.setVelocityY(this.config.wallSlideMaxSpeed);
    }
  }

  private tickTimers(deltaMs: number): void {
    this.coyoteMs = Math.max(0, this.coyoteMs - deltaMs);
    this.wallCoyoteMs = Math.max(0, this.wallCoyoteMs - deltaMs);
    this.jumpBufferMs = Math.max(0, this.jumpBufferMs - deltaMs);
    this.dashBufferMs = Math.max(0, this.dashBufferMs - deltaMs);
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - deltaMs);
    this.dashRecoverMs = Math.max(0, this.dashRecoverMs - deltaMs);
    this.dashControlLockMs = Math.max(0, this.dashControlLockMs - deltaMs);
    this.hitstunMs = Math.max(0, this.hitstunMs - deltaMs);
    this.invulnerabilityMs = Math.max(0, this.invulnerabilityMs - deltaMs);
    this.wallJumpLockMs = Math.max(0, this.wallJumpLockMs - deltaMs);
    this.groundSnapMs = Math.max(0, this.groundSnapMs - deltaMs);
    this.state.hitstun = this.hitstunMs > 0;
    this.state.invulnerable = this.invulnerabilityMs > 0;
  }

  private startDamageRecovery(hitstunMs: number, invulnerabilityMs: number, cancelMovement: boolean, reaction?: DamageReactionConfig): void {
    const resolvedReaction = reaction ?? this.defaultDamageReaction(cancelMovement);
    this.hitstunMs = hitstunMs;
    this.invulnerabilityMs = invulnerabilityMs;
    this.state.hitstun = hitstunMs > 0;
    this.state.invulnerable = true;
    if (resolvedReaction.cancelDash) {
      this.state.dashing = false;
      this.dashMs = 0;
      this.dashRecoverMs = 0;
    }
    if (resolvedReaction.clearInputBuffers) {
      this.dashBufferMs = 0;
      this.jumpBufferMs = 0;
      this.wallCoyoteMs = 0;
      this.wallJumpLockMs = 0;
      this.groundSnapMs = 0;
    }
    if (cancelMovement) return;
    this.applyRetainedDamageVelocity(resolvedReaction);
  }

  private applyRetainedDamageVelocity(reaction: DamageReactionConfig): void {
    const body = this.body;
    const maxX = reaction.maxRetainedVelocityX > 0 ? reaction.maxRetainedVelocityX : this.config.maxRunSpeed;
    const maxY = reaction.maxRetainedVelocityY > 0 ? reaction.maxRetainedVelocityY : this.config.maxFallSpeed;
    body.setVelocity(
      Phaser.Math.Clamp(body.velocity.x * reaction.retainVelocityX, -maxX, maxX),
      Phaser.Math.Clamp(body.velocity.y * reaction.retainVelocityY, -maxY, maxY),
    );
  }

  private defaultDamageReaction(cancelMovement: boolean): DamageReactionConfig {
    return {
      mode: cancelMovement ? 'knockback' : 'preserve',
      cancelDash: true,
      clearInputBuffers: true,
      allowGlobalHitstop: true,
      retainVelocityX: 1,
      retainVelocityY: 1,
      maxRetainedVelocityX: this.config.maxRunSpeed,
      maxRetainedVelocityY: this.config.maxFallSpeed,
      flashMs: 260,
    };
  }

  private startDash(direction: 1 | -1): void {
    if (!this.state.grounded) this.airDashesRemaining = Math.max(0, this.airDashesRemaining - 1);
    this.dashDirection = direction;
    this.state.dashing = true;
    this.state.wallSliding = false;
    this.jumpCutApplied = true;
    this.dashMs = this.config.dashDurationMs;
    this.dashBufferMs = 0;
    this.dashCooldownMs = this.config.dashCooldownMs;
    this.wallCoyoteMs = 0;
    this.groundSnapMs = 0;
    this.state.facing = direction;
    this.sprite.setFlipX(this.state.facing < 0);
    this.body.setVelocity(this.config.dashSpeed * this.dashDirection, 0);
  }

  private canDash(): boolean {
    return this.dashCooldownMs <= 0 && !this.state.dashing && (this.state.grounded || this.airDashesRemaining > 0);
  }

  private resolveDashDirection(moveX: number): 1 | -1 {
    if (Math.abs(moveX) > this.config.dashDirectionDeadzone) return moveX > 0 ? 1 : -1;
    return this.state.facing;
  }

  private refreshDerivedState(): void {
    const body = this.body;
    this.state.jumping = !this.state.grounded && body.velocity.y < -30;
    this.state.falling = !this.state.grounded && body.velocity.y > 30;
    this.state.dashRecovering = this.dashRecoverMs > 0;
    this.state.dashAvailable = this.canDash();
  }

  private emitTransitions(wasGrounded: boolean, wasWallSliding: boolean): void {
    if (!wasGrounded && this.state.grounded) {
      this.sprite.scene.events.emit(EVENTS.playerLanded, this.sprite.x, this.sprite.y);
    }
    if (!wasWallSliding && this.state.wallSliding) {
      this.sprite.scene.events.emit(EVENTS.playerWallSlide, this.sprite.x, this.sprite.y, this.wallCoyoteDir);
    }
  }

  private moveTowards(current: number, target: number, maxDelta: number): number {
    if (Math.abs(target - current) <= maxDelta) return target;
    return current + Math.sign(target - current) * maxDelta;
  }
}
