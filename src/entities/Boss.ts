import Phaser from 'phaser';
import type { BossDef, BossMove } from '../data/bosses';
import type { EnemyId } from '../data/enemies';
import { Enemy, type EnemyHost } from './Enemy';
import type { Hit } from './Fighter';

export interface BossHost extends EnemyHost {
  bossSlam(b: Boss, radius: number, damage: number): void;
  bossSummon(b: Boss, ids: EnemyId[]): void;
  /** Barrido de escala: 7 carriles en orden, sin tocar el 7.º (la séptima). */
  bossScale(b: Boss, damage: number): void;
  /** Tríada de notas en el carril del jugador y sus vecinos. */
  bossArpeggio(b: Boss, damage: number): void;
  /** Texto que el jefe "grita" sobre su cabeza. */
  bossCallout(b: Boss, text: string): void;
  /** Enemigos vivos en pantalla (para no llenar de refuerzos). */
  readonly enemyCount: number;
}

const SUMMON_COOLDOWN_MS = 12000;

/** Movimientos que se repiten sin moverse del sitio (ráfagas). */
const STATIONARY_REPEATS: BossMove[] = ['shoot', 'sidechain', 'contract', 'arpeggio'];

/**
 * Jefe: un FALSO GUITARRISTA.
 * Elige movimientos por peso o sigue un ciclo fijo (bosses.ts), tiene fases o se enfurece al 50%,
 * puede tener un momento de debilidad ligado a su defecto y, al ser derrotado,
 * cae al suelo y su guitarra de utilería se rompe ("¡fraude expuesto!").
 */
export class Boss extends Enemy {
  readonly def: BossDef;
  readonly bossName: string;
  private move: BossMove | null = null;
  private lastMove: BossMove | null = null;
  private patternIndex = 0;
  private repeatsLeft = 0;
  private lastSummonAt = -SUMMON_COOLDOWN_MS;
  private enraged = false;
  private shownPhase = 1;
  private fumbled = false;
  private fumbleUntil = 0;

  constructor(scene: Phaser.Scene, private bossHost: BossHost, def: BossDef, name: string, x: number, y: number) {
    super(
      scene,
      bossHost,
      {
        name,
        behavior: 'brawler',
        hp: def.hp,
        damage: def.damage,
        speed: def.speed,
        reach: 150 * Math.min(def.scale, 1.4),
        windup: 380,
        cooldown: [700, 1400],
        superArmor: true,
        scale: def.scale,
        drops: [['cash', 1]],
      },
      `boss-${def.missionId}`,
      x,
      y,
    );
    this.def = def;
    this.bossName = name;
    this.chargeSpeed = 1100;
  }

  /** Retrasa su primer ataque (p. ej. al cerrar el diálogo de presentación). */
  holdAttacks(ms: number): void {
    this.move = null;
    this.nextAttackAt = this.scene.time.now + ms;
  }

  /** Fase actual: por tramos de vida si tiene fases; si no, 2 al enfurecerse. */
  get phase(): number {
    if (this.def.phases) return Math.min(this.def.phases, 1 + Math.floor((1 - this.hp / this.maxHp) * this.def.phases));
    return this.enraged ? 2 : 1;
  }

  get isEnraged(): boolean {
    return this.phase >= 2;
  }

  /** Acelera avisos y pausas según la fase. */
  private get tempo(): number {
    return this.def.phases ? 1 - 0.15 * (this.phase - 1) : this.enraged ? 0.75 : 1;
  }

  protected override artPose(): string {
    if (this.state !== 'attack' || this.charging) return super.artPose();
    switch (this.lastReleaseOf) {
      case 'shoot': case 'scale': case 'arpeggio': return 'shoot';
      case 'slam': case 'sidechain': return 'slam';
      case 'summon': return 'summon';
      case 'contract': return 'special';
      default: return 'attack';
    }
  }

  // ---------- IA ----------

