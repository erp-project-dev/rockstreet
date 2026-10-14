import Phaser from 'phaser';
import { COLORS, CSS, GAME_WIDTH, SCENES } from '../config';
import { POWERS, STATS, type PowerId, type StatId } from '../data/upgrades';
import { GameState } from '../systems/GameState';
import { Input } from '../systems/Input';
import { powerIcon } from '../systems/SkillArt';
import { MUSIC, Music } from '../systems/Music';
import { BACKGROUNDS, background } from '../ui/background';
import { footer, formatMoney, goTo, panel, text } from '../ui/ui';

type Entry =
  | { kind: 'stat'; id: StatId }
  | { kind: 'power'; id: PowerId };

const COLUMNS: Entry[][] = [
  STATS.map((s) => ({ kind: 'stat' as const, id: s.id })),
  POWERS.map((p) => ({ kind: 'power' as const, id: p.id })),
];

const COL_X = [60, 990];
const COL_W = 870;
const ACCENTS = [COLORS.cyan, COLORS.magenta];
const BAR_W = 420;
const ROW_Y = 260;
const ROW_H = 104;

/** Tienda entre misiones: gasta el dinero en estadísticas y poderes. */
export class BackstageScene extends Phaser.Scene {
  private input2!: Input;
  private col = 0;
  private row = 0;
  private layer!: Phaser.GameObjects.Container;
  private moneyText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.Backstage);
  }

  create() {
    Music.play(this, MUSIC.menu);
    this.cameras.main.fadeIn(250, 7, 4, 15);
    this.input2 = new Input(this);
    this.col = 0;
    this.row = 0;

    background(this, BACKGROUNDS.backstage, .18);

    text(this, 60, 50, 'BACKSTAGE', { font: 'logo', size: 80, color: CSS.magenta, glow: CSS.magenta });
    text(this, GAME_WIDTH - 60, 60, 'DINERO', { font: 'head', size: 24, color: CSS.grey, origin: [1, 0] });
    this.moneyText = text(this, GAME_WIDTH - 60, 90, '', { font: 'head', size: 52, color: CSS.green, glow: CSS.green, origin: [1, 0] });

    const titles: [string, string][] = [
      ['ESTADÍSTICAS', CSS.cyan],
      ['PODERES DE LA TRUENO', CSS.magenta],
    ];
    titles.forEach(([title, css], c) => {
      panel(this, COL_X[c], 180, COL_W, 610, ACCENTS[c]);
      text(this, COL_X[c] + 30, 200, title, { font: 'head', size: 28, color: css, glow: css });
    });
    panel(this, 60, 820, GAME_WIDTH - 120, 170, COLORS.darkGrey);
    footer(this, '↑ ↓ ← →  ELEGIR      ENTER  COMPRAR      ESC  MAPA');

    this.layer = this.add.container();
    this.render();
  }

  private levelBar(x: number, y: number, lvl: number, max: number, color: number) {
    const g = this.add.graphics();
    const total = BAR_W;
    const gap = 6;
    const w = (total - gap * (max - 1)) / max;
    for (let i = 0; i < max; i++) {
      const on = i < lvl;
      g.fillStyle(on ? color : COLORS.darkGrey, on ? 1 : 0.8).fillRoundedRect(x + i * (w + gap), y, w, 14, 4);
      if (on) g.fillStyle(0xffffff, 0.35).fillRect(x + i * (w + gap) + 2, y + 2, w - 4, 3);
    }
    return g;
  }

  private render() {
    const d = GameState.data;
    this.layer.removeAll(true);
    this.moneyText.setText(formatMoney(d.money));

    COLUMNS.forEach((entries, c) => {
      const x0 = COL_X[c] + 30;
      const accent = ACCENTS[c];
      entries.forEach((e, r) => {
        const y = ROW_Y + r * ROW_H;
        const sel = c === this.col && r === this.row;
        const { name, lvl, max, cost, locked } = this.describe(e);
        if (sel) {
          const hl = this.add.graphics();
          hl.fillStyle(COLORS.yellow, 0.1).fillRoundedRect(x0 - 16, y - 12, COL_W - 40, ROW_H - 12, 10);
          hl.lineStyle(2, COLORS.yellow, 0.9).strokeRoundedRect(x0 - 16, y - 12, COL_W - 40, ROW_H - 12, 10);
          this.layer.add(hl);
        }
        const titleX = e.kind === 'stat' ? x0 : x0 + 60;
        if (e.kind === 'power') {
          const icon = this.add.image(x0 + 24, y + 20, powerIcon(e.id)).setDisplaySize(48, 48).setAlpha(locked ? .25 : 1);
          if (locked) icon.setTint(0x777777);
          this.layer.add(icon);
        }
        this.layer.add(
          text(this, titleX, y, name.toUpperCase(), {
            font: 'head', size: 26, color: locked ? '#4a4366' : sel ? CSS.yellow : CSS.white, glow: sel ? CSS.yellow : undefined,
          }),
        );
        if (locked) {
          this.layer.add(text(this, x0, y + 46, '🔒  BLOQUEADO', { size: 24, bold: true, color: CSS.grey }));
        } else {
          this.layer.add(this.levelBar(x0, y + 54, lvl, max, accent));
          this.layer.add(text(this, x0 + BAR_W + 16, y + 44, `NV ${lvl}/${max}`, { size: 22, bold: true, color: CSS.grey }));
          const afford = cost !== null && cost <= d.money;
          const costStr = cost === null ? 'MÁX' : formatMoney(cost);
          this.layer.add(
            text(this, COL_X[c] + COL_W - 30, y + 4, costStr, {
              font: 'head', size: 30, color: cost === null ? CSS.cyan : afford ? CSS.green : CSS.red, origin: [1, 0],
            }),
          );
        }
      });
    });

    // Detalle del elemento seleccionado
    const e = COLUMNS[this.col][this.row];
    this.layer.add(text(this, 100, 850, this.detail(e), { wrap: GAME_WIDTH - 200, size: 32 }));
  }

  private describe(e: Entry) {
    if (e.kind === 'stat') {
      const def = STATS.find((s) => s.id === e.id)!;
      return { name: def.name, lvl: GameState.data.stats[e.id], max: def.maxLevel, cost: GameState.statCost(e.id), locked: false };
    }
    const def = POWERS.find((p) => p.id === e.id)!;
    const lvl = GameState.data.powers[e.id];
    return { name: def.name, lvl, max: def.maxLevel, cost: GameState.powerCost(e.id), locked: lvl === 0 };
  }

  private detail(e: Entry): string {
    if (e.kind === 'stat') {
      const def = STATS.find((s) => s.id === e.id)!;
      const st = GameState.stats();
      const now: Record<StatId, string> = {
        vida: `Vida máxima: ${st.maxHp}`,
        fuerza: `Multiplicador de daño: x${st.attackMult.toFixed(2)}`,
        resistencia: `Daño recibido: ${Math.round(st.damageTaken * 100)}%`,
        stamina: `Stamina máxima: ${st.maxStamina}`,
        recuperacion: `Recarga: ${st.staminaRegen.toFixed(1)} por segundo`,
      };
      return `${def.desc}\nActual → ${now[e.id]}`;
    }
    const def = POWERS.find((p) => p.id === e.id)!;
    const lvl = GameState.data.powers[e.id];
    if (lvl === 0) return `${def.desc}\nSe desbloquea al completar la misión ${def.unlockedByMission}.`;
    const next = Object.entries(def.milestones).find(([l]) => Number(l) > lvl);
    return (
      `${def.desc}\nNivel ${lvl} → ${def.milestones[lvl] ?? 'más daño y menos costo de stamina'}` +
      (next ? `      ·      Nivel ${next[0]} → ${next[1]}` : '')
    );
  }

  private buy() {
    const e = COLUMNS[this.col][this.row];
    const before = GameState.data.money;
    const ok = e.kind === 'stat' ? GameState.buyStat(e.id) : GameState.buyPower(e.id);
    if (ok) {
      this.cameras.main.flash(150, 255, 43, 214);
      // El gasto aparece junto al dinero para que la compra sea evidente.
      const t = text(this, GAME_WIDTH - 60, 150, `−${formatMoney(before - GameState.data.money)}`, {
        font: 'head', size: 34, color: CSS.red, glow: CSS.red, origin: [1, 0],
      });
      this.tweens.add({ targets: t, y: 190, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
    } else {
      this.cameras.main.shake(150, 0.004);
    }
    this.render();
  }

  update() {
    const inp = this.input2;
    let changed = false;
    if (inp.justDown('up')) {
      this.row = (this.row - 1 + COLUMNS[this.col].length) % COLUMNS[this.col].length;
      changed = true;
    }
    if (inp.justDown('down')) {
      this.row = (this.row + 1) % COLUMNS[this.col].length;
      changed = true;
    }
    const dx = inp.justDown('left') ? -1 : inp.justDown('right') ? 1 : 0;
    if (dx) {
      this.col = (this.col + dx + COLUMNS.length) % COLUMNS.length;
      this.row = Math.min(this.row, COLUMNS[this.col].length - 1);
      changed = true;
    }
    if (changed) this.render();
    if (inp.justDown('confirm')) this.buy();
    if (inp.justDown('back')) goTo(this, SCENES.WorldMap);
  }
}
