import Phaser from 'phaser';
import { type PlayerAnim } from '../systems/PlayerArt';
import { Sfx } from '../systems/Sfx';
import { FLOOR_BOTTOM, FLOOR_TOP } from '../config';
import type { PowerId } from '../data/upgrades';
import { POWERS } from '../data/upgrades';
import { GameState, type PlayerStats } from '../systems/GameState';
import type { Input } from '../systems/Input';
import { Fighter, type Hit } from './Fighter';
import { DebugFlags } from '../systems/Debug';

/** Dash (Espacio): impulso corto para acercarse o alejarse. No da invulnerabilidad. Reemplaza al salto. */
const DASH_SPEED = 1500;
const DASH_MS = 180;
const DASH_COOLDOWN_MS = 600;
/** Margen tras el dash para encadenar la embestida (dash + golpe). */
const DASH_ATTACK_WINDOW_MS = 150;
const HURT_INVULN_MS = 450; // evita quedar atrapado en golpes encadenados
const RESPAWN_INVULN_MS = 2400;
const COMBO_WINDOW_MS = 450;

/** Golpes del combo: daño base, duración, alcance y si tumba. */
const COMBO = [
  { damage: 8, ms: 200, reach: 140, knockdown: false },
  { damage: 9, ms: 210, reach: 140, knockdown: false },
  { damage: 15, ms: 340, reach: 160, knockdown: true },
] as const;
/** Embestida: golpe durante o justo después del dash. Tumba. */
const DASH_ATTACK = { damage: 14, reach: 170, ms: 260 };

export type MeleeKind = 'combo1' | 'combo2' | 'combo3' | 'dashAttack';
export type PlayerAction = MeleeKind | PowerId;

/** Ventana durante la que un golpe del jugador puede conectar. */
export interface ActiveHitbox {
  kind: MeleeKind;
  until: number;
  reach: number;
  damage: number;
  knockdown: boolean;
  /** Objetivos ya golpeados (un golpe pega una sola vez a cada uno). */
  hit: Set<object>;
}

/** AXEL RIFF. Lee el teclado y gestiona vida, stamina, vidas, combos y poderes. */
export class Player extends Fighter {
  readonly stats: PlayerStats;
  stamina: number;
  lives = 3;
  damageBoostUntil = 0;
  /** Ralentizado (contratos de Blak Source) hasta este instante. */
  slowUntil = 0;
  hitbox: ActiveHitbox | null = null;
  /** Dash en curso hasta este instante, y cuándo vuelve a estar disponible. */
  dashUntil = 0;
  dashReadyAt = 0;
  private dashVX = 0;
  private dashVY = 0;
  private comboStep = 0;
  private comboUntil = 0;
  private visualAction: PlayerAction = 'combo1';

