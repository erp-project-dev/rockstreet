import Phaser from 'phaser';
import { hasEnemyArt } from '../systems/EnemyArt';
import { FLOOR_BOTTOM, FLOOR_TOP } from '../config';
import type { DropTable } from '../data/items';
import type { EnemyBehavior, EnemyDef } from '../data/enemies';
import { Fighter, type Hit } from './Fighter';
import type { Player } from './Player';

/** Lo que el enemigo necesita de la escena. GameScene lo implementa. */
export interface EnemyHost {
  readonly player: Player;
  /** ¿Hay turno de ataque libre? (máximo N atacantes a la vez) */
  tokenFree(e: Enemy): boolean;
  /** Toma un turno de ataque si hay libre. */
  requestToken(e: Enemy): boolean;
  releaseToken(e: Enemy): void;
  /** Golpe cuerpo a cuerpo contra el jugador. */
  enemyStrike(e: Enemy, reach: number, damage: number, knockdown: boolean): void;
  /** Lanza un proyectil por el carril del enemigo. */
  enemyShoot(e: Enemy, kind: 'bottle' | 'note' | 'contract', damage: number): void;
  onEnemyDefeated(e: Enemy): void;
}

/** Datos de combate comunes a fanáticos y jefes. */
export interface EnemyStats {
  name: string;
  behavior: EnemyBehavior;
  hp: number;
  damage: number;
  speed: number;
  reach: number;
  windup: number;
  cooldown: [number, number];
  knockdown?: boolean;
  superArmor?: boolean;
  scale: number;
  drops: DropTable;
}

export const statsFromDef = (d: EnemyDef, hpMult: number, dmgMult: number): EnemyStats => ({
  ...d,
  hp: Math.round(d.hp * hpMult),
  damage: Math.round(d.damage * dmgMult),
});

let nextId = 0;

/** Un FANÁTICO. IA: acercarse, esperar turno, avisar (windup) y golpear. */
export class Enemy extends Fighter {
  readonly id = nextId++;
  readonly stats: EnemyStats;
  protected nextAttackAt = 0;
  protected hasToken = false;
  /** Carril de espera propio para que el grupo no se amontone. */
  private laneOffset: number;
  private chargeHit = false;
  /** Embistiendo: velocidad constante y daño por contacto. */
  protected charging = false;
  protected chargeSpeed = 950;

  constructor(
    scene: Phaser.Scene,
    protected host: EnemyHost,
    stats: EnemyStats,
    texture: string,
    x: number,
    y: number,
  ) {
    super(scene, x, y, texture, stats.scale);
    this.stats = stats;
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.superArmor = !!stats.superArmor;
    this.laneOffset = Phaser.Math.Between(-70, 70);
    this.nextAttackAt = scene.time.now + Phaser.Math.Between(400, 1200);
  }

  get name(): string {
    return this.stats.name;
  }

  update(dt: number): void {
    const now = this.scene.time.now;
    this.updateBase(dt);
    this.y = Phaser.Math.Clamp(this.y, FLOOR_TOP, FLOOR_BOTTOM);

    if (this.state === 'dead') {
      this.syncDisplay();
      return;
    }
    if (this.state !== 'attack') this.charging = false;
    if (this.hasToken && this.state !== 'windup' && this.state !== 'attack') this.dropToken();

    if (this.state === 'windup' && now >= this.stateUntil) this.release();
    else if (this.state === 'attack' && this.charging) {
      this.vx = this.facing * this.chargeSpeed; // velocidad constante durante la embestida
      this.checkChargeContact();
    }
    else if (!this.busy && this.host.player.alive) this.think(dt, now);

    this.syncDisplay();
  }

  override syncDisplay(): void {
    if (!this.sprite.active) return;
    super.syncDisplay();
    const texture = this.artTexture;
    if (!hasEnemyArt(texture)) return;
    const falling = this.state === 'down' && !this.onGround;
    const pose = falling ? 'hurt' : this.artPose();
    const key = `${texture}-${pose}`;
    if (this.scene.anims.exists(key) && this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key);
    // Normalize across the source sheet and its higher-resolution transitions.
    const reference = this.scene.textures.get(texture).get('0');
    this.sprite.setScale(this.baseScale * 232 * reference.realHeight / reference.cutHeight / this.sprite.frame.realHeight);
    // The sheet includes a lying pose and a crouched getup; avoid rotating them twice.
    if (!falling) this.sprite.setAngle(0);
  }

