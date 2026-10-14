import Phaser from 'phaser';
import { COLORS, CSS, GAME_WIDTH, SCENES } from '../config';
import { getMission, type MissionDef } from '../data/missions';
import { GameState } from '../systems/GameState';
import { Input } from '../systems/Input';
import { MUSIC, Music } from '../systems/Music';
import { loreKey } from '../systems/WorldArt';
import { background } from '../ui/background';
import { footer, goTo, panel, synthwaveBackground, text } from '../ui/ui';

const STRIP_H = 210; // altura de las tarjetas Objetivo / Jefe
const HEADER_H = 210; // encabezado (misión, nombre, lugar) + separación con el panel
const AREA_TOP = 20; // zona útil para centrar: del borde superior...
const AREA_BOTTOM = 960; // ...hasta la barra de teclas
const INNER = 50; // margen interior del panel

/**
 * Lore de entrada de cada misión ("expediente"): encabezado, lore con máquina de escribir
 * y dos tarjetas abajo (OBJETIVO con recompensa, JEFE con su defecto).
 */
export class BriefingScene extends Phaser.Scene {
  private mission!: MissionDef;
  private input2!: Input;
  private loreDone = false;

  constructor() {
    super(SCENES.Briefing);
  }

  init(data: { missionId: number }) {
    this.mission = getMission(data.missionId);
    this.loreDone = false;
  }

  create() {
    Music.play(this, MUSIC.menu);
    const m = this.mission;
    this.cameras.main.fadeIn(300, 7, 4, 15);
    this.input2 = new Input(this);

    // Panel a ancho completo en todas las misiones; si hay ilustración, se ve detrás (panel translúcido).
    const illustrated = this.textures.exists(loreKey(m.id));
    if (illustrated) background(this, loreKey(m.id), 0.12);
    else synthwaveBackground(this, { sun: false });
    const px = 60;
    const pw = GAME_WIDTH - 120;
    const left = px + INNER;
    const width = pw - INNER * 2;

    // --- Medición previa del lore (para centrar todo el bloque verticalmente) ---
    // El ajuste de línea se calcula con el texto completo ANTES de escribirlo, así las palabras
    // no saltan de línea mientras aparecen.
    const probe = text(this, 0, 0, m.lore, { wrap: width, size: 36 });
    const wrapped = probe.getWrappedText(m.lore).join('\n');
    const loreH = probe.height - (probe.padding.top ?? 0) * 2;
    probe.destroy();

    // Bloque = encabezado (HEADER_H) + panel (lore + tarjetas). Se centra entre el borde superior y la barra de teclas.
    const panelH = 40 + loreH + 44 + STRIP_H + 40;
    const blockH = HEADER_H + panelH;
    const top = Math.max(20, AREA_TOP + (AREA_BOTTOM - AREA_TOP - blockH) / 2);
    const panelY = top + HEADER_H;
    const cardY = panelY + 40 + loreH + 44;

    // --- Encabezado: alineado a la izquierda con el contenido del panel ---
    const ho: [number, number] = [0, 0.5];
    text(this, left, top + 22, `MISIÓN ${m.id}`, { font: 'head', size: 28, color: CSS.magenta, glow: CSS.magenta, origin: ho });
    text(this, left, top + 88, m.name.toUpperCase(), { font: 'head', size: 68, color: CSS.cyan, glow: CSS.cyan, origin: ho });
    text(this, left, top + 156, m.location, { size: 30, bold: true, color: CSS.yellow, origin: ho, stroke: true });

    // --- Panel y lore con máquina de escribir ---
    panel(this, px, panelY, pw, panelH, COLORS.magenta);
    const lore = text(this, left, panelY + 40, '', { size: 36 });
    let i = 0;
    const typing = this.time.addEvent({
      delay: 22,
      repeat: wrapped.length - 1,
      callback: () => {
        lore.setText(wrapped.slice(0, ++i));
        if (i >= wrapped.length) this.loreDone = true;
      },
    });
    this.events.once('skip', () => {
      typing.remove();
      lore.setText(wrapped);
    });

    // --- Tarjetas: OBJETIVO | JEFE (debajo del lore) ---
    const gap = 24;
    const cardW = (width - gap) / 2;
    this.card(left, cardY, cardW, COLORS.magenta);
    this.card(left + cardW + gap, cardY, cardW, COLORS.red);

    // Objetivo + recompensa
    const ox = left + 28;
    text(this, ox, cardY + 38, 'OBJETIVO', { font: 'head', size: 22, color: CSS.magenta, glow: CSS.magenta, origin: [0, 0.5] });
    text(this, ox, cardY + 66, m.objective, { wrap: cardW - 56, size: 30, bold: true });
    const repeat = GameState.isCompleted(m.id);
    text(this, ox, cardY + STRIP_H - 38, repeat ? 'REPETICIÓN · solo el dinero que recojas' : `RECOMPENSA  $${m.reward}`, {
      font: 'head', size: 22, color: repeat ? CSS.grey : CSS.green, glow: repeat ? undefined : CSS.green, origin: [0, 0.5], wrap: cardW - 56,
    });

    // Jefe + defecto
    const bx = left + cardW + gap + 28;
    text(this, bx, cardY + 38, 'JEFE · FALSO GUITARRISTA', { font: 'head', size: 22, color: CSS.red, glow: CSS.red, origin: [0, 0.5] });
    text(this, bx, cardY + 66, m.boss, { font: 'head', size: 32, wrap: cardW - 56 });
    text(this, bx, cardY + 124, m.bossFlaw, { wrap: cardW - 56, size: 24, color: CSS.grey });

    footer(this, 'ENTER  ¡A TOCAR!      ESC  VOLVER', 1000);
  }

  /** Tarjeta de información con franja de color superior. */
  private card(x: number, y: number, w: number, color: number) {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(x, y, w, STRIP_H, 12);
    g.lineStyle(2, color, 0.5).strokeRoundedRect(x, y, w, STRIP_H, 12);
    g.fillStyle(color, 0.9).fillRoundedRect(x, y, w, 6, { tl: 12, tr: 12, bl: 0, br: 0 });
  }

  update() {
    if (this.input2.justDown('back')) return goTo(this, SCENES.WorldMap);
    if (this.input2.justDown('confirm')) {
      // Primer Enter completa el texto; el segundo arranca la misión.
      if (!this.loreDone) {
        this.loreDone = true;
        this.events.emit('skip');
      } else {
        goTo(this, SCENES.Game, { missionId: this.mission.id }, 400);
      }
    }
  }
}
