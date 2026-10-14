import Phaser from 'phaser';
import { COLORS, CSS, FONTS, GAME_HEIGHT, GAME_WIDTH } from '../config';

export interface TextOpts {
  size?: number;
  color?: string;
  font?: keyof typeof FONTS;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  origin?: [number, number];
  /** Color del halo neón (sombra difusa). */
  glow?: string;
  stroke?: boolean;
}

/** Texto HD. Por defecto: Chakra Petch 28px. `glow` añade halo de neón. */
export const text = (scene: Phaser.Scene, x: number, y: number, str: string, o: TextOpts = {}) => {
  const font = o.font ?? 'body';
  const t = scene.add.text(x, y, str, {
    fontFamily: FONTS[font],
    fontSize: `${o.size ?? 28}px`,
    fontStyle: o.bold || font === 'body' ? (o.bold ? '700' : '500') : undefined,
    color: o.color ?? CSS.white,
    align: o.align ?? 'left',
    lineSpacing: Math.round((o.size ?? 28) * 0.3),
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined,
    stroke: o.stroke ? '#07040f' : undefined,
    strokeThickness: o.stroke ? Math.max(4, Math.round((o.size ?? 28) / 6)) : 0,
    // El halo necesita margen o se recorta en una caja visible.
    padding: o.glow ? { x: Math.round((o.size ?? 28) * 0.9), y: Math.round((o.size ?? 28) * 0.9) } : { x: 4, y: 4 },
  });
  if (o.glow) t.setShadow(0, 0, o.glow, Math.round((o.size ?? 28) * 0.5), o.stroke, true);
  // Compensa el margen para que (x, y) siga marcando el borde visible del texto.
  const [ox, oy] = o.origin ?? [0, 0];
  const pad = t.padding;
  t.setOrigin(ox, oy).setPosition(x - (pad.left ?? 0) * (1 - 2 * ox), y - (pad.top ?? 0) * (1 - 2 * oy));
  return t;
};

/** Línea/contorno neón: halo ancho translúcido + núcleo brillante. */
export const neonRect = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, r = 12) => {
  g.lineStyle(10, color, 0.12).strokeRoundedRect(x, y, w, h, r);
  g.lineStyle(5, color, 0.3).strokeRoundedRect(x, y, w, h, r);
  g.lineStyle(2, color, 1).strokeRoundedRect(x, y, w, h, r);
  return g;
};

export const neonLine = (g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, color: number, alpha = 1) => {
  g.lineStyle(10, color, 0.12 * alpha).lineBetween(x1, y1, x2, y2);
  g.lineStyle(3, color, alpha).lineBetween(x1, y1, x2, y2);
  return g;
};

/** Panel translúcido con borde neón redondeado. */
export const panel = (scene: Phaser.Scene, x: number, y: number, w: number, h: number, border: number = COLORS.magenta) => {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.bgPanel, 0.88).fillRoundedRect(x, y, w, h, 12);
  neonRect(g, x, y, w, h, border);
  return g;
};

/** Fondo synthwave: cielo degradado, sol a rayas con halo y rejilla en perspectiva animada. */
export const synthwaveBackground = (scene: Phaser.Scene, opts: { sun?: boolean } = {}) => {
  const W = GAME_WIDTH;
  const H = GAME_HEIGHT;
  const horizon = 600;
  const g = scene.add.graphics();
  g.fillGradientStyle(0x05020c, 0x05020c, 0x3a0f52, 0x3a0f52, 1).fillRect(0, 0, W, horizon);

  // Estrellas con distintos brillos
  const rnd = new Phaser.Math.RandomDataGenerator(['rockstreet']);
  for (let i = 0; i < 220; i++) {
    const r = rnd.realInRange(0.6, 2.2);
    g.fillStyle(COLORS.white, rnd.realInRange(0.15, 0.9)).fillCircle(rnd.between(0, W), rnd.between(0, horizon - 160), r);
  }

  if (opts.sun !== false) {
    const cx = W / 2;
    const r = 200;
    // Halo
    for (let i = 6; i > 0; i--) g.fillStyle(COLORS.magenta, 0.035).fillCircle(cx, horizon, r + i * 26);
    // Sol degradado amarillo → magenta con franjas que se ensanchan hacia abajo
    for (let y = -r; y < 0; y++) {
      const t = (y + r) / r;
      if (t > 0.45) {
        const band = Math.floor((t - 0.45) * 40);
        const gap = 2 + band * 0.9;
        if ((y + r) % 22 < gap) continue;
      }
      const w = Math.sqrt(r * r - y * y);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(COLORS.yellow),
        Phaser.Display.Color.ValueToColor(COLORS.magenta),
        100,
        t * 100,
      );
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b)).fillRect(cx - w, horizon + y, w * 2, 1);
    }
  }

  // Montañas de silueta
  g.fillStyle(0x12062a);
  g.beginPath();
  g.moveTo(0, horizon);
  const mrnd = new Phaser.Math.RandomDataGenerator(['mountains']);
  for (let x = 0; x <= W; x += 60) g.lineTo(x, horizon - mrnd.between(10, 90) * (Math.abs(x - W / 2) > 260 ? 1 : 0.25));
  g.lineTo(W, horizon);
  g.closePath();
  g.fillPath();

  g.fillGradientStyle(0x14062a, 0x14062a, 0x05020c, 0x05020c, 1).fillRect(0, horizon, W, H - horizon);

  // Rejilla: verticales fijas en perspectiva + horizontales que avanzan
  const grid = scene.add.graphics();
  let offset = 0;
  const drawGrid = () => {
    grid.clear();
    for (let i = -24; i <= 24; i++) {
      grid.lineStyle(6, COLORS.magenta, 0.08).lineBetween(W / 2 + i * 30, horizon, W / 2 + i * 240, H);
      grid.lineStyle(2, COLORS.magenta, 0.7).lineBetween(W / 2 + i * 30, horizon, W / 2 + i * 240, H);
    }
    for (let i = 0; i < 12; i++) {
      const t = ((i + offset) / 12) ** 2.2;
      const y = horizon + t * (H - horizon);
      grid.lineStyle(6, COLORS.magenta, 0.08 * t * 2).lineBetween(0, y, W, y);
      grid.lineStyle(2, COLORS.magenta, Math.min(1, 0.2 + t)).lineBetween(0, y, W, y);
    }
    neonLine(grid, 0, horizon, W, horizon, COLORS.cyan);
  };
  drawGrid();
  scene.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      offset = (offset + 0.012) % 1;
      drawGrid();
    },
  });
  return { g, grid };
};