  protected artPose(): string {
    if (this.state === 'attack') {
      if (this.charging) return 'charge';
      if (this.stats?.behavior === 'thrower') return 'shoot';
    }
    return this.state;
  }

  // ---------- IA ----------

  protected think(dt: number, now: number): void {
    const p = this.host.player;
    const side = this.x < p.x ? -1 : 1; // lado del jugador en el que está
    this.facing = side === -1 ? 1 : -1;
    const dy = p.y - this.y;
    const dist = Math.abs(p.x - this.x);
    const ready = now >= this.nextAttackAt;

    switch (this.stats.behavior) {
      case 'thrower': {
        // Mantiene distancia y se alinea en el carril para lanzar.
        this.moveTo(p.x + side * 640, p.y + this.laneOffset * 0.3, dt);
        if (ready && Math.abs(dy) < 50 && dist > 300 && dist < 1100) this.startWindup();
        return;
      }
      case 'charger': {
        // Se alinea a media distancia y embiste en línea recta.
        this.moveTo(p.x + side * 520, p.y, dt);
        if (ready && Math.abs(dy) < 40 && dist > 250 && dist < 900 && this.host.requestToken(this)) {
          this.hasToken = true;
          this.startWindup();
        }
        return;
      }
      default: {
        const inRange = dist <= this.stats.reach && Math.abs(dy) < 34;
        if (ready && inRange && this.host.requestToken(this)) {
          this.hasToken = true;
          this.startWindup();
          return;
        }
        // Sin turno: espera a distancia; con turno disponible: se acerca a golpear.
        const wantClose = ready && this.host.tokenFree(this);
        const gap = wantClose ? this.stats.reach * 0.75 : this.stats.reach + 200;
        this.moveTo(p.x + side * gap, p.y + (wantClose ? 0 : this.laneOffset), dt);
      }
    }
  }

  protected moveTo(tx: number, ty: number, dt: number): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const speed = this.stats.speed;
    const moving = Math.abs(dx) > 8 || Math.abs(dy) > 6;
    if (Math.abs(dx) > 8) this.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
    if (Math.abs(dy) > 6) this.y += Math.sign(dy) * Math.min(Math.abs(dy), speed * 0.6 * dt);
    this.state = moving ? 'walk' : 'idle';
  }

  /** Aviso antes de atacar: se echa hacia atrás y brilla. Es la ventana para esquivar. */
  protected startWindup(ms = this.stats.windup): void {
    this.setState('windup', ms);
    this.sprite.setTint(0xffb36b);
  }

  /** Fin del aviso: ejecuta el ataque según su comportamiento. */
  protected release(): void {
    this.sprite.clearTint();
    const s = this.stats;
    if (s.behavior === 'thrower') {
      this.host.enemyShoot(this, 'bottle', s.damage);
      this.setState('attack', 300);
    } else if (s.behavior === 'charger') {
      this.startCharge(600);
    } else {
      this.host.enemyStrike(this, s.reach, s.damage, !!s.knockdown);
      this.setState('attack', 320);
      this.vx = this.facing * 120;
    }
    this.nextAttackAt = this.scene.time.now + Phaser.Math.Between(...s.cooldown);
  }

  protected startCharge(ms: number): void {
    this.chargeHit = false;
    this.charging = true;
    this.setState('attack', ms);
  }

  private checkChargeContact(): void {
    const p = this.host.player;
    if (this.chargeHit) return;
    if (Math.abs(p.x - this.x) < 80 && Math.abs(p.y - this.y) < 44 && p.z < 120) {
      this.chargeHit = true;
      p.receive({ damage: this.stats.damage, dir: this.facing, knockdown: true, force: 600 });
    }
  }

  protected dropToken(): void {
    this.hasToken = false;
    this.host.releaseToken(this);
  }

  override receive(hit: Hit): boolean {
    const landed = super.receive(hit);
    if (landed && this.state !== 'windup') this.sprite.clearTint();
    return landed;
  }

  protected override onDeath(): void {
    if (this.hasToken) this.dropToken();
    this.host.onEnemyDefeated(this);
    // Parpadea y desaparece
    this.scene.tweens.add({
      targets: [this.sprite, this.shadow],
      alpha: 0,
      duration: 700,
      delay: 300,
      onComplete: () => this.destroy(),
    });
  }

  get removable(): boolean {
    return this.state === 'dead' && !this.sprite.active;
  }
}
