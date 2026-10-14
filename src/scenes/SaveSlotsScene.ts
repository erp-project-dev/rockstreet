import Phaser from 'phaser';
import { COLORS, CSS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { MISSIONS } from '../data/missions';
import { GameState } from '../systems/GameState';
import { Input } from '../systems/Input';
import { MUSIC, Music } from '../systems/Music';
import { SLOT_COUNT, SaveManager, createSave, type SaveData } from '../systems/SaveManager';
import { formatMoney, goTo, panel, synthwaveBackground, text } from '../ui/ui';

type Mode = 'new' | 'load';

/** Elegir ranura: crear partida nueva o cargar/borrar una existente. */
export class SaveSlotsScene extends Phaser.Scene {
  private mode: Mode = 'new';
  private input2!: Input;
  private index = 0;
  private slots: (SaveData | null)[] = [];
  private content!: Phaser.GameObjects.Container;
  private confirm: 'overwrite' | 'delete' | null = null;
  private prompt!: Phaser.GameObjects.Text;
  private deleteKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENES.SaveSlots);
  }

  init(data: { mode: Mode }) {
    this.mode = data.mode;
    this.index = 0;
    this.confirm = null;
  }

  create() {
    Music.play(this, MUSIC.menu);
    this.cameras.main.fadeIn(200, 7, 4, 15);
    synthwaveBackground(this, { sun: false });
    this.input2 = new Input(this);
    text(this, GAME_WIDTH / 2, 90, this.mode === 'new' ? 'NUEVA PARTIDA' : 'CARGAR PARTIDA', {
      font: 'head', size: 64, color: CSS.cyan, glow: CSS.cyan, origin: [0.5, 0.5],
    });
    this.prompt = text(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, '', { font: 'head', size: 26, origin: [0.5, 0.5], stroke: true });
    this.deleteKey = this.input.keyboard!.addKey('X');
    this.content = this.add.container();
    if (this.mode === 'load') this.index = Math.max(0, SaveManager.listSlots().findIndex(Boolean));
    this.render();
  }

  private render() {
    this.slots = SaveManager.listSlots();
    this.content.removeAll(true);
    for (let i = 0; i < SLOT_COUNT; i++) {
      const x = 360;
      const y = 190 + i * 260;
      const s = this.slots[i];
      const selected = i === this.index;
      this.content.add(panel(this, x, y, 1200, 220, selected ? COLORS.yellow : COLORS.darkGrey));
      this.content.add(
        text(this, x + 48, y + 36, `RANURA ${i + 1}`, { font: 'head', size: 40, color: selected ? CSS.yellow : CSS.white, glow: selected ? CSS.yellow : undefined }),
      );
      if (s) {
        const date = new Date(s.updatedAt).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
        this.content.add([
          text(this, x + 48, y + 110, `MISIONES  ${s.completed.length}/${MISSIONS.length}`, { size: 34, bold: true, color: CSS.cyan }),
          text(this, x + 48, y + 160, date, { size: 26, color: CSS.grey }),
          text(this, x + 1152, y + 40, formatMoney(s.money), { font: 'head', size: 44, color: CSS.green, origin: [1, 0] }),
          text(this, x + 1152, y + 110, `BANDA  ${s.rescued.length}/3`, { size: 34, bold: true, color: CSS.magenta, origin: [1, 0] }),
        ]);
      } else {
        this.content.add(text(this, x + 600, y + 130, '— VACÍA —', { font: 'head', size: 32, color: CSS.grey, origin: [0.5, 0.5] }));
      }
    }

    if (this.confirm === 'overwrite') this.prompt.setText('¿SOBRESCRIBIR?    ENTER  SÍ      ESC  NO').setColor(CSS.red);
    else if (this.confirm === 'delete') this.prompt.setText('¿BORRAR PARTIDA?    ENTER  SÍ      ESC  NO').setColor(CSS.red);
    else
      this.prompt
        .setText(this.mode === 'load' ? 'ENTER  CARGAR      X  BORRAR      ESC  VOLVER' : 'ENTER  ELEGIR      ESC  VOLVER')
        .setColor(CSS.grey);
  }

  update() {
    const inp = this.input2;
    if (this.confirm) {
      if (inp.justDown('confirm')) {
          if (this.confirm === 'overwrite') return this.startNew();
        SaveManager.delete(this.index);
        this.confirm = null;
        if (!SaveManager.listSlots().some(Boolean)) return goTo(this, SCENES.MainMenu);
        this.render();
      } else if (inp.justDown('back')) {
        this.confirm = null;
        this.render();
      }
      return;
    }

    if (inp.justDown('up')) this.moveTo(-1);
    if (inp.justDown('down')) this.moveTo(1);
    if (inp.justDown('back')) return goTo(this, SCENES.MainMenu);

    const slot = this.slots[this.index];
    if (inp.justDown('confirm')) {
      if (this.mode === 'new') {
        if (slot) {
          this.confirm = 'overwrite';
          this.render();
        } else this.startNew();
      } else if (slot) {
        GameState.set(slot);
        goTo(this, slot.introSeen ? SCENES.WorldMap : SCENES.Story, { kind: 'intro' });
      }
    }
    if (this.mode === 'load' && slot && Phaser.Input.Keyboard.JustDown(this.deleteKey)) {
      this.confirm = 'delete';
      this.render();
    }
  }

  private moveTo(dir: number) {
    // En modo cargar, saltar ranuras vacías.
    for (let step = 1; step <= SLOT_COUNT; step++) {
      const i = (this.index + dir * step + SLOT_COUNT) % SLOT_COUNT;
      if (this.mode === 'new' || this.slots[i]) {
        this.index = i;
        break;
      }
    }
    this.render();
  }

  private startNew() {
    const data = createSave(this.index);
    SaveManager.save(data);
    GameState.set(data);
    goTo(this, SCENES.Story, { kind: 'intro' });
  }
}
