import Phaser from 'phaser';
import { COLORS, CSS, GAME_WIDTH, SCENES } from '../config';
import { MISSIONS, getMission } from '../data/missions';
import { POWERS } from '../data/upgrades';
import { GameState } from '../systems/GameState';
import { Input } from '../systems/Input';
import { loreKey } from '../systems/WorldArt';
import { background } from '../ui/background';
import { MUSIC, Music } from '../systems/Music';
import { Menu, formatMoney, goTo, panel, synthwaveBackground, text } from '../ui/ui';

/** Resultado de la misión + desenlace narrativo. Aquí se guarda el progreso. */
export class MissionCompleteScene extends Phaser.Scene {
  private input2!: Input;
  private menu!: Menu;
  private missionId = 1;
  private moneyCollected = 0;

  constructor() {
    super(SCENES.MissionComplete);
  }

  init(data: { missionId: number; moneyCollected: number }) {
    this.missionId = data.missionId;
    this.moneyCollected = data.moneyCollected;
  }

  create() {
    Music.play(this, MUSIC.menu);
    const m = getMission(this.missionId);
    const { firstTime, reward } = GameState.completeMission(m.id, this.moneyCollected);

    this.cameras.main.fadeIn(400, 7, 4, 15);
    // Mismo fondo que la introducción de la misión (ilustración del lugar si existe).
    if (this.textures.exists(loreKey(m.id))) background(this, loreKey(m.id), 0.12);
    else synthwaveBackground(this);
    this.input2 = new Input(this);

    // --- Contenido: se mide primero para ajustar el panel y centrar todo el bloque ---
    const rows: [string, string, string][] = [['DINERO RECOGIDO', formatMoney(this.moneyCollected), CSS.green]];
    if (reward) rows.push(['RECOMPENSA', formatMoney(reward), CSS.green]);
    rows.push(['TOTAL EN BOLSILLO', formatMoney(GameState.data.money), CSS.yellow]);
    if (firstTime && m.unlocksPower) rows.push(['NUEVO PODER', POWERS.find((x) => x.id === m.unlocksPower)!.name.toUpperCase(), CSS.magenta]);
    if (firstTime && m.rescues) rows.push(['RESCATADO', m.rescues, CSS.cyan]);

    const PX = 260;
    const PW = GAME_WIDTH - PX * 2;
    const INNER = 60;
    const ROW_H = 52;
    const outroStr = firstTime ? m.outro : 'Volviste a limpiar la zona. Los fanáticos no aprenden.';
    const outro = text(this, PX + INNER, 0, outroStr, { wrap: PW - INNER * 2, size: 36 }).setDepth(1);
    const outroH = outro.height - (outro.padding.top ?? 0) * 2;
    const panelH = 40 + outroH + 40 + rows.length * ROW_H + 30;
    const HEADER_H = 170; // título + nombre de la misión
    const MENU_H = 70 + 64 * (firstTime && m.id === MISSIONS.length ? 1 : 2);
    const blockH = HEADER_H + panelH + MENU_H;
    const top = Math.max(20, (1080 - blockH) / 2);
    const panelY = top + HEADER_H;

    text(this, GAME_WIDTH / 2, top + 40, '¡MISIÓN COMPLETADA!', { font: 'head', size: 72, color: CSS.yellow, glow: CSS.yellow, origin: [0.5, 0.5] });
    text(this, GAME_WIDTH / 2, top + 118, `${m.id}.  ${m.name.toUpperCase()}`, { font: 'head', size: 34, color: CSS.cyan, glow: CSS.cyan, origin: [0.5, 0.5] });

    panel(this, PX, panelY, PW, panelH, COLORS.magenta);
    outro.setY(panelY + 40 - (outro.padding.top ?? 0));

    // Separador y filas de resultados
    let y = panelY + 40 + outroH + 30;
    this.add.graphics().setDepth(1).lineStyle(2, COLORS.magenta, 0.35).lineBetween(PX + INNER, y - 10, PX + PW - INNER, y - 10);
    for (const [label, value, color] of rows) {
      text(this, PX + INNER, y + ROW_H / 2, label, { font: 'head', size: 26, color: CSS.grey, origin: [0, 0.5] }).setDepth(1);
      text(this, PX + PW - INNER, y + ROW_H / 2, value, { font: 'head', size: 32, color, glow: color, origin: [1, 0.5] }).setDepth(1);
      y += ROW_H;
    }
    const menuY = panelY + panelH + 70;

    const finalWin = firstTime && m.id === MISSIONS.length;
    this.menu = new Menu(
      this,
      finalWin
        ? [{ label: 'CONTINUAR', onSelect: () => goTo(this, SCENES.Story, { kind: 'ending' }, 600) }]
        : [
            { label: 'IR AL BACKSTAGE', onSelect: () => goTo(this, SCENES.Backstage) },
            { label: 'VOLVER AL MAPA', onSelect: () => goTo(this, SCENES.WorldMap) },
          ],
      GAME_WIDTH / 2,
      menuY,
    );
  }

  update() {
    if (this.input2.justDown('up')) this.menu.move(-1);
    if (this.input2.justDown('down')) this.menu.move(1);
    if (this.input2.justDown('confirm')) this.menu.select();
  }
}
