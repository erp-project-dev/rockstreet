import Phaser from 'phaser';
import { COLORS, CSS, GAME_WIDTH, SCENES } from '../config';
import { MISSIONS, type BandMember } from '../data/missions';
import { MAIN_OBJECTIVE } from '../data/story';
import { GameState } from '../systems/GameState';
import { Input } from '../systems/Input';
import { MUSIC, Music } from '../systems/Music';
import { BACKGROUNDS, background } from '../ui/background';
import { footer, formatMoney, goTo, neonLine, panel, text } from '../ui/ui';

const TOP_BAR = 120;
const INFO_Y = 830;

/** Mapa de Neon City: elegir misión. Se desbloquean en orden. */
export class WorldMapScene extends Phaser.Scene {
  private input2!: Input;
  private selected = 1;
  private cursor!: Phaser.GameObjects.Graphics;
  private info!: Phaser.GameObjects.Text;
  private infoName!: Phaser.GameObjects.Text;
  private infoStatus!: Phaser.GameObjects.Text;
  private infoBoss!: Phaser.GameObjects.Text;
  private shopKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENES.WorldMap);
  }

  create() {
    Music.play(this, MUSIC.menu);
    this.cameras.main.fadeIn(300, 7, 4, 15);
    this.input2 = new Input(this);
    this.shopKey = this.input.keyboard!.addKey('B');
    this.selected = GameState.nextMission();

    this.drawCity();
    this.drawRoutes();
    this.drawNodes();
    this.drawTopBar();

    this.cursor = this.add.graphics();
    this.tweens.add({ targets: this.cursor, alpha: 0.4, duration: 400, yoyo: true, repeat: -1 });

    panel(this, 40, INFO_Y, GAME_WIDTH - 80, 180, COLORS.cyan);
    this.infoName = text(this, 80, INFO_Y + 26, '', { font: 'head', size: 40, color: CSS.yellow, glow: CSS.yellow });
    this.infoStatus = text(this, GAME_WIDTH - 80, INFO_Y + 30, '', { font: 'head', size: 30, origin: [1, 0] });
    this.info = text(this, 80, INFO_Y + 90, '', { wrap: 1080, size: 28 });
    this.infoBoss = text(this, GAME_WIDTH - 80, INFO_Y + 96, '', { size: 28, bold: true, color: CSS.red, origin: [1, 0] });
    footer(this, '← →  ELEGIR      ENTER  JUGAR      B  BACKSTAGE      ESC  MENÚ');

    this.refresh();
  }

  /** City artwork beneath the interactive routes and mission nodes. */
  private drawCity() {
    background(this, BACKGROUNDS.map, .22);
  }

  private drawRoutes() {
    const g = this.add.graphics();
    for (let i = 0; i < MISSIONS.length - 1; i++) {
      const a = MISSIONS[i].mapPos;
      const b = MISSIONS[i + 1].mapPos;
      const done = GameState.isCompleted(MISSIONS[i].id);
      const color = done ? COLORS.magenta : COLORS.darkGrey;
      const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      for (let d = 0; d < dist; d += 26) {
        const t1 = d / dist;
        const t2 = Math.min(1, (d + 14) / dist);
        const x1 = a.x + (b.x - a.x) * t1;
        const y1 = a.y + (b.y - a.y) * t1;
        const x2 = a.x + (b.x - a.x) * t2;
        const y2 = a.y + (b.y - a.y) * t2;
        if (done) neonLine(g, x1, y1, x2, y2, color);
        else g.lineStyle(4, color, 0.9).lineBetween(x1, y1, x2, y2);
      }
    }
  }

  private drawNodes() {
    for (const m of MISSIONS) {
      const { x, y } = m.mapPos;
      const done = GameState.isCompleted(m.id);
      const unlocked = GameState.isUnlocked(m.id);
      const color = done ? COLORS.green : unlocked ? COLORS.yellow : COLORS.grey;
      const css = done ? CSS.green : unlocked ? CSS.yellow : CSS.grey;
      const r = m.id === MISSIONS.length ? 46 : 34;
      const g = this.add.graphics();
      if (unlocked) for (let i = 4; i > 0; i--) g.fillStyle(color, 0.06).fillCircle(x, y, r + i * 8);
      g.fillStyle(COLORS.bg).fillCircle(x, y, r);
      g.lineStyle(4, color).strokeCircle(x, y, r);
      text(this, x, y, unlocked ? String(m.id) : '?', { font: 'head', size: r, color: css, glow: unlocked ? css : undefined, origin: [0.5, 0.5] });
      if (unlocked) {
        text(this, x, y + r + 48, m.name.toUpperCase(), { font: 'head', size: 20, color: css, origin: [0.5, 0.5], stroke: true });
      }
      if (unlocked && !done) {
        const pulse = this.add.circle(x, y, r + 6).setStrokeStyle(3, COLORS.yellow);
        this.tweens.add({ targets: pulse, alpha: 0, scale: 1.6, duration: 1000, repeat: -1 });
      }
    }
  }

  private drawTopBar() {
    const d = GameState.data;
    const g = this.add.graphics();
    g.fillStyle(COLORS.bg, 0.85).fillRect(0, 0, GAME_WIDTH, TOP_BAR);
    neonLine(g, 0, TOP_BAR, GAME_WIDTH, TOP_BAR, COLORS.magenta);
    text(this, 40, 22, 'OBJETIVO', { font: 'head', size: 24, color: CSS.magenta, glow: CSS.magenta });
    text(this, 220, 18, MAIN_OBJECTIVE, { size: 32, bold: true });
    text(this, 40, 70, `NOCHE  ${Math.min(d.completed.length + 1, MISSIONS.length)} / ${MISSIONS.length}`, { font: 'head', size: 28, color: CSS.cyan });
    text(this, 400, 70, formatMoney(d.money), { font: 'head', size: 28, color: CSS.green, glow: CSS.green });

    // Estado de la banda: se encienden al rescatarlos.
    const members: BandMember[] = ['TAMBO', 'LOLA', 'KEI'];
    text(this, 1290, 46, 'BANDA', { font: 'head', size: 24, color: CSS.grey, origin: [0, 0.5] });
    members.forEach((name, i) => {
      const free = d.rescued.includes(name);
      const x = 1420 + i * 160;
      const box = this.add.graphics();
      box.fillStyle(free ? COLORS.yellow : COLORS.darkGrey, free ? 0.15 : 0.5).fillRoundedRect(x, 22, 140, 50, 10);
      box.lineStyle(2, free ? COLORS.yellow : COLORS.darkGrey).strokeRoundedRect(x, 22, 140, 50, 10);
      text(this, x + 70, 47, name, { font: 'head', size: 24, color: free ? CSS.yellow : CSS.grey, glow: free ? CSS.yellow : undefined, origin: [0.5, 0.5] });
    });
  }

  private refresh() {
    const m = MISSIONS[this.selected - 1];
    const { x, y } = m.mapPos;
    const r = (m.id === MISSIONS.length ? 46 : 34) + 22;
    this.cursor.clear();
    this.cursor.lineStyle(4, COLORS.cyan);
    // Esquinas tipo visor
    const c = 22;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = x + sx * r;
      const cy = y + sy * r;
      this.cursor.lineBetween(cx, cy, cx - sx * c, cy).lineBetween(cx, cy, cx, cy - sy * c);
    }
    const done = GameState.isCompleted(m.id);
    this.infoName.setText(`${m.id}.  ${m.name.toUpperCase()}`);
    this.infoStatus.setText(done ? '✔ COMPLETADA' : '● DISPONIBLE').setColor(done ? CSS.green : CSS.yellow);
    this.info.setText(`${m.location} — ${m.objective}`);
    this.infoBoss.setText(`JEFE: ${m.boss}`);
  }

  update() {
    const inp = this.input2;
    const dir = inp.justDown('right') || inp.justDown('up') ? 1 : inp.justDown('left') || inp.justDown('down') ? -1 : 0;
    if (dir) {
      const next = this.selected + dir;
      if (next >= 1 && next <= MISSIONS.length && GameState.isUnlocked(next)) {
        this.selected = next;
        this.refresh();
      }
    }
    if (inp.justDown('confirm')) { goTo(this, SCENES.Briefing, { missionId: this.selected }); }
    if (Phaser.Input.Keyboard.JustDown(this.shopKey)) { goTo(this, SCENES.Backstage); }
    if (inp.justDown('back')) {
      GameState.persist();
      goTo(this, SCENES.MainMenu);
    }
  }
}