  protected override think(dt: number, now: number): void {
    const p = this.bossHost.player;
    const side = this.x < p.x ? -1 : 1;
    this.facing = side === -1 ? 1 : -1;
    const dist = Math.abs(p.x - this.x);
    const dy = p.y - this.y;

    if (!this.move) {
      // Entre ataques: mantiene distancia media y busca el carril del jugador.
      this.moveTo(p.x + side * 420, p.y, dt);
      if (now >= this.nextAttackAt) this.pickMove(now);
      return;
    }

    // Repeticiones encadenadas (combos y ráfagas): sin volver a reposicionarse.
    if (this.repeatsLeft > 0 && this.state === 'idle' && this.lastReleaseOf === this.move) {
      if (this.move === 'combo' && dist <= this.stats.reach + 40) return this.startWindup(170);
      if (STATIONARY_REPEATS.includes(this.move)) return this.startWindup(this.move === 'sidechain' ? 260 : 220);
    }

    switch (this.move) {
      case 'combo':
        if (dist <= this.stats.reach && Math.abs(dy) < 34) this.startWindup(380);
        else this.moveTo(p.x + side * this.stats.reach * 0.7, p.y, dt);
        break;
      case 'charge':
      case 'shoot':
      case 'contract':
      case 'arpeggio':
        // Se alinea en el carril a distancia y luego actúa.
        if (Math.abs(dy) < 30 && dist > 300) this.startWindup(this.move === 'charge' ? 550 : 400);
        else this.moveTo(p.x + side * 650, p.y, dt);
        break;
      case 'scale':
        // Se aleja y "toca la escala" de arriba abajo.
        if (dist > 500) this.startWindup(700);
        else this.moveTo(p.x + side * 750, this.y, dt);
        break;
      case 'slam':
        if (dist < 260) this.startWindup(650);
        else this.moveTo(p.x + side * 180, p.y, dt);
        break;
      case 'sidechain':
        if (dist < 420) this.startWindup(320);
        else this.moveTo(p.x + side * 200, p.y, dt);
        break;
      case 'summon':
        this.startWindup(500);
        break;
    }
  }

  /** Último movimiento ejecutado (para encadenar repeticiones sin reposicionarse). */
  private lastReleaseOf: BossMove | null = null;

  private pickMove(now: number): void {
    let move: BossMove;
    if (this.def.pattern) {
      // Ciclo fijo: siempre los mismos recursos, en el mismo orden.
      move = this.def.pattern[this.patternIndex % this.def.pattern.length];
    } else {
      const options = (Object.entries(this.def.moves) as [BossMove, number][]).filter(
        ([m]) =>
          (m !== 'summon' || (now - this.lastSummonAt > SUMMON_COOLDOWN_MS && this.bossHost.enemyCount < 3)) &&
          (m !== 'loop' || this.lastMove !== null),
      );
      const total = options.reduce((s, [, w]) => s + w, 0);
      let r = Math.random() * total;
      move = options[0][0];
      for (const [m, w] of options) {
        r -= w;
        if (r <= 0) {
          move = m;
          break;
        }
      }
    }

    const shout = this.def.callouts?.[move];
    if (move === 'loop') move = this.lastMove ?? 'combo'; // repite lo último que hizo
    if (shout) this.shout(shout);

    this.move = move;
    this.lastReleaseOf = null;
    const extra = this.phase - 1;
    const repeats: Partial<Record<BossMove, number>> = {
      combo: this.def.comboHits,
      shoot: this.def.shots + extra,
      sidechain: 4,
      contract: 2,
      arpeggio: 1 + extra,
    };
    this.repeatsLeft = repeats[move] ?? 1;
  }

  private lastShout = '';
  private lastShoutAt = -Infinity;

  /** Frase sobre la cabeza; no repite la misma si lo interrumpen y vuelve a intentarlo. */
  private shout(str: string): void {
    const now = this.scene.time.now;
    if (str === this.lastShout && now - this.lastShoutAt < 3000) return;
    this.lastShout = str;
    this.lastShoutAt = now;
    this.bossHost.bossCallout(this, str);
  }

  protected override startWindup(ms = this.stats.windup): void {
    super.startWindup(ms * this.tempo);
    // Aviso más claro según el movimiento
    if (this.move === 'slam' || this.move === 'sidechain') this.sprite.setTint(0xff3b4e);
    if (this.move === 'summon') this.sprite.setTint(0xffe14d);
    if (this.move === 'scale') this.sprite.setTint(0x6b8cff);
  }

  protected override release(): void {
    this.sprite.clearTint();
    const d = this.def;
    const dmg = this.stats.damage;
    const move = this.move;
    switch (move) {
      case 'combo':
        this.bossHost.enemyStrike(this, this.stats.reach, dmg, this.repeatsLeft === 1);
        this.setState('attack', 240);
        this.vx = this.facing * 160;
        break;
      case 'charge':
        this.startCharge(750);
        break;
      case 'slam':
        this.bossHost.bossSlam(this, 340, Math.round(dmg * 1.3));
        this.setState('attack', 450);
        break;
      case 'sidechain':
        this.bossHost.bossSlam(this, 280, Math.round(dmg * 0.7));
        this.setState('attack', 160);
        break;
      case 'shoot':
        // En la última fase, cada lick es una tríada completa.
        if (d.phases && this.phase >= d.phases) this.bossHost.bossArpeggio(this, dmg);
        else this.bossHost.enemyShoot(this, 'note', dmg);
        this.setState('attack', 240);
        break;
      case 'contract':
        this.bossHost.enemyShoot(this, 'contract', Math.round(dmg * 0.5));
        this.setState('attack', 260);
        break;
      case 'arpeggio':
        this.bossHost.bossArpeggio(this, dmg);
        this.setState('attack', 400);
        break;
      case 'scale':
        this.bossHost.bossScale(this, dmg);
        this.setState('attack', 1200);
        break;
      case 'summon':
        this.lastSummonAt = this.scene.time.now;
        this.bossHost.bossSummon(this, d.summon);
        this.setState('attack', 500);
        break;
    }
    this.lastReleaseOf = move;
    this.repeatsLeft--;
    if (this.repeatsLeft <= 0) this.finishMove();
  }

