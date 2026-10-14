import Phaser from 'phaser';
import { combatImage, PROJECTILE_SIZE } from '../systems/CombatArt';
import { Sfx } from '../systems/Sfx';
import { COLORS, CSS, FLOOR_BOTTOM, FLOOR_TOP, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { BOSSES } from '../data/bosses';
import { BREAKABLE_DROPS, ENEMIES, type EnemyId } from '../data/enemies';
import { pickDrop, type ItemId } from '../data/items';
import { buildLevel, type LevelPlan } from '../data/levels';
import { getMission, type MissionDef } from '../data/missions';
import { POWERS } from '../data/upgrades';
import { Boss, type BossHost } from '../entities/Boss';
import { Breakable } from '../entities/Breakable';
import { Enemy, statsFromDef } from '../entities/Enemy';
import type { Hit } from '../entities/Fighter';
import { Pickup } from '../entities/Pickup';
import { Player, type PlayerAction } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { Input } from '../systems/Input';
import { DEBUG_ENABLED } from '../systems/Debug';
import { drawStreet } from '../systems/LevelArt';
import { Music, stageMusic } from '../systems/Music';
import { footer, panel, text } from '../ui/ui';

type Phase = 'roam' | 'fight' | 'boss' | 'done';

const EDGE = 60; // margen del jugador con los bordes de la cámara

/**
 * Nivel jugable estilo Streets of Rage:
 * avanzas por la calle, la cámara se bloquea en cada zona hasta vencer sus oleadas de fanáticos,
 * y al final te espera el falso guitarrista de la misión.
 */
export class GameScene extends Phaser.Scene implements BossHost {
  mission!: MissionDef;
  player!: Player;
  moneyCollected = 0;
  boss: Boss | null = null;
  /** Último enemigo golpeado (el HUD muestra su vida). */
  lastTarget: Enemy | null = null;
  /** Mostrar el aviso "GO ▶" hasta este instante. */
  goUntil = 0;

  private input2!: Input;
  private plan!: LevelPlan;
  private phase: Phase = 'roam';
  private zoneIndex = 0;
  private waveIndex = 0;
  private lockedX: number | null = null;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private breakables: Breakable[] = [];
  private pickups: Pickup[] = [];
  private tokens = new Set<number>();
  private maxAttackers = 2;
  private hitStopUntil = 0;
  /** Diálogo de presentación del jefe abierto: el juego queda congelado hasta pulsar ENTER. */
  private bossDialog: Phaser.GameObjects.Container | null = null;
  /** Enemigos de la oleada que aún no han entrado (aparecen escalonados). */
  private pendingSpawns = 0;
  private finished = false;
  private previewBoss = false;
  private debugHurt?: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENES.Game);
  }

  init(data: { missionId: number; previewBoss?: boolean }) {
    this.previewBoss = import.meta.env.DEV && !!data.previewBoss;
    this.mission = getMission(data.missionId);
    this.plan = buildLevel(this.mission);
    this.moneyCollected = 0;
    this.boss = null;
    this.lastTarget = null;
    this.goUntil = 0;
    this.phase = 'roam';
    this.zoneIndex = 0;
    this.waveIndex = 0;
    this.lockedX = null;
    this.enemies = [];
    this.projectiles = [];
    this.breakables = [];
    this.pickups = [];
    this.tokens.clear();
    this.maxAttackers = this.mission.id >= 6 ? 3 : 2;
    this.hitStopUntil = 0;
    this.bossDialog = null;
    this.pendingSpawns = 0;
    this.finished = false;
  }

  preload() {
    // Solo el tema de esta misión (los temas son pesados en memoria).
    Music.loadStage(this, this.mission.id);
  }

  create() {
    Music.play(this, stageMusic(this.mission.id));
    const length = this.plan.length;
    this.cameras.main.setBounds(0, 0, length, GAME_HEIGHT);
    this.cameras.main.fadeIn(400, 7, 4, 15);
    this.input2 = new Input(this);

    drawStreet(this, this.mission, length, this.plan.bossX);
    this.breakables = this.plan.breakables.map((b) => new Breakable(this, b.x, b.y));
    this.player = new Player(this, 240, 860);
    this.player.onAction = (a) => this.handleAction(a);
    this.player.onDied = () => this.onPlayerDied();
    if (this.previewBoss) {
      this.phase = 'boss';
      this.lockedX = this.plan.bossX;
      this.cameras.main.scrollX = this.plan.bossX;
      this.player.x = this.plan.bossX + GAME_WIDTH * .4;
      this.player.syncDisplay();
      this.spawnBoss();
    }
    this.player.onDash = () => this.dashTrail();

    if (DEBUG_ENABLED) this.debugHurt = this.input.keyboard!.addKey('H');

    this.scene.launch(SCENES.HUD);
    // Al volver de la pausa, soltar teclas que quedaron "pegadas".
    const onResume = () => this.input.keyboard!.resetKeys();
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
      // Si se sale con el diálogo del jefe abierto, no dejar nada congelado (anims es global).
      this.anims.resumeAll();
      this.time.paused = false;
      this.scene.stop(SCENES.HUD);
    });
  }

  // ======================================================================
  // Debug (menú F1)
  // ======================================================================

  /** Salta directo a la arena del jefe. */
  debugJumpToBoss(): void {
    if (this.boss || this.finished) return;
    this.debugClearEnemies();
    this.zoneIndex = this.plan.zones.length;
    this.lockedX = null;
    this.phase = 'roam';
    this.cameras.main.scrollX = this.plan.bossX - 10;
    this.player.x = this.plan.bossX + 900;
  }

  /** Derrota a todos los fanáticos en pantalla (no al jefe). */
  debugClearEnemies(): void {
    for (const e of this.enemies) if (e !== this.boss && e.alive) e.receive({ damage: 99999, dir: 1, knockdown: true, heavy: true });
  }

  /** Recupera vida y stamina al máximo. */
  debugHeal(): void {
    this.player.heal(1);
    this.player.addStamina(1);
  }

  /** Completa la misión al instante (como si hubiera ganado). */
  debugWin(): void {
    if (this.finished) return;
    this.complete();
  }

  // ======================================================================
  // Bucle principal
  // ======================================================================

  update(_time: number, deltaMs: number) {
    if (this.input2.justDown('back') && !this.finished) {
      this.scene.pause();
      this.scene.pause(SCENES.HUD);
      this.scene.launch(SCENES.Pause, { missionId: this.mission.id });
      return;
    }
    // Presentación del jefe: todo quieto hasta que el jugador confirme.
    if (this.bossDialog) {
      this.updateCamera();
      this.input2.justDown('attack'); // descarta clics hechos durante el diálogo
      this.input2.justDown('power1');
      if (this.input2.justDown('confirm')) this.closeBossDialog();
      return;
    }
    // Hit-stop: congela la acción unos milisegundos al conectar un golpe (sensación de impacto).
    if (this.time.now < this.hitStopUntil) return;
    const dt = Math.min(deltaMs, 50) / 1000;

    const { minX, maxX } = this.updateCamera();
    this.player.update(dt, this.input2, minX, maxX);
    this.resolvePlayerMelee();

    for (const e of this.enemies) e.update(dt);
    this.enemies = this.enemies.filter((e) => !e.removable);

    this.updateProjectiles(dt);
    this.updatePickups();
    this.updateProgress();

    if (this.debugHurt && Phaser.Input.Keyboard.JustDown(this.debugHurt)) {
      this.player.receive({ damage: 20, dir: -1 });
    }
  }

  // ======================================================================
  // Cámara, zonas y oleadas
  // ======================================================================

  private updateCamera(): { minX: number; maxX: number } {
    const cam = this.cameras.main;
    if (this.lockedX !== null) {
      // Bloqueada: se desliza hasta la zona y se queda quieta.
      cam.scrollX += (this.lockedX - cam.scrollX) * 0.15;
      return { minX: this.lockedX + EDGE, maxX: this.lockedX + GAME_WIDTH - EDGE };
    }
    // Libre: solo avanza, nunca retrocede. Se bloquea al llegar a la siguiente zona.
    const nextLock = this.zoneIndex < this.plan.zones.length ? this.plan.zones[this.zoneIndex].x : this.plan.bossX;
    let target = Math.max(cam.scrollX, this.player.x - GAME_WIDTH * 0.4);
    if (target >= nextLock && this.phase === 'roam') {
      target = nextLock;
      this.lockArena(nextLock);
    }
    cam.scrollX = Math.min(target, this.plan.length - GAME_WIDTH);
    return { minX: cam.scrollX + EDGE, maxX: Math.min(this.plan.length - EDGE, cam.scrollX + GAME_WIDTH - EDGE) };
  }

  private lockArena(x: number): void {
    this.lockedX = x;
    this.goUntil = 0;
    if (this.zoneIndex < this.plan.zones.length) {
      this.phase = 'fight';
      this.waveIndex = 0;
      this.spawnWave();
    } else {
      this.phase = 'boss';
      this.spawnBoss();
    }
  }

  private spawnWave(): void {
    const wave = this.plan.zones[this.zoneIndex].waves[this.waveIndex];
    wave.forEach((id, i) => {
      // Entran por ambos lados, escalonados.
      const side = i % 2 === 0 ? 1 : -1;
      this.pendingSpawns++;
      this.time.delayedCall(i * 350, () => {
        this.pendingSpawns--;
        this.spawnEnemy(id, side);
      });
    });
  }

  private spawnEnemy(id: EnemyId, side: 1 | -1): Enemy {
    const base = this.lockedX ?? this.cameras.main.scrollX;
    const x = side === 1 ? base + GAME_WIDTH + 120 : base - 120;
    const y = Phaser.Math.Between(FLOOR_TOP + 20, FLOOR_BOTTOM - 10);
    const texture = id === 'punk' ? Phaser.Math.RND.pick(['enemy-punk', 'enemy-punk-blue', 'enemy-punk-red']) : `enemy-${id}`;
    const e = new Enemy(this, this, statsFromDef(ENEMIES[id], this.plan.hpMult, this.plan.dmgMult), texture, x, y);
    this.enemies.push(e);
    return e;
  }

  private spawnBoss(): void {
    const def = BOSSES[this.mission.id];
    const x = this.plan.bossX + GAME_WIDTH - 260;
    this.boss = new Boss(this, this, def, this.mission.boss, x, 860);
    this.enemies.push(this.boss);
    this.lastTarget = this.boss;
    this.boss.facing = -1;
    this.boss.syncDisplay();
    this.openBossDialog(def.taunt);
  }

  /** Al cerrar el diálogo: empieza la pelea (escoltas y primer ataque con un pequeño margen). */
  private closeBossDialog(): void {
    const d = this.bossDialog;
    if (!d) return;
    this.bossDialog = null;
    this.anims.resumeAll();
    this.tweens.resumeAll();
    this.time.paused = false;
    this.tweens.add({ targets: d, alpha: 0, duration: 180, onComplete: () => d.destroy() });
    this.input.keyboard!.resetKeys();
    if (this.boss) this.boss.holdAttacks(900);
    this.plan.bossEscort.forEach((id, i) => this.time.delayedCall(600 + i * 400, () => this.spawnEnemy(id, i % 2 === 0 ? -1 : 1)));
  }

  /** Diálogo de presentación del jefe (modal): retrato, nombre, defecto y frase. */
  private openBossDialog(taunt: string): void {
    const W = 1100;
    const H = 330;
    const x0 = (GAME_WIDTH - W) / 2;
    const y0 = (GAME_HEIGHT - H) / 2 - 20;
    const cx = GAME_WIDTH / 2;
    const tw = W - 120;
    // Congela TODO lo que se mueve: animaciones de sprites, tweens (neones, objetos) y temporizadores.
    this.anims.pauseAll();
    this.tweens.pauseAll();
    this.time.paused = true;
    const d = this.add.container(0, 0).setScrollFactor(0).setDepth(9000);
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.65).setOrigin(0);
    const box = panel(this, x0, y0, W, H, COLORS.red);
    const label = text(this, cx, y0 + 50, 'JEFE · FALSO GUITARRISTA', { font: 'head', size: 22, color: CSS.red, glow: CSS.red, origin: [0.5, 0.5] });
    const name = text(this, cx, y0 + 115, this.mission.boss, { font: 'head', size: 60, color: CSS.white, origin: [0.5, 0.5], wrap: tw, align: 'center' });
    const flaw = text(this, cx, y0 + 180, this.mission.bossFlaw, { size: 26, color: CSS.grey, origin: [0.5, 0.5], wrap: tw, align: 'center' });
    const say = text(this, cx, y0 + 255, `"${taunt}"`, { size: 34, bold: true, color: CSS.yellow, origin: [0.5, 0.5], wrap: tw, align: 'center' });
    const hint = footer(this, 'ENTER  ¡A PELEAR!', y0 + H + 60);
    hint.setScrollFactor(0);
    d.add([dim, box, label, name, flaw, say, hint]);
    // Aparece de golpe: los tweens están congelados mientras el diálogo esté abierto.
    this.bossDialog = d;
  }

  private updateProgress(): void {
    if (this.phase !== 'fight') return;
    if (this.pendingSpawns > 0 || this.enemies.some((e) => e.alive)) return;
    const zone = this.plan.zones[this.zoneIndex];
    this.waveIndex++;
    if (this.waveIndex < zone.waves.length) {
      this.spawnWave();
      return;
    }
    // Zona limpia: se desbloquea la cámara.
    this.zoneIndex++;
    this.lockedX = null;
    this.phase = 'roam';
    this.goUntil = this.time.now + 3000;
  }

  // ======================================================================
  // Golpes del jugador
  // ======================================================================

  private resolvePlayerMelee(): void {
    const p = this.player;
    const hb = p.hitbox;
    if (!hb) return;
    const inReach = (t: { x: number; y: number; z: number }) => {
      const dx = (t.x - p.x) * p.facing;
      return dx >= -30 && dx <= hb.reach && Math.abs(t.y - p.y) <= 50 && Math.abs(t.z - p.z) < 130;
    };

    for (const e of this.enemies) {
      if (hb.hit.has(e) || !e.hittable || !inReach(e)) continue;
      hb.hit.add(e);
      const damage = Math.round(hb.damage * p.damageMult);
      e.receive({ damage, dir: p.facing, knockdown: hb.knockdown, heavy: hb.knockdown, force: hb.knockdown ? 560 : 200 });
      this.onPlayerHit(e, damage, hb.knockdown);
    }
    for (const b of this.breakables) {
      if (b.broken || hb.hit.has(b) || !inReach(b)) continue;
      hb.hit.add(b);
      this.breakObject(b, p.facing);
    }
  }

  /** Efectos comunes cuando el jugador conecta un golpe. */
  private onPlayerHit(e: Enemy, damage: number, heavy: boolean): void {
    Sfx.play(this, heavy ? 'heavy' : 'hit');
    this.player.onHitLanded();
    this.lastTarget = e;
    this.hitStopUntil = this.time.now + (heavy ? 90 : 50);
    this.spark(e.x - this.player.facing * 20, e.y - e.z - 120 * e.sprite.scaleY, heavy ? COLORS.yellow : COLORS.white, heavy ? 1.4 : 1);
    this.damageNumber(e.x, e.y - e.z - e.visualHeight - 10, damage, heavy);
    if (heavy) this.cameras.main.shake(90, 0.004);
  }

  private breakObject(b: Breakable, dir: 1 | -1): void {
    b.break(dir);
    Sfx.play(this, 'break');
    this.spark(b.x, b.y - 60, COLORS.white, 1);
    const id = pickDrop(BREAKABLE_DROPS, this.lowHealth) ?? 'coin';
    this.dropItem(id, b.x, b.y);
  }

  private get lowHealth(): boolean {
    return this.player.hp < this.player.maxHp * 0.35;
  }

  // ======================================================================
  // Ataques de enemigos (EnemyHost / BossHost)
  // ======================================================================

  get enemyCount(): number {
    return this.enemies.filter((e) => e.alive && e !== this.boss).length;
  }

  tokenFree(e: Enemy): boolean {
    return this.tokens.has(e.id) || this.tokens.size < this.maxAttackers;
  }

  requestToken(e: Enemy): boolean {
    if (!this.tokenFree(e)) return false;
    this.tokens.add(e.id);
    return true;
  }

  releaseToken(e: Enemy): void {
    this.tokens.delete(e.id);
  }

  enemyStrike(e: Enemy, reach: number, damage: number, knockdown: boolean): void {
    const p = this.player;
    const dx = (p.x - e.x) * e.facing;
    if (dx < -20 || dx > reach + 30 || Math.abs(p.y - e.y) > 50 || p.z > 120) return;
    if (p.receive({ damage, dir: e.facing, knockdown, force: knockdown ? 600 : 220 })) {
      this.spark(p.x, p.y - p.z - 130, COLORS.red, knockdown ? 1.3 : 1);
      this.hitStopUntil = this.time.now + 60;
    }
  }

  enemyShoot(e: Enemy, kind: 'bottle' | 'note' | 'contract', damage: number): void {
    const [width, height] = PROJECTILE_SIZE[kind];
    const sprite = combatImage(this, 0, 0, kind, width, height, true);
    const speed = kind === 'bottle' ? 760 : kind === 'contract' ? 650 : 900;
    this.projectiles.push(
      new Projectile(sprite, e.x + e.facing * 60, e.y, 120, e.facing * speed, 1500, damage, {
        fromPlayer: false,
        spin: kind === 'bottle',
        slow: kind === 'contract' ? 3000 : undefined,
      }),
    );
  }

  bossScale(b: Boss, damage: number): void {
    // DO RE MI FA SOL LA ... y nunca SI: el 7.º carril (la séptima) es el carril seguro.
    const notes = ['DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI'];
    const laneY = (i: number) => FLOOR_BOTTOM - 10 - (i * (FLOOR_BOTTOM - FLOOR_TOP - 30)) / 6;
    const safeY = laneY(6);
    const cam = this.cameras.main;
    const hint = this.add.graphics().setDepth(safeY - 2);
    for (let x = cam.scrollX; x < cam.scrollX + GAME_WIDTH; x += 40) hint.lineStyle(3, COLORS.green, 0.35).lineBetween(x, safeY, x + 20, safeY);
    const label = text(this, cam.scrollX + 30, safeY - 50, '7ª', { font: 'head', size: 28, color: CSS.green, glow: CSS.green }).setDepth(safeY);
    this.time.delayedCall(1600, () => {
      hint.destroy();
      label.destroy();
    });
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 170, () => {
        if (!b.alive) return;
        const y = laneY(i);
        const c = this.add.container(0, 0, [
          this.add.image(0, 0, 'note'),
          text(this, 0, -46, notes[i], { font: 'head', size: 22, color: CSS.white, stroke: true, origin: [0.5, 0.5] }),
        ]);
        this.projectiles.push(new Projectile(c, b.x + b.facing * 40, y, 100, b.facing * 1000, 2300, damage, { fromPlayer: false }));
      });
    }
  }

  bossArpeggio(b: Boss, damage: number): void {
    // Tríada: tu carril y los dos vecinos a la vez.
    const p = this.player;
    for (const off of [-110, 0, 110]) {
      const y = Phaser.Math.Clamp(p.y + off, FLOOR_TOP + 10, FLOOR_BOTTOM);
      this.projectiles.push(new Projectile(this.add.image(0, 0, 'note'), b.x + b.facing * 60, y, 110, b.facing * 950, 1800, damage, { fromPlayer: false }));
    }
  }

  bossCallout(b: Boss, str: string): void {
    const cam = this.cameras.main;
    const x = Phaser.Math.Clamp(b.x, cam.scrollX + 320, cam.scrollX + GAME_WIDTH - 320);
    const y = Math.max(200, b.y - b.visualHeight - 50);
    const t = text(this, x, y, str, { font: 'head', size: 32, color: CSS.yellow, glow: CSS.yellow, stroke: true, origin: [0.5, 1] }).setDepth(8500);
    t.setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: y - 30, delay: 1500, duration: 400, onComplete: () => t.destroy() });
  }

  bossSlam(b: Boss, radius: number, damage: number): void {
    Sfx.play(this, 'slam');
    // Onda expansiva en el suelo: se esquiva saliendo de su radio (el dash ayuda a alejarse rápido).
    for (let i = 0; i < 3; i++) {
      const ring = this.add.ellipse(b.x, b.y, 60, 22).setStrokeStyle(8 - i * 2, COLORS.orange).setDepth(b.y - 1);
      this.tweens.add({ targets: ring, scaleX: (radius * 2) / 60, scaleY: (radius * 0.9) / 22, alpha: 0, delay: i * 80, duration: 450, onComplete: () => ring.destroy() });
    }
    this.cameras.main.shake(260, 0.01);
    const p = this.player;
    if (Math.abs(p.x - b.x) < radius && Math.abs(p.y - b.y) < radius * 0.45 && p.z < 40) {
      p.receive({ damage, dir: p.x > b.x ? 1 : -1, knockdown: true, force: 700 });
    }
  }

  bossSummon(_b: Boss, ids: EnemyId[]): void {
    ids.forEach((id, i) => this.time.delayedCall(i * 300, () => this.spawnEnemy(id, i % 2 === 0 ? 1 : -1)));
  }

  onEnemyDefeated(e: Enemy): void {
    if (this.lastTarget === e) this.time.delayedCall(800, () => this.lastTarget === e && (this.lastTarget = null));
    if (e === this.boss) {
      this.onBossDefeated();
      return;
    }
    const id = pickDrop(e.stats.drops, this.lowHealth);
    if (id) this.dropItem(id, e.x, e.y);
  }

  private onBossDefeated(): void {
    this.phase = 'done';
    // El resto de fanáticos huye derrotado.
    for (const e of this.enemies) if (e !== this.boss && e.alive) e.receive({ damage: 9999, dir: e.x > this.player.x ? 1 : -1, knockdown: true, heavy: true });
    // Lluvia de propinas del público
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 120, () => this.dropItem(i % 2 ? 'bill' : 'cash', this.boss!.x + Phaser.Math.Between(-200, 200), Phaser.Math.Between(FLOOR_TOP + 40, FLOOR_BOTTOM)));
    this.floatText(this.cameras.main.scrollX + GAME_WIDTH / 2, 420, '¡FRAUDE EXPUESTO!', CSS.yellow, 64);
    // Todo el dinero vuela solo hacia Axel (también lo que sueltan los fanáticos al caer).
    this.time.delayedCall(1000, () => this.magnetMoney());
    this.time.delayedCall(2200, () => this.magnetMoney());
    this.time.delayedCall(3200, () => this.complete());
  }

  /** Imán de dinero: cada billete/moneda en el suelo vuela hacia el jugador y se cobra. */
  private magnetMoney(): void {
    const p = this.player;
    const money = this.pickups.filter((it) => it.def.money);
    this.pickups = this.pickups.filter((it) => !it.def.money);
    money.forEach((item, i) => {
      this.tweens.add({
        targets: item.sprite,
        x: p.x,
        y: p.y - p.z - 120,
        scale: 0.6,
        delay: Math.min(i * 40, 400), // termina antes de que cierre la misión (3.2 s)
        duration: 380,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.collect(item);
          item.destroy();
        },
      });
    });
  }

  // ======================================================================
  // Poderes y efectos de los golpes del jugador
  // ======================================================================

  private handleAction(action: PlayerAction) {
    const p = this.player;
    const fx = p.x + p.facing * 80;
    const depth = p.y + 1;

    // Golpes cuerpo a cuerpo: la animación del sprite ya muestra el guitarrazo (sin efecto extra).
    if (action === 'combo1' || action === 'combo2' || action === 'combo3' || action === 'dashAttack') return;

    const def = POWERS.find((x) => x.id === action)!;
    const lvl = p.powerLevel(action);
    const damage = Math.round(def.baseDamage * (1 + 0.25 * (lvl - 1)) * p.damageMult);

    if (action === 'powerChord') {
      // Onda de sonido en línea recta; atraviesa desde nivel 3; doble onda en nivel 5.
      const waves = lvl >= 5 ? 2 : 1;
      for (let i = 0; i < waves; i++) {
        this.time.delayedCall(i * 140, () => {
          const wave = combatImage(this, 0, 0, 'fx-wave', 128, 166).setFlipX(p.facing === -1);
          this.projectiles.push(new Projectile(wave, fx, p.y, 110, p.facing * 1500, 560 + lvl * 80, damage, { fromPlayer: true, pierce: lvl >= 3 }));
        });
      }
      return;
    }

    if (action === 'feedback') {
      // Explosión de sonido alrededor: tumba a todos los cercanos.
      const radius = 220 + lvl * 45;
      for (let i = 0; i < 3; i++) {
        const ring = combatImage(this, p.x, p.y - 40, 'fx-ring', 80, 36).setAlpha(1 - i * .15).setDepth(depth);
        this.tweens.add({ targets: ring, scaleX: ring.scaleX * (radius * 2) / 80, scaleY: ring.scaleY * (radius * 0.9) / 36, alpha: 0, delay: i * 70, duration: 420, onComplete: () => ring.destroy() });
      }
      this.cameras.main.shake(180, 0.006);
      for (const e of this.enemies) {
        if (!e.hittable || Math.abs(e.x - p.x) > radius || Math.abs(e.y - p.y) > 160) continue;
        e.receive({ damage, dir: e.x >= p.x ? 1 : -1, knockdown: true, heavy: true, force: 650, stun: lvl >= 3 ? 1000 : 300 });
        this.onPlayerHit(e, damage, true);
      }
      for (const b of this.breakables) if (!b.broken && Math.abs(b.x - p.x) < radius && Math.abs(b.y - p.y) < 160) this.breakObject(b, b.x >= p.x ? 1 : -1);
      return;
    }

    // Solo de guitarra: rayos en toda la pantalla.
    this.cameras.main.flash(250, 255, 225, 77);
    const cam = this.cameras.main;
    for (let i = 0; i < 8; i++) {
      const x = cam.scrollX + (i + .5) * GAME_WIDTH / 8 + Phaser.Math.Between(-40, 40);
      const bolt = combatImage(this, x, FLOOR_BOTTOM / 2, 'fx-bolt', 65 + i % 3 * 18, FLOOR_BOTTOM).setDepth(6000).setFlipX(i % 2 === 1);
      this.tweens.add({ targets: bolt, alpha: 0, delay: i * 18, duration: 420, onComplete: () => bolt.destroy() });
    }
    const soloDamage = Math.round(def.baseDamage * (1 + 0.3 * (lvl - 1)) * p.damageMult);
    for (const e of this.enemies) {
      if (!e.hittable || e.x < cam.scrollX - 50 || e.x > cam.scrollX + GAME_WIDTH + 50) continue;
      e.receive({ damage: soloDamage, dir: e.x >= p.x ? 1 : -1, knockdown: true, heavy: true, force: 500 });
      this.onPlayerHit(e, soloDamage, true);
    }
    if (lvl >= 5) p.heal(0.2);
  }

  // ======================================================================
  // Proyectiles
  // ======================================================================

  /** Estela del dash: siluetas cian de Axel que se desvanecen. */
  private dashTrail(): void {
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 35, () => {
        const sp = this.player.sprite;
        const ghost = this.add
          .image(sp.x, sp.y, sp.texture.key, sp.frame.name)
          .setOrigin(sp.originX, sp.originY)
          .setScale(sp.scaleX, sp.scaleY)
          .setFlipX(sp.flipX)
          .setDepth(sp.depth - 1)
          .setTint(COLORS.cyan)
          .setAlpha(0.55);
        this.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
      });
    }
  }

  private updateProjectiles(dt: number): void {
    const p = this.player;
    for (const pr of this.projectiles) {
      pr.update(dt);
      if (pr.dead) continue;
      if (pr.opts.fromPlayer) {
        for (const e of this.enemies) {
          if (pr.hit.has(e) || !e.hittable || !pr.touches(e, 70)) continue;
          pr.hit.add(e);
          // El Power Chord es pesado: interrumpe incluso a los que tienen súper armadura.
          const hit: Hit = { damage: pr.damage, dir: pr.dir, heavy: true, stun: 420, force: 260 };
          e.receive(hit);
          this.onPlayerHit(e, pr.damage, false);
          if (!pr.opts.pierce) {
            pr.kill();
            break;
          }
        }
        // El Power Chord también rompe objetos del escenario.
        if (!pr.dead) {
          for (const b of this.breakables) {
            if (b.broken || !pr.touches(b, 60)) continue;
            this.breakObject(b, pr.dir);
            if (!pr.opts.pierce) pr.kill();
            break;
          }
        }
      } else if (p.hittable && pr.touches(p, 50)) {
        p.receive({ damage: pr.damage, dir: pr.dir, force: 260 });
        this.spark(pr.x, pr.y - pr.z, COLORS.red, 1);
        if (pr.opts.slow) {
          p.slowUntil = this.time.now + pr.opts.slow;
          this.floatText(p.x, p.y - 260, '¡CONTRATO! LENTO', CSS.orange);
        }
        pr.kill();
      }
    }
    this.projectiles = this.projectiles.filter((pr) => !pr.dead);
  }

  // ======================================================================
  // Consumibles
  // ======================================================================

  private dropItem(id: ItemId, x: number, y: number): void {
    const cam = this.cameras.main;
    const cx = Phaser.Math.Clamp(x, cam.scrollX + 80, cam.scrollX + GAME_WIDTH - 80);
    this.pickups.push(new Pickup(this, id, cx, Phaser.Math.Clamp(y, FLOOR_TOP + 20, FLOOR_BOTTOM)));
  }

  private updatePickups() {
    const p = this.player;
    this.pickups = this.pickups.filter((item) => {
      const touching = p.alive && Math.abs(item.x - p.x) < 60 && Math.abs(item.y - p.y) < 44 && p.z < 64;
      if (touching) {
        this.collect(item);
        item.destroy();
        return false;
      }
      if (item.tick()) {
        item.destroy();
        return false;
      }
      return true;
    });
  }

  private collect(item: Pickup) {
    const { def } = item;
    Sfx.play(this, def.money ? 'cash' : def.heal ? 'heal' : def.stamina ? 'energy' : def.extraLife ? 'life' : 'boost');
    const p = this.player;
    let label = '';
    let color: string = CSS.white;
    if (def.money) {
      this.moneyCollected += def.money;
      label = `+$${def.money}`;
      color = CSS.green;
    }
    if (def.heal) {
      p.heal(def.heal);
      label = def.heal >= 1 ? 'VIDA LLENA' : '+VIDA';
      color = CSS.red;
    }
    if (def.stamina) {
      p.addStamina(def.stamina);
      label = '+STAMINA';
      color = CSS.cyan;
    }
    if (def.extraLife) {
      p.lives++;
      label = '1UP';
      color = CSS.yellow;
    }
    if (def.damageBoostMs) {
      p.damageBoostUntil = this.time.now + def.damageBoostMs;
      label = 'DAÑO x2';
      color = CSS.orange;
    }
    this.floatText(item.x, item.y - 60, label, color);
  }

  // ======================================================================
  // Efectos visuales
  // ======================================================================

  /** Chispa de impacto en forma de estrella. */
  private spark(x: number, y: number, color: number, scale: number): void {
    const burst = combatImage(this, x, y, 'fx-impact', 92 * scale, 92 * scale).setDepth(7000);
    if (color !== COLORS.white && color !== COLORS.yellow) burst.setTint(color);
    burst.setAngle(Phaser.Math.Between(-18, 18));
    this.tweens.add({ targets: burst, scaleX: burst.scaleX * 1.45, scaleY: burst.scaleY * 1.45, alpha: 0, duration: 150, ease: 'Quad.easeOut', onComplete: () => burst.destroy() });

  }

  private damageNumber(x: number, y: number, n: number, big: boolean): void {
    const t = text(this, x + Phaser.Math.Between(-20, 20), y, String(n), {
      font: 'head', size: big ? 40 : 30, color: big ? CSS.yellow : CSS.white, stroke: true, origin: [0.5, 1],
    }).setDepth(8000);
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 650, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  private floatText(x: number, y: number, str: string, color: string, size = 36) {
    const t = text(this, x, y, str, { font: 'head', size, color, glow: color, origin: [0.5, 1], stroke: true }).setDepth(8000);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 900, delay: size > 40 ? 900 : 0, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  // ======================================================================
  // Fin de la misión
  // ======================================================================

  private onPlayerDied(): void {
    this.player.lives--;
    if (this.player.lives > 0) {
      this.time.delayedCall(900, () => {
        const cam = this.cameras.main;
        this.player.x = cam.scrollX + GAME_WIDTH * 0.35;
        this.player.respawn();
        // Al reaparecer empuja a los enemigos cercanos
        for (const e of this.enemies) if (e.hittable && Math.abs(e.x - this.player.x) < 400) e.receive({ damage: 0, dir: e.x >= this.player.x ? 1 : -1, knockdown: true, heavy: true });
      });
    } else {
      this.finished = true;
      this.time.delayedCall(1200, () => {
        this.scene.stop(SCENES.HUD);
        this.scene.start(SCENES.GameOver, { missionId: this.mission.id });
      });
    }
  }

  private complete() {
    this.finished = true;
    // Garantía: ningún dinero que quedó en el suelo se pierde al terminar la misión.
    for (const item of this.pickups) if (item.def.money) this.moneyCollected += item.def.money;
    this.scene.stop(SCENES.HUD);
    this.scene.start(SCENES.MissionComplete, { missionId: this.mission.id, moneyCollected: this.moneyCollected });
  }
}
