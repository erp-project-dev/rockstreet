import Phaser from 'phaser';

type Display = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Transform &
  Phaser.GameObjects.Components.Depth & { setAlpha(value: number): unknown };

/**
 * Proyectil que viaja por un carril (misma profundidad falsa que los luchadores).
 * Lo usan las botellas de los lanzadores, las notas de los jefes y el Power Chord.
 */
export class Projectile {
  x: number;
  readonly y: number;
  readonly z: number;
  private traveled = 0;
  /** Objetivos ya golpeados (para proyectiles que atraviesan). */
  readonly hit = new Set<object>();
  dead = false;

  constructor(
    readonly display: Display,
    x: number,
    y: number,
    z: number,
    readonly vx: number,
    readonly range: number,
    readonly damage: number,
    readonly opts: { fromPlayer: boolean; pierce?: boolean; knockdown?: boolean; spin?: boolean;
      /** ms de ralentización al impactar */
      slow?: number;
    },
  ) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.sync();
  }

  get dir(): 1 | -1 {
    return this.vx > 0 ? 1 : -1;
  }

  update(dt: number): void {
    const step = this.vx * dt;
    this.x += step;
    this.traveled += Math.abs(step);
    if (this.opts.spin) this.display.angle += 900 * dt * this.dir;
    // Se desvanece al final de su recorrido
    if (this.traveled > this.range * 0.8) this.display.setAlpha(Math.max(0, 1 - (this.traveled - this.range * 0.8) / (this.range * 0.2)));
    if (this.traveled >= this.range) this.kill();
    this.sync();
  }

  /** ¿Toca a este objetivo? Mismo carril, cerca en x y a una altura alcanzable. */
  touches(t: { x: number; y: number; z: number }, halfWidth = 60): boolean {
    return Math.abs(t.x - this.x) < halfWidth && Math.abs(t.y - this.y) < 46 && Math.abs(t.z + 100 - this.z) < 140;
  }

  kill(): void {
    if (this.dead) return;
    this.dead = true;
    this.display.destroy();
  }

  private sync(): void {
    if (this.dead) return;
    this.display.setPosition(this.x, this.y - this.z);
    this.display.setDepth(this.y + 2);
  }
}