  /** La escena ejecuta los efectos de cada ataque/poder. */
  onAction: (action: PlayerAction) => void = () => {};
  /** Se llama cuando muere (tras caer al suelo). */
  onDied: () => void = () => {};
  /** La escena dibuja la estela del dash. */
  onDash: () => void = () => {};

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    this.stats = GameState.stats();
    this.maxHp = this.stats.maxHp;
    this.hp = this.maxHp;
    this.stamina = this.stats.maxStamina;
  }

  get dashing(): boolean {
    return this.scene.time.now < this.dashUntil;
  }

  /** Progreso de la recarga del dash (0..1) para el HUD; 1 = listo. */
  get dashReady(): number {
    const now = this.scene.time.now;
    return now >= this.dashReadyAt ? 1 : 1 - (this.dashReadyAt - now) / DASH_COOLDOWN_MS;
  }

  get damageBoosted(): boolean {
    return this.scene.time.now < this.damageBoostUntil;
  }

  /** Multiplicador de daño del jugador (Fuerza + disco de oro). */
  get damageMult(): number {
    return this.stats.attackMult * (this.damageBoosted ? 2 : 1);
  }

  powerLevel(id: PowerId): number {
    return GameState.data.powers[id];
  }

  /** Costo de stamina de un poder: baja 8% por nivel. El Solo necesita la barra llena. */
  powerCost(id: PowerId): number {
    if (id === 'solo') return this.stats.maxStamina;
    const def = POWERS.find((p) => p.id === id)!;
    return Math.round(def.baseStaminaCost * (1 - 0.08 * (this.powerLevel(id) - 1)));
  }

  canUse(id: PowerId): boolean {
    return this.powerLevel(id) > 0 && this.stamina >= this.powerCost(id) && !this.busy && this.alive;
  }

  update(dt: number, input: Input, minX: number, maxX: number): void {
    const now = this.scene.time.now;
    this.updateBase(dt, minX, maxX);
    if (this.hitbox && now > this.hitbox.until) this.hitbox = null;

    if (this.dashing && this.alive && !this.busy) {
      // Dash: impulso a velocidad fija; se puede encadenar la embestida.
      this.x = Phaser.Math.Clamp(this.x + this.dashVX * dt, minX, maxX);
      this.y = Phaser.Math.Clamp(this.y + this.dashVY * dt, FLOOR_TOP, FLOOR_BOTTOM);
      this.state = 'walk';
      if (input.justDown('attack')) this.dashAttack();
    } else if (!this.busy && this.alive) {
      // Movimiento en 2 ejes (horizontal + profundidad). Más lento en profundidad, como los clásicos.
      let dx = 0;
      let dy = 0;
      if (input.isDown('left')) dx -= 1;
      if (input.isDown('right')) dx += 1;
      if (input.isDown('up')) dy -= 1;
      if (input.isDown('down')) dy += 1;
      if (dx !== 0 && this.onGround) this.facing = dx > 0 ? 1 : -1;
      const speed = this.stats.speed * (now < this.slowUntil ? 0.5 : 1);
      this.x = Phaser.Math.Clamp(this.x + dx * speed * dt, minX, maxX);
      if (this.onGround) this.y = Phaser.Math.Clamp(this.y + dy * speed * 0.6 * dt, FLOOR_TOP, FLOOR_BOTTOM);
      this.state = dx || dy ? 'walk' : 'idle';

      if (input.justDown('dash')) this.dash(dx, dy);
      if (input.justDown('attack')) {
        if (now < this.dashUntil + DASH_ATTACK_WINDOW_MS) this.dashAttack();
        else this.attack();
      }
      this.tryPower(input.justDown('power1'), 'powerChord');
      this.tryPower(input.justDown('power2'), 'feedback');
      this.tryPower(input.justDown('super'), 'solo');
    }

    // Recarga pasiva de stamina
    this.stamina = Math.min(this.stats.maxStamina, this.stamina + this.stats.staminaRegen * dt);

    // Parpadeo mientras es invulnerable (no durante el dash, para que se vea bien la estela)
    this.sprite.setAlpha(now < this.invulnUntil && !this.dashing && Math.floor(now / 80) % 2 === 0 ? 0.35 : 1);
    this.syncDisplay();
  }

  /** Dash en la dirección de movimiento (o hacia donde mira). Solo movimiento: se puede recibir daño. */
  private dash(dx: number, dy: number): void {
    const now = this.scene.time.now;
    if (now < this.dashReadyAt || !this.onGround) return;
    if (dx === 0 && dy === 0) dx = this.facing;
    const len = Math.hypot(dx, dy);
    this.dashVX = (dx / len) * DASH_SPEED;
    this.dashVY = (dy / len) * DASH_SPEED * 0.6; // en profundidad avanza menos, como al caminar
    if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
    this.dashUntil = now + DASH_MS;
    this.dashReadyAt = now + DASH_COOLDOWN_MS;
    this.onDash();
  }

  /** Embestida: dash + golpe. Carga con la guitarra y tumba. */
  private dashAttack(): void {
    const now = this.scene.time.now;
    this.dashUntil = 0;
    this.comboStep = 0;
    this.setState('attack', DASH_ATTACK.ms);
    this.vx = this.facing * 700;
    this.hitbox = { kind: 'dashAttack', until: now + 220, reach: DASH_ATTACK.reach, damage: DASH_ATTACK.damage, knockdown: true, hit: new Set() };
    this.visualAction = 'dashAttack';
    this.onAction('dashAttack');
  }

  private attack(): void {
    const now = this.scene.time.now;
    this.comboStep = now < this.comboUntil ? (this.comboStep % 3) + 1 : 1;
    const c = COMBO[this.comboStep - 1];
    this.setState('attack', c.ms);
    this.comboUntil = now + c.ms + COMBO_WINDOW_MS;
    this.vx = this.facing * 160; // pequeño paso hacia adelante
    const kind = `combo${this.comboStep}` as MeleeKind;
    this.hitbox = { kind, until: now + 110, reach: c.reach, damage: c.damage, knockdown: c.knockdown, hit: new Set() };
    this.visualAction = kind;
    this.onAction(kind);
  }

  private tryPower(pressed: boolean, id: PowerId): void {
    if (!pressed) return;
    if (!this.canUse(id)) return;
    this.stamina -= this.powerCost(id);
    this.setState('attack', id === 'solo' ? 500 : 300);
    this.visualAction = id;
    this.onAction(id);
  }

  override syncDisplay(): void {
    super.syncDisplay();
    let pose: PlayerAnim;
    const falling = this.state === 'down' && !this.onGround;
    if (falling) pose = 'fall';
    else if (this.state === 'attack') pose = this.visualAction ?? 'combo1';
    else if (this.state === 'hurt' || this.state === 'down' || this.state === 'dead' || this.state === 'getup') pose = this.state;
    else if (this.dashing) pose = 'dash';
    else pose = this.state === 'walk' ? 'walk' : 'idle';
    const key = `axel-${pose}`;
    // Do not restart a finished attack while its gameplay state is still active.
    if (this.scene.anims.exists(key) && this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key);
    // Ambas hojas tienen distinta resolución, pero conservan la escala corporal.
    this.sprite.setScale(this.baseScale * 232 / (this.sprite.frame.realHeight * .72));
    if (pose === 'getup' || pose === 'down' || pose === 'dead') this.sprite.setAngle(0);
  }

  protected override onLand(): void {
    super.onLand();
  }

  protected override damageFor(hit: Hit): number {
    return Math.max(1, Math.round(hit.damage * this.stats.damageTaken));
  }

  override receive(hit: Hit): boolean {
    if (DebugFlags.god) return false;
    const landed = super.receive(hit);
    if (landed) {
      Sfx.play(this.scene, 'hurt');
      this.hitbox = null;
      this.comboStep = 0;
      if (this.state === 'hurt') this.invulnUntil = this.scene.time.now + HURT_INVULN_MS;
      this.scene.cameras.main.shake(120, 0.006);
    }
    return landed;
  }

  protected override onDeath(): void {
    this.onDied();
  }

  /** Gana stamina al conectar golpes (incentiva el combate cuerpo a cuerpo). */
  onHitLanded(): void {
    this.stamina = Math.min(this.stats.maxStamina, this.stamina + 4);
  }

  heal(fraction: number): void {
    this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * fraction));
  }

  addStamina(fraction: number): void {
    this.stamina = Math.min(this.stats.maxStamina, this.stamina + this.stats.maxStamina * fraction);
  }

  /** Reaparece tras perder una vida: cae del cielo con invulnerabilidad. */
  respawn(): void {
    this.hp = this.maxHp;
    this.stamina = this.stats.maxStamina;
    this.setState('idle');
    this.vx = 0;
    this.z = 400;
    this.vz = 0;
    this.invulnUntil = this.scene.time.now + RESPAWN_INVULN_MS;
  }
}