export interface MenuItem {
  label: string;
  enabled?: boolean;
  onSelect: () => void;
}

/** Lista vertical navegable con flechas + Enter (los menús son solo de teclado; el ratón es solo para el gameplay). */
export class Menu {
  index = 0;
  private texts: Phaser.GameObjects.Text[] = [];

  constructor(
    scene: Phaser.Scene,
    private items: MenuItem[],
    x: number,
    y: number,
    spacing = 64,
    size = 36,
  ) {
    items.forEach((item, i) => {
      const t = text(scene, x, y + i * spacing, item.label, { size, font: 'head', origin: [0.5, 0.5] });
      t.setPadding(size, size, size, size);
      this.texts.push(t);
    });
    this.index = Math.max(0, items.findIndex((it) => it.enabled !== false));
    this.refresh();
  }

  move(dir: number): void {
    const n = this.items.length;
    let i = this.index;
    for (let step = 0; step < n; step++) {
      i = (i + dir + n) % n;
      if (this.items[i].enabled !== false) break;
    }
    this.index = i;
    this.refresh();
  }

  select(): void {
    const item = this.items[this.index];
    if (item.enabled !== false) item.onSelect();
  }

  private refresh(): void {
    this.texts.forEach((t, i) => {
      const it = this.items[i];
      const sel = i === this.index;
      // Seleccionado: solo la letra en amarillo con brillo. El resto, sombra oscura para leerse sobre cualquier fondo.
      t.setColor(it.enabled === false ? '#4a4366' : sel ? CSS.yellow : CSS.white);
      t.setShadow(0, 0, sel ? CSS.yellow : '#000000', sel ? 22 : 10, false, true);
    });
  }
}

const leaving = new WeakSet<Phaser.Scene>();

/** Fundido de salida y cambio de escena (ignora llamadas repetidas durante el fundido). */
export const goTo = (scene: Phaser.Scene, key: string, data?: object, ms = 250) => {
  if (leaving.has(scene)) return;
  leaving.add(scene);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => leaving.delete(scene));
  scene.cameras.main.fadeOut(ms, 7, 4, 15);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
};

/** Barra inferior de ayuda de teclas, centrada. */
/**
 * Tecla dibujada como "keycap" (caja con borde), estilo UI de videojuego.
 * Devuelve el contenedor centrado en (x, y) y su ancho.
 */
export const keycap = (scene: Phaser.Scene, x: number, y: number, key: string, size = 18, color: number = COLORS.cyan) => {
  const label = text(scene, 0, 0, key, { font: 'head', size, origin: [0.5, 0.5] });
  const w = Math.max(size * 1.9, label.width - (label.padding.left ?? 0) * 2 + size * 1.1);
  const h = size * 1.75;
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.45).fillRoundedRect(-w / 2, -h / 2 + 3, w, h, 6); // sombra inferior (tecla en relieve)
  g.fillStyle(COLORS.bgPanel, 0.95).fillRoundedRect(-w / 2, -h / 2, w, h, 6);
  g.lineStyle(2, color, 0.9).strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
  const c = scene.add.container(x, y, [g, label]);
  return { container: c, width: w };
};

/**
 * Barra inferior de ayuda de teclas, centrada, con keycaps.
 * Formato: grupos separados por 4+ espacios; en cada grupo, la(s) tecla(s) y la acción separadas por 2 espacios.
 * Ej.: 'ENTER  JUGAR      ESC  MENÚ'  →  [ENTER] JUGAR   [ESC] MENÚ
 */
export const footer = (scene: Phaser.Scene, str: string, y = GAME_HEIGHT - 40) => {
  const row = scene.add.container(0, y);
  let x = 0;
  for (const group of str.trim().split(/\s{4,}/)) {
    const [keys, ...rest] = group.split(/\s{2,}/);
    for (const k of keys.split(/\s+/)) {
      const cap = keycap(scene, 0, 0, k);
      cap.container.x = x + cap.width / 2;
      row.add(cap.container);
      x += cap.width + 6;
    }
    const label = text(scene, x + 8, 0, rest.join(' '), { font: 'head', size: 20, color: '#d8d2f2', origin: [0, 0.5] });
    row.add(label);
    x += 8 + label.width - (label.padding.left ?? 0) * 2 + 44;
  }
  const w = x - 44;
  // Franja oscura detrás para que se lea sobre cualquier fondo
  const back = scene.add.graphics();
  back.fillStyle(COLORS.bg, 0.7).fillRoundedRect(-28, -26, w + 56, 52, 26);
  row.addAt(back, 0);
  row.x = GAME_WIDTH / 2 - w / 2;
  row.setDepth(100); // siempre sobre fondos animados
  return row;
};

export const formatMoney = (n: number) => `$${n.toLocaleString('en-US')}`;
