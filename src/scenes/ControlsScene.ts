import Phaser from 'phaser';
import { CSS, GAME_WIDTH, SCENES } from '../config';
import { CONTROLS } from '../data/controls';
import { Input } from '../systems/Input';
import { MUSIC, Music } from '../systems/Music';
import { footer, goTo, panel, synthwaveBackground, text } from '../ui/ui';


export class ControlsScene extends Phaser.Scene {
  private input2!: Input;

  constructor() {
    super(SCENES.Controls);
  }

  create() {
    Music.play(this, MUSIC.menu);
    this.cameras.main.fadeIn(200, 7, 4, 15);
    synthwaveBackground(this, { sun: false });
    this.input2 = new Input(this);
    text(this, GAME_WIDTH / 2, 90, 'CONTROLES', { font: 'head', size: 64, color: CSS.cyan, glow: CSS.cyan, origin: [0.5, 0.5] });
    panel(this, 460, 170, 1000, 740);
    CONTROLS.forEach(([label, key], i) => {
      text(this, 530, 210 + i * 70, label, { size: 36 });
      text(this, 1390, 210 + i * 70, key, { font: 'head', size: 34, color: CSS.yellow, glow: CSS.yellow, origin: [1, 0] });
    });
    text(this, GAME_WIDTH / 2, 880, 'Poderes: stamina compartida. Se regenera sola y al conectar golpes.', { size: 18, color: CSS.cyan, origin: [0.5, 0.5] });
    footer(this, 'ESC  VOLVER');
  }

  update() {
    if (this.input2.justDown('back') || this.input2.justDown('confirm')) goTo(this, SCENES.MainMenu);
  }
}
