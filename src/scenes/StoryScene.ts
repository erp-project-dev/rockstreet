import Phaser from 'phaser';
import { CSS, SCENES } from '../config';
import { ENDING_PAGES, introPages } from '../data/story';
import { GameState } from '../systems/GameState';
import { Input } from '../systems/Input';
import { MUSIC, Music } from '../systems/Music';
import { background } from '../ui/background';
import { footer, goTo, panel, text } from '../ui/ui';

type StoryKind = 'intro' | 'ending';

/** Texto narrativo tipo máquina de escribir, página por página. */
export class StoryScene extends Phaser.Scene {
  private kind: StoryKind = 'intro';
  private pages: string[] = [];
  private page = 0;
  private shown = 0;
  private body!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private typing?: Phaser.Time.TimerEvent;
  private input2!: Input;

  constructor() {
    super(SCENES.Story);
  }

  init(data: { kind: StoryKind }) {
    this.kind = data.kind ?? 'intro';
    this.pages = this.kind === 'intro' ? introPages(GameState.heroName()) : ENDING_PAGES;
    this.page = 0;
  }

  create() {
    Music.play(this, MUSIC.menu);
    this.cameras.main.fadeIn(400, 7, 4, 15);
    if (this.kind === 'intro') background(this, 'story-intro', .16);
    else background(this, 'story-ending', .2);
    this.input2 = new Input(this);
    panel(this, 260, 300, 1400, 480);
    this.body = text(this, 330, 360, '', { wrap: 1260, size: 40 });
    this.hint = text(this, 1610, 740, '', { font: 'head', size: 30, color: CSS.yellow, glow: CSS.yellow, origin: [1, 0.5] });
    this.tweens.add({ targets: this.hint, alpha: 0.3, duration: 400, yoyo: true, repeat: -1 });
    footer(this, 'ENTER  SEGUIR      ESC  SALTAR');
    this.showPage();
  }

  private showPage() {
    const full = this.pages[this.page];
    this.shown = 0;
    this.body.setText('');
    this.hint.setText('');
    this.typing?.remove();
    this.typing = this.time.addEvent({
      delay: 28,
      repeat: full.length - 1,
      callback: () => {
        this.shown++;
        this.body.setText(full.slice(0, this.shown));
        if (this.shown >= full.length) this.hint.setText(this.page < this.pages.length - 1 ? '▶▶' : 'FIN ▶');
      },
    });
  }

  private finish() {
    if (this.kind === 'intro') {
      GameState.data.introSeen = true;
      GameState.persist();
      goTo(this, SCENES.WorldMap, {}, 500);
    } else {
      goTo(this, SCENES.MainMenu, {}, 800);
    }
  }

  update() {
    if (this.input2.justDown('back')) return this.finish();
    if (this.input2.justDown('confirm')) {
      const full = this.pages[this.page];
      if (this.shown < full.length) {
        // Primer Enter: muestra la página completa.
        this.typing?.remove();
        this.shown = full.length;
        this.body.setText(full);
        this.hint.setText(this.page < this.pages.length - 1 ? '▶▶' : 'FIN ▶');
      } else if (this.page < this.pages.length - 1) {
        this.page++;
        this.showPage();
      } else {
        this.finish();
      }
    }
  }
}
