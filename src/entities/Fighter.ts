import Phaser from 'phaser';
import { hasEnemyArt } from '../systems/EnemyArt';
import { PLAYER_ART } from '../systems/PlayerArt';

const GRAVITY = 3600;
const GROUND_FRICTION = 10; // frena el retroceso (por segundo)
const DOWN_MS = 700; // tiempo tirado en el suelo
const GETUP_MS = 450;
const GETUP_INVULN_MS = 900;

export type FighterState = 'idle' | 'walk' | 'windup' | 'attack' | 'hurt' | 'down' | 'getup' | 'dead';

/** Un golpe que recibe un luchador. */
export interface Hit {
  damage: number;
  /** Dirección del empuje (1 = hacia la derecha). */
  dir: 1 | -1;
  /** Tumba al objetivo. */
  knockdown?: boolean;
  /** Fuerza del empuje horizontal (px/s). */
  force?: number;
  /** Duración del aturdimiento si no tumba (ms). */
  stun?: number;
  /** Ignora la súper armadura (poderes y golpes finales). */
  heavy?: boolean;
}

/**
 * Base de todo personaje con profundidad falsa estilo beat 'em up:
 *  - x: posición horizontal
 *  - y: carril de profundidad (posición de los pies en el suelo)
 *  - z: altura (al salir volando por un derribo)
 * El sprite se dibuja en (x, y - z) y la sombra en (x, y). La profundidad de dibujo es y.
 */
export class Fighter {
  x: number;
  y: number;
  z = 0;
  vz = 0;
  /** Velocidad horizontal de retroceso/embestida. */
  vx = 0;
  facing: 1 | -1 = 1;
  hp = 1;
  maxHp = 1;
  state: FighterState = 'idle';
  stateUntil = 0;
  invulnUntil = 0;
  superArmor = false;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image;
  protected baseScale: number;
  readonly artTexture: string;

  constructor(
    protected scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    scale = 1,
  ) {
    this.x = x;
    this.y = y;
    this.baseScale = scale;
    this.artTexture = texture;
    this.shadow = scene.add.image(x, y, 'shadow').setScale(scale);
    const illustrated = texture === 'player' || hasEnemyArt(texture);
    this.sprite = illustrated
      ? scene.add.sprite(x, y, texture === 'player' ? PLAYER_ART : texture, '0').setOrigin(0.5, 0.92)
      : scene.add.sprite(x, y, texture).setOrigin(0.5, 1);
    this.sprite.setScale(texture === 'player' ? scale * 232 / (this.sprite.height * .72)
      : hasEnemyArt(texture) ? scale * 232 / this.sprite.frame.cutHeight : scale);
    this.syncDisplay();
  }

  /** Height of the visible frame, excluding transparent atlas padding. */
  get visualHeight(): number {
    return this.sprite.frame.cutHeight * this.sprite.scaleY;
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  get onGround(): boolean {
    return this.z <= 0 && this.vz <= 0;
  }

  /** No puede actuar (atacando, aturdido, en el suelo...). */
  get busy(): boolean {
    return this.state !== 'idle' && this.state !== 'walk';
  }

  /** Se le puede golpear ahora. */
  get hittable(): boolean {
    return this.alive && this.state !== 'down' && this.state !== 'getup' && this.state !== 'dead' && this.scene.time.now >= this.invulnUntil;
  }

  /** Dos luchadores están en el mismo carril si su profundidad es parecida. */
  sameLane(other: { y: number }, tolerance = 48): boolean {
    return Math.abs(this.y - other.y) <= tolerance;
  }

  setState(state: FighterState, ms = 0): void {
    this.state = state;
    this.stateUntil = this.scene.time.now + ms;
  }

  /** Daño real tras defensas (el jugador aplica su resistencia). */
  protected damageFor(hit: Hit): number {
    return hit.damage;
  }

  /** Aplica un golpe. Devuelve true si conectó. */
  receive(hit: Hit): boolean {
    if (!this.hittable) return false;
    this.hp = Math.max(0, this.hp - this.damageFor(hit));
    this.flash();
    this.facing = hit.dir === 1 ? -1 : 1; // mira hacia quien le pegó

    if (!this.alive || hit.knockdown) {
      this.knockDown(hit.dir, hit.force ?? 520);
    } else if (!this.superArmor || hit.heavy) {
      this.setState('hurt', hit.stun ?? 260);
      this.vx = hit.dir * (hit.force ?? 180);
    }
    return true;
  }

  knockDown(dir: 1 | -1, force: number): void {
    this.setState('down', 99999); // dura hasta que aterriza
    this.vx = dir * force;
    this.vz = 700;
    this.z = Math.max(this.z, 1);
  }

  protected flash(): void {
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => {
      if (this.sprite.active) this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    });
  }

  protected updateJump(dt: number): void {
    if (this.z > 0 || this.vz > 0) {
      this.vz -= GRAVITY * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
        this.onLand();
      }
    }
  }

  /** Al tocar el suelo tras un derribo. */
  protected onLand(): void {
    if (this.state === 'down') {
      this.scene.cameras.main.shake(60, 0.002);
      this.stateUntil = this.scene.time.now + DOWN_MS;
    }
  }

  /** Física y transiciones de estado comunes. Las subclases añaden su lógica encima. */
  protected updateBase(dt: number, minX = -Infinity, maxX = Infinity): void {
    const now = this.scene.time.now;
    this.x = Phaser.Math.Clamp(this.x + this.vx * dt, minX, maxX);
    if (this.onGround) this.vx *= Math.max(0, 1 - GROUND_FRICTION * dt);
    this.updateJump(dt);

    if (now >= this.stateUntil) {
      if (this.state === 'hurt' || this.state === 'attack') this.setState('idle');
      else if (this.state === 'down' && this.onGround) {
        if (this.alive) {
          this.setState('getup', GETUP_MS);
        } else {
          this.setState('dead', 99999);
          this.onDeath();
        }
      } else if (this.state === 'getup') {
        this.invulnUntil = now + GETUP_INVULN_MS;
        this.setState('idle');
      }
    }
  }

  protected onDeath(): void {}

  syncDisplay(): void {
    const lying = this.state === 'down' || this.state === 'dead';
    // Tumbado: rota 90° hacia atrás; levantándose: medio inclinado.
    const angle = lying ? (this.onGround ? -90 : -35) * this.facing : this.state === 'getup' ? -25 * this.facing : 0;
    this.sprite.setAngle(angle);
    this.sprite.setPosition(this.x, this.y - this.z);
    this.sprite.setFlipX(this.facing === -1);
    this.sprite.setDepth(this.y);
    this.shadow.setPosition(this.x, this.y);
    this.shadow.setDepth(this.y - 0.5);
    // La sombra se achica al estar en el aire
    this.shadow.setScale(this.baseScale * Phaser.Math.Clamp(1 - this.z / 480, 0.5, 1));
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
