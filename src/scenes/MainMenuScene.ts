import Phaser from 'phaser';
import { COLORS, CSS, GAME_WIDTH, SCENES } from '../config';
import { GameState } from '../systems/GameState';
import { Input } from '../systems/Input';
import { MUSIC, Music } from '../systems/Music';
import { SaveManager } from '../systems/SaveManager';
import { BACKGROUNDS, background } from '../ui/background';
import { Menu, footer, goTo, text } from '../ui/ui';

export class MainMenuScene extends Phaser.Scene {
  private input2!: Input;
  private menu!: Menu;

  constructor() {
    super(SCENES.MainMenu);
  }

  create() {
    Music.play(this, MUSIC.menu);
    this.cameras.main.fadeIn(300, 7, 4, 15);
    background(this, BACKGROUNDS.menu, .12);
    this.input2 = new Input(this);

    // Logo neón con parpadeo ocasional
    const cx = GAME_WIDTH / 2;
    const logo = text(this, cx, 190, 'ROCKSTREET', { font: 'logo', size: 150, color: CSS.cyan, glow: CSS.cyan, origin: [0.5, 0.5] });
    this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => this.tweens.add({ targets: logo, alpha: 0.35, duration: 50, yoyo: true, repeat: 2 }),
    });
    text(this, cx, 320, 'NEON CITY  ·  1986', { font: 'head', size: 40, color: CSS.magenta, glow: CSS.magenta, origin: [0.5, 0.5] });

    const latest = SaveManager.latest();
    const hasAny = SaveManager.listSlots().some(Boolean);

    const box = this.add.graphics();
    box.fillStyle(COLORS.bg, 0.55).fillRoundedRect(cx - 300, 650, 600, 300, 24);

    this.menu = new Menu(
      this,
      [
        {
          label: 'CONTINUAR',
          enabled: latest !== null,
          onSelect: () => {
            GameState.set(latest!);
            goTo(this, latest!.introSeen ? SCENES.WorldMap : SCENES.Story, { kind: 'intro' });
          },
        },
        { label: 'NUEVA PARTIDA', onSelect: () => goTo(this, SCENES.SaveSlots, { mode: 'new' }) },
        { label: 'CARGAR PARTIDA', enabled: hasAny, onSelect: () => goTo(this, SCENES.SaveSlots, { mode: 'load' }) },
        { label: 'CONTROLES', onSelect: () => goTo(this, SCENES.Controls) },
      ],
      cx,
      700,
    );

    footer(this, '↑ ↓  ELEGIR      ENTER  CONFIRMAR');
  }

  update() {
    if (this.input2.justDown('up')) this.menu.move(-1);
    if (this.input2.justDown('down')) this.menu.move(1);
    if (this.input2.justDown('confirm')) this.menu.select();
  }
}
