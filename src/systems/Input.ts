import Phaser from 'phaser';
import { KEYS, type Action } from '../config';

/** Acciones que también se disparan con el ratón. */
const MOUSE: Partial<Record<Action, 'left' | 'right'>> = {
  attack: 'left', // golpe básico (guitarrazo) con clic izquierdo
  power1: 'right', // Power Chord con clic derecho
};

/** Entrada por acciones: teclado (WASD/flechas, Espacio, Q/E, Enter, Esc) + clic izquierdo (golpe) y derecho (Power Chord). */
export class Input {
  private keys = new Map<Action, Phaser.Input.Keyboard.Key[]>();
  private pointer: Phaser.Input.Pointer;
  private clicked = new Set<'left' | 'right'>();

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    for (const action of Object.keys(KEYS) as Action[]) {
      this.keys.set(
        action,
        KEYS[action].map((code) => kb.addKey(code, true, false)),
      );
    }
    this.pointer = scene.input.activePointer;
    // Sin menú contextual para poder usar clic derecho en el futuro.
    scene.input.mouse?.disableContextMenu();
    const onDown = (p: Phaser.Input.Pointer) => {
      if (p.leftButtonDown()) this.clicked.add('left');
      if (p.rightButtonDown()) this.clicked.add('right');
    };
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, onDown);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.input.off(Phaser.Input.Events.POINTER_DOWN, onDown));
  }

  isDown(action: Action): boolean {
    const btn = MOUSE[action];
    const mouse = btn === 'left' ? this.pointer.leftButtonDown() : btn === 'right' ? this.pointer.rightButtonDown() : false;
    return mouse || this.keys.get(action)!.some((k) => k.isDown);
  }

  justDown(action: Action): boolean {
    // Revisa todas las teclas para no dejar ninguna "pendiente" de JustDown.
    const key = this.keys.get(action)!.map((k) => Phaser.Input.Keyboard.JustDown(k)).some(Boolean);
    const btn = MOUSE[action];
    const click = btn !== undefined && this.clicked.delete(btn);
    const pressed = key || click;
    return pressed;
  }
}