  private finishMove(): void {
    if (this.move) this.lastMove = this.move;
    this.move = null;
    this.patternIndex++;
    const [a, b] = this.stats.cooldown;
    const mult = this.def.phases ? 1 - 0.2 * (this.phase - 1) : this.enraged ? 0.6 : 1;
    this.nextAttackAt = this.scene.time.now + Phaser.Math.Between(a, b) * mult;
  }

  // ---------- Daño ----------

  override receive(hit: Hit): boolean {
    // El ídolo no cae al suelo salvo al morir; los golpes fuertes lo hacen tambalear.
    const now = this.scene.time.now;
    const lethal = hit.damage >= this.hp;
    const landed = super.receive({ ...hit, knockdown: lethal, stun: 180, force: hit.heavy ? 160 : 40 });
    if (!landed) return false;
    if (!this.alive) return true;

    if (now < this.fumbleUntil) {
      // Durante su momento de debilidad sigue aturdido aunque le peguen.
      this.setState('hurt', this.fumbleUntil - now);
    } else if (this.state === 'hurt') {
      this.move = null; // lo interrumpe (el ciclo fijo no avanza)
      this.nextAttackAt = now + 500;
    }

    // Debilidad ligada a su defecto (una sola vez)
    const f = this.def.fumble;
    if (f && !this.fumbled && this.hp / this.maxHp <= f.at) {
      this.fumbled = true;
      this.fumbleUntil = now + f.ms;
      this.move = null;
      this.vx = 0;
      this.setState('hurt', f.ms);
      this.sprite.setTint(0x9a9ab8);
      this.shout(f.text);
      this.nextAttackAt = this.fumbleUntil + 400;
      this.scene.time.delayedCall(f.ms, () => this.sprite.active && this.sprite.clearTint());
    }

    // Fases / furia
    if (!this.def.phases && !this.enraged && this.hp <= this.maxHp / 2) {
      this.enraged = true;
      this.stats.speed *= 1.25;
      this.scene.cameras.main.flash(200, 255, 59, 78);
    }
    if (this.def.phases && this.phase > this.shownPhase) {
      this.shownPhase = this.phase;
      this.stats.speed *= 1.15;
      this.scene.cameras.main.flash(250, 255, 43, 214);
      const t = this.def.phaseTexts?.[this.phase];
      if (t) this.shout(t);
    }
    return true;
  }

  // ---------- Derrota ----------

  protected override onDeath(): void {
    this.bossHost.onEnemyDefeated(this);
    // Fraude expuesto: su guitarra de utilería revienta (astillas y cuerdas) y queda tirado en el suelo.
    const { x, y } = this;
    const gy = y - this.visualHeight * 0.45;
    for (let i = 0; i < 26; i++) {
      const shard = this.scene.add
        .rectangle(x + Phaser.Math.Between(-30, 30), gy + Phaser.Math.Between(-30, 30), Phaser.Math.Between(6, 22), Phaser.Math.Between(4, 12), Phaser.Math.RND.pick([this.def.accent, 0x5a3418, 0x8a5530, 0x111111]))
        .setDepth(y + 1)
        .setAngle(Phaser.Math.Between(0, 180));
      this.scene.tweens.add({
        targets: shard,
        x: shard.x + Phaser.Math.Between(-260, 260),
        y: y + Phaser.Math.Between(-10, 40),
        angle: shard.angle + Phaser.Math.Between(-540, 540),
        duration: Phaser.Math.Between(500, 900),
        ease: 'Quad.easeIn',
        onComplete: () => this.scene.tweens.add({ targets: shard, alpha: 0, delay: 1200, duration: 600, onComplete: () => shard.destroy() }),
      });
    }
    // Cuerdas que saltan
    const strings = this.scene.add.graphics().setDepth(y + 2);
    strings.lineStyle(2, 0xdddddd, 0.9);
    for (let i = 0; i < 6; i++) {
      const a = Phaser.Math.FloatBetween(-Math.PI, 0);
      strings.lineBetween(x, gy, x + Math.cos(a) * Phaser.Math.Between(80, 160), gy + Math.sin(a) * Phaser.Math.Between(60, 140));
    }
    this.scene.tweens.add({ targets: strings, alpha: 0, scale: 1.3, duration: 500, onComplete: () => strings.destroy() });
    this.scene.cameras.main.shake(400, 0.01);
    // Queda en el suelo y se desvanece
    this.scene.tweens.add({
      targets: [this.sprite, this.shadow],
      alpha: 0,
      delay: 1400,
      duration: 900,
      onComplete: () => this.destroy(),
    });
  }
}
