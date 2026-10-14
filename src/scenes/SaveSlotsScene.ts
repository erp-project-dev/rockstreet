import Phaser from 'phaser';
import { COLORS, CSS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { MISSIONS } from '../data/missions';
import { GameState } from '../systems/GameState';
import { Input } from '../systems/Input';
import { MUSIC, Music } from '../systems/Music';
import { NAME_MAX, SLOT_COUNT, SaveManager, createSave, type SaveData } from '../systems/SaveManager';
import { footer, formatMoney, goTo, panel, synthwaveBackground, text } from '../ui/ui';

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
  /** Cuadro para escribir el nombre de la nueva partida. */
  private naming: Phaser.GameObjects.Container | null = null;
  private nameBuf = '';
  private nameText!: Phaser.GameObjects.Text;
  private nameHint!: Phaser.GameObjects.Text;
  /** Tras cerrar el cuadro, ignora las acciones un instante (la misma tecla ESC no debe salir al menú). */
  private ignoreInputUntil = 0;

  constructor() {
    super(SCENES.SaveSlots);
  }

  init(data: { mode: Mode }) {
    this.mode = data.mode;
    this.index = 0;
    this.confirm = null;
    this.naming = null;
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
      const title = s?.name ? s.name.toUpperCase() : `RANURA ${i + 1}`;
      this.content.add(
        text(this, x + 48, y + 36, title, { font: 'head', size: 40, color: selected ? CSS.yellow : CSS.white, glow: selected ? CSS.yellow : undefined }),
      );
      if (s?.name) this.content.add(text(this, x + 48, y + 92, `RANURA ${i + 1}`, { font: 'head', size: 16, color: CSS.grey }));
      if (s) {
        const date = new Date(s.updatedAt).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
        this.content.add([
          text(this, x + 48, y + 118, `MISIONES  ${s.completed.length}/${MISSIONS.length}`, { size: 34, bold: true, color: CSS.cyan }),
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
    if (this.naming || this.time.now < this.ignoreInputUntil) {
      // El teclado lo maneja el cuadro de nombre: se descartan las acciones para que no se disparen al cerrarlo.
      for (const a of ['up', 'down', 'left', 'right', 'confirm', 'back', 'attack'] as const) inp.justDown(a);
      Phaser.Input.Keyboard.JustDown(this.deleteKey);
      return;
    }
    if (this.confirm) {
      if (inp.justDown('confirm')) {
          if (this.confirm === 'overwrite') return this.openNaming();
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
        } else this.openNaming();
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

  /** Abre el cuadro para escribir el nombre (máx. NAME_MAX caracteres). */
  private openNaming() {
    this.confirm = null;
    this.nameBuf = '';
    const W = 900;
    const H = 360;
    const x0 = (GAME_WIDTH - W) / 2;
    const y0 = (GAME_HEIGHT - H) / 2 - 20;
    const c = this.add.container(0, 0).setDepth(50);
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.75).setOrigin(0));
    c.add(panel(this, x0, y0, W, H, COLORS.cyan));
    c.add(text(this, GAME_WIDTH / 2, y0 + 60, '¿CÓMO TE LLAMAS, ROCKERO?', { font: 'head', size: 34, color: CSS.cyan, glow: CSS.cyan, origin: [0.5, 0.5] }));
    const box = this.add.graphics();
    box.fillStyle(0x000000, 0.45).fillRoundedRect(x0 + 120, y0 + 120, W - 240, 100, 14);
    box.lineStyle(3, COLORS.yellow, 0.9).strokeRoundedRect(x0 + 120, y0 + 120, W - 240, 100, 14);
    c.add(box);
    this.nameText = text(this, GAME_WIDTH / 2, y0 + 170, '', { font: 'head', size: 52, color: CSS.yellow, glow: CSS.yellow, origin: [0.5, 0.5] });
    this.nameHint = text(this, GAME_WIDTH / 2, y0 + 270, '', { size: 24, color: CSS.grey, origin: [0.5, 0.5] });
    c.add([this.nameText, this.nameHint]);
    const hint = footer(this, 'ENTER  EMPEZAR      ESC  VOLVER', y0 + H + 60);
    c.add(hint);
    this.naming = c;
    this.refreshName();
    this.input.keyboard!.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onNameKey, this);
  }

  private closeNaming() {
    this.input.keyboard!.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onNameKey, this);
    this.naming?.destroy();
    this.naming = null;
    this.ignoreInputUntil = this.time.now + 150;
    this.render();
  }

  private onNameKey(e: KeyboardEvent) {
    if (e.key === 'Escape') return this.closeNaming();
    if (e.key === 'Enter') {
      const name = this.nameBuf.trim();
      if (!name) return this.refreshName('Escribe un nombre para empezar');
      this.input.keyboard!.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onNameKey, this);
      return this.startNew(name);
    }
    if (e.key === 'Backspace') {
      this.nameBuf = this.nameBuf.slice(0, -1);
      return this.refreshName();
    }
    // Letras (con tildes y ñ), números, espacio y . _ -
    if (e.key.length === 1 && /^[\p{L}\p{N} ._-]$/u.test(e.key)) {
      if (this.nameBuf.length >= NAME_MAX) return this.refreshName(`Máximo ${NAME_MAX} caracteres`);
      if (e.key === ' ' && (!this.nameBuf || this.nameBuf.endsWith(' '))) return;
      this.nameBuf += e.key;
      this.refreshName();
    }
  }

  private refreshName(error?: string) {
    this.nameText.setText(this.nameBuf ? `${this.nameBuf.toUpperCase()}_` : '_');
    this.nameHint
      .setText(error ?? `${this.nameBuf.length}/${NAME_MAX} caracteres`)
      .setColor(error ? CSS.red : CSS.grey);
  }

  private startNew(name: string) {
    const data = createSave(this.index, name.trim());
    SaveManager.save(data);
    GameState.set(data);
    goTo(this, SCENES.Story, { kind: 'intro' });
  }
}
