import Phaser from 'phaser';
import { CSS, GAME_WIDTH, SCENES } from '../config';
import { Input } from '../systems/Input';
import { Music } from '../systems/Music';
import { Menu, goTo, text } from '../ui/ui';

export class GameOverScene extends Phaser.Scene {
  private input2!: Input;
  private menu!: Menu;
  private missionId = 1;

  constructor() {
    super(SCENES.GameOver);
  }

  init(data: { missionId: number }) {
    this.missionId = data.missionId;
  }

  create() {
    Music.stop();
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.input2 = new Input(this);
    const title = text(this, GAME_WIDTH / 2, 340, 'GAME OVER', { font: 'logo', size: 160, color: CSS.red, glow: CSS.red, origin: [0.5, 0.5] });
    this.tweens.add({ targets: title, alpha: 0.5, duration: 900, yoyo: true, repeat: -1 });
    text(this, GAME_WIDTH / 2, 500, 'Los falsos ganan esta noche...', { size: 40, color: CSS.white, origin: [0.5, 0.5] });
    text(this, GAME_WIDTH / 2, 560, 'Perdiste el dinero recogido en esta misión.', { size: 30, color: CSS.grey, origin: [0.5, 0.5] });
    this.menu = new Menu(
      this,
      [
        { label: 'REINTENTAR', onSelect: () => goTo(this, SCENES.Briefing, { missionId: this.missionId }) },
        { label: 'VOLVER AL MAPA', onSelect: () => goTo(this, SCENES.WorldMap) },
      ],
      GAME_WIDTH / 2,
      760,
    );
  }

  update() {
    if (this.input2.justDown('up')) this.menu.move(-1);
    if (this.input2.justDown('down')) this.menu.move(1);
    if (this.input2.justDown('confirm')) this.menu.select();
  }
}
