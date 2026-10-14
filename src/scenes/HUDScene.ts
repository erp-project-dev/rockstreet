import Phaser from 'phaser';
import { COLORS, CSS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { powerIcon } from '../systems/SkillArt';
import { PLAYER_ART } from '../systems/PlayerArt';
import { HERO_NAME } from '../data/story';
import type { PowerId } from '../data/upgrades';
import { formatMoney, keycap, neonLine, text } from '../ui/ui';
import type { GameScene } from './GameScene';

const POWER_SLOTS: { id: PowerId; key: string; label: string; color: number }[] = [
  { id: 'powerChord', key: 'CLIC DER.', label: 'POWER CHORD', color: COLORS.cyan },
  { id: 'feedback', key: 'Q', label: 'FEEDBACK', color: COLORS.magenta },
  { id: 'solo', key: 'E', label: 'SOLO', color: COLORS.yellow },
];

/**
 * Cuadrícula del HUD (franja superior de 140 px, 3 bloques):
 *  [retrato | nombre·vidas / vida / stamina / enemigo] [poderes] [dinero / misión / bonus]
 */
const HUD_H = 140;
const PAD = 24;
// Bloque jugador
const PORTRAIT = 108;
const INFO_X = PAD + PORTRAIT + 18; // 150
const BAR_W = 500;
const ROW_NAME = 30;
const HP_Y = 50;
const HP_H = 28;
const ST_Y = 88;
const ST_H = 12;
const ROW_TARGET = 120;
const DASH_X = INFO_X + 200;
// Bloque poderes
const SLOT_X = INFO_X + BAR_W + 50; // 700
const SLOT_W = 190;
const SLOT_GAP = 14;
const SLOT_Y = 18;
const SLOT_H = 104;
// Bloque derecho
const RIGHT_X = GAME_WIDTH - PAD;

/** HUD en escena paralela (no se mueve con la cámara). Lee el estado del GameScene cada frame. */
export class HUDScene extends Phaser.Scene {
  private game2!: GameScene;
  private bars!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private lives!: Phaser.GameObjects.Text;
  private money!: Phaser.GameObjects.Text;
  private boost!: Phaser.GameObjects.Text;
  private slotLabels: Phaser.GameObjects.Text[] = [];
  private powerIcons: Phaser.GameObjects.Image[] = [];
  private targetName!: Phaser.GameObjects.Text;
  private dashLabel!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  private bossBar!: Phaser.GameObjects.Graphics;
  private go!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.HUD);
  }

  create() {
    this.game2 = this.scene.get(SCENES.Game) as GameScene;
    this.slotLabels = [];
    this.powerIcons = [];

    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.bg, COLORS.bg, COLORS.bg, COLORS.bg, 0.96, 0.96, 0.82, 0.82).fillRect(0, 0, GAME_WIDTH, HUD_H);
    neonLine(bg, 0, HUD_H, GAME_WIDTH, HUD_H, COLORS.magenta, 0.8);
    // Separadores sutiles entre bloques
    bg.lineStyle(2, COLORS.purple, 0.35);
    for (const x of [SLOT_X - 25, RIGHT_X - 340]) bg.lineBetween(x, 20, x, HUD_H - 20);

    // --- Jugador ---
    const py = (HUD_H - PORTRAIT) / 2;
    bg.fillStyle(COLORS.bgPanel).fillRoundedRect(PAD, py, PORTRAIT, PORTRAIT, 12);
    const portrait = this.add.image(PAD + PORTRAIT / 2, py + PORTRAIT / 2, PLAYER_ART, 'portrait').setDisplaySize(PORTRAIT - 4, PORTRAIT - 4);
    const mask = this.make.graphics({}, false).fillRoundedRect(PAD + 2, py + 2, PORTRAIT - 4, PORTRAIT - 4, 10);
    portrait.setMask(mask.createGeometryMask());
    bg.lineStyle(3, COLORS.cyan).strokeRoundedRect(PAD, py, PORTRAIT, PORTRAIT, 12);

    text(this, INFO_X, ROW_NAME, HERO_NAME, { font: 'head', size: 24, color: CSS.yellow, glow: CSS.yellow, origin: [0, 0.5] });
    this.lives = text(this, INFO_X + BAR_W, ROW_NAME, '', { font: 'head', size: 22, origin: [1, 0.5] });
    this.bars = this.add.graphics();
    this.hpText = text(this, INFO_X + 14, HP_Y + HP_H / 2, '', { size: 20, bold: true, origin: [0, 0.5] });
    this.targetName = text(this, INFO_X, ROW_TARGET, '', { font: 'head', size: 16, color: CSS.white, origin: [0, 0.5] });
    // Dash (Espacio): etiqueta + mini barra de recarga, entre el nombre y las vidas
    this.dashLabel = text(this, DASH_X, ROW_NAME, 'DASH', { font: 'head', size: 16, origin: [0, 0.5] });

    // --- Poderes ---
    POWER_SLOTS.forEach((s, i) => {
      const cx = SLOT_X + i * (SLOT_W + SLOT_GAP) + SLOT_W / 2;
      this.powerIcons.push(this.add.image(cx, SLOT_Y + 46, powerIcon(s.id)).setDisplaySize(54, 54));
      this.slotLabels.push(text(this, cx, SLOT_Y + SLOT_H - 16, '', { font: 'head', size: 14, origin: [0.5, 0.5] }));
      // Tecla del poder en la esquina (keycap)
      const cap = keycap(this, 0, SLOT_Y + 20, s.key, 14, s.color);
      cap.container.setX(SLOT_X + i * (SLOT_W + SLOT_GAP) + 8 + cap.width / 2).setDepth(1);
    });

    // --- Derecha: dinero, misión y bonus ---
    this.money = text(this, RIGHT_X, 40, '', { font: 'head', size: 44, color: CSS.green, glow: CSS.green, origin: [1, 0.5] });
    text(this, RIGHT_X, 88, `${this.game2.mission.id}. ${this.game2.mission.name.toUpperCase()}`, { font: 'head', size: 20, color: CSS.cyan, origin: [1, 0.5] });
    this.boost = text(this, RIGHT_X, ROW_TARGET, '', { font: 'head', size: 18, color: CSS.orange, glow: CSS.orange, origin: [1, 0.5] });

    // --- Jefe (abajo) ---
    this.bossBar = this.add.graphics();
    this.bossName = text(this, GAME_WIDTH / 2, GAME_HEIGHT - 92, '', { font: 'head', size: 28, color: CSS.red, glow: CSS.red, origin: [0.5, 0.5] });

    // --- Aviso de avanzar ---
    this.go = text(this, GAME_WIDTH - 60, GAME_HEIGHT / 2, 'GO ▶', { font: 'head', size: 72, color: CSS.yellow, glow: CSS.yellow, origin: [1, 0.5] }).setVisible(false);
    this.tweens.add({ targets: this.go, alpha: 0.2, duration: 300, yoyo: true, repeat: -1 });
  }

  private bar(g: Phaser.GameObjects.Graphics, y: number, h: number, pct: number, color: number, x = INFO_X, barW = BAR_W) {
    g.fillStyle(0x000000, 0.6).fillRoundedRect(x - 3, y - 3, barW + 6, h + 6, (h + 6) / 2);
    g.fillStyle(COLORS.darkGrey).fillRoundedRect(x, y, barW, h, h / 2);
    const w = Math.max(0, Math.round(barW * Phaser.Math.Clamp(pct, 0, 1)));
    if (w > h) {
      g.fillStyle(color).fillRoundedRect(x, y, w, h, h / 2);
      g.fillStyle(0xffffff, 0.3).fillRoundedRect(x + 4, y + 3, w - 8, h * 0.3, h * 0.15);
    }
  }

  update() {
    const p = this.game2.player;
    if (!p) return;
    const g = this.bars.clear();

    // --- Jugador ---
    const hpPct = p.hp / p.stats.maxHp;
    this.bar(g, HP_Y, HP_H, hpPct, hpPct > 0.3 ? COLORS.red : COLORS.orange);
    this.bar(g, ST_Y, ST_H, p.stamina / p.stats.maxStamina, COLORS.cyan);
    this.hpText.setText(`${Math.ceil(p.hp)} / ${p.stats.maxHp}`);
    this.lives.setText(`VIDAS ×${p.lives}`);
    const dashReady = p.dashReady;
    this.dashLabel.setColor(dashReady >= 1 ? CSS.cyan : '#4a4366');
    g.fillStyle(COLORS.darkGrey).fillRoundedRect(DASH_X + 62, ROW_NAME - 4, 90, 8, 4);
    g.fillStyle(dashReady >= 1 ? COLORS.cyan : COLORS.grey).fillRoundedRect(DASH_X + 62, ROW_NAME - 4, Math.max(8, 90 * dashReady), 8, 4);

    // Último enemigo golpeado (dentro de la franja, bajo la stamina)
    const t = this.game2.lastTarget;
    if (t && t !== this.game2.boss && t.maxHp > 0) {
      this.targetName.setText(t.name).setVisible(true);
      this.bar(g, ROW_TARGET - 5, 10, t.hp / t.maxHp, COLORS.yellow, INFO_X + 170, BAR_W - 170);
    } else {
      this.targetName.setVisible(false);
    }

    // --- Poderes: apagado si está bloqueado, se llena con la stamina, brilla si está listo ---
    POWER_SLOTS.forEach((s, i) => {
      const x = SLOT_X + i * (SLOT_W + SLOT_GAP);
      const locked = p.powerLevel(s.id) === 0;
      const ready = p.canUse(s.id);
      this.powerIcons[i].setAlpha(locked ? 0.18 : ready ? 1 : 0.45);
      if (locked) this.powerIcons[i].setTint(0x777777);
      else this.powerIcons[i].clearTint();
      g.fillStyle(COLORS.bgPanel, 0.9).fillRoundedRect(x, SLOT_Y, SLOT_W, SLOT_H, 12);
      if (!locked) {
        const fill = Math.min(1, p.stamina / p.powerCost(s.id));
        g.fillStyle(s.color, ready ? 0.3 : 0.1).fillRoundedRect(x, SLOT_Y, Math.max(24, SLOT_W * fill), SLOT_H, 12);
        if (ready) g.lineStyle(8, s.color, 0.2).strokeRoundedRect(x, SLOT_Y, SLOT_W, SLOT_H, 12);
      }
      g.lineStyle(3, locked ? COLORS.darkGrey : s.color, ready ? 1 : 0.45).strokeRoundedRect(x, SLOT_Y, SLOT_W, SLOT_H, 12);
      this.slotLabels[i]
        .setText(locked ? '· · ·' : s.label)
        .setColor(locked ? '#4a4366' : ready ? CSS.white : CSS.grey);
    });

    // --- Derecha ---
    this.money.setText(formatMoney(this.game2.moneyCollected));
    this.boost.setText(p.damageBoosted ? `DAÑO ×2 · ${Math.ceil((p.damageBoostUntil - this.time.now) / 1000)}s` : '');

    // --- Jefe ---
    const boss = this.game2.boss;
    const bb = this.bossBar.clear();
    if (boss && boss.alive) {
      const w = 1100;
      const x = (GAME_WIDTH - w) / 2;
      bb.fillStyle(COLORS.bg, 0.55).fillRoundedRect(x - 30, GAME_HEIGHT - 124, w + 60, 96, 18);
      this.bossName.setText(boss.isEnraged ? `${boss.bossName}  ·  ¡FURIOSO!` : boss.bossName).setVisible(true);
      this.bar(bb, GAME_HEIGHT - 68, 26, boss.hp / boss.maxHp, boss.isEnraged ? COLORS.orange : COLORS.red, x, w);
    } else {
      this.bossName.setVisible(false);
    }

    this.go.setVisible(this.time.now < this.game2.goUntil);
  }
}
