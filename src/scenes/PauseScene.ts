import Phaser from 'phaser';
import { Sfx } from '../systems/Sfx';
import { COLORS, CSS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { Input } from '../systems/Input';
import { CONTROLS } from '../data/controls';
import { Menu, footer, panel, text } from '../ui/ui';

export class PauseScene extends Phaser.Scene {
  private input2!: Input;
  private menu!: Menu;
  private missionId = 1;

  constructor() {
    super(SCENES.Pause);
  }

  init(data: { missionId: number }) {
    this.missionId = data.missionId;
  }

  create() {
    Sfx.stop(this);
    this.sound.pauseAll();
    this.input2 = new Input(this);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.7).setOrigin(0);
    // Dos paneles lado a lado: menú de pausa | controles (siempre visibles)
    const top = 200;
    const h = 680;
    const menuX = 240;
    const menuW = 640;
    const ctrlX = menuX + menuW + 40;
    const ctrlW = 760;
    const mcx = menuX + menuW / 2;

    panel(this, menuX, top, menuW, h, COLORS.magenta);
    text(this, mcx, top + 90, 'PAUSA', { font: 'logo', size: 96, color: CSS.magenta, glow: CSS.magenta, origin: [0.5, 0.5] });
    this.menu = new Menu(
      this,
      [
        { label: 'CONTINUAR', onSelect: () => this.resume() },
        { label: 'REINICIAR MISIÓN', onSelect: () => this.leave(SCENES.Game, { missionId: this.missionId }) },
        { label: 'SALIR AL MAPA', onSelect: () => this.leave(SCENES.WorldMap) },
      ],
      mcx,
      top + 250,
      90,
    );
    text(this, mcx, top + h - 60, 'Reiniciar o salir pierde el dinero de esta misión', { size: 22, color: CSS.grey, origin: [0.5, 0.5], wrap: menuW - 80, align: 'center' });

    panel(this, ctrlX, top, ctrlW, h, COLORS.cyan);
    text(this, ctrlX + 40, top + 50, 'CONTROLES', { font: 'head', size: 30, color: CSS.cyan, glow: CSS.cyan, origin: [0, 0.5] });
    CONTROLS.filter(([label]) => label !== 'Confirmar').forEach(([label, key], i) => {
      const y = top + 120 + i * 60;
      text(this, ctrlX + 40, y, label, { size: 28, origin: [0, 0.5] });
      text(this, ctrlX + ctrlW - 40, y, key, { font: 'head', size: 24, color: CSS.yellow, origin: [1, 0.5] });
    });

    footer(this, '↑ ↓  ELEGIR      ENTER  CONFIRMAR      ESC  CONTINUAR', GAME_HEIGHT - 70);
  }

  private resume() {
    this.sound.resumeAll();
    this.scene.resume(SCENES.Game);
    this.scene.resume(SCENES.HUD);
    this.scene.stop();
  }

  private leave(key: string, data?: object) {
    this.sound.resumeAll();
    this.scene.stop(SCENES.HUD);
    this.scene.stop(SCENES.Game);
    this.scene.start(key, data);
  }

  update() {
    if (this.input2.justDown('up')) this.menu.move(-1);
    if (this.input2.justDown('down')) this.menu.move(1);
    if (this.input2.justDown('confirm')) this.menu.select();
    if (this.input2.justDown('back')) this.resume();
  }
}
