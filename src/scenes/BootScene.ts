import Phaser from 'phaser';
import { SCENES } from '../config';

/** Espera a que carguen las fuentes (incluidas en el proyecto, ~50 KB) antes de dibujar cualquier texto. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Boot);
  }

  create() {
    const go = () => this.scene.start(SCENES.Preload);
    const fonts = Promise.all([
      document.fonts.load('64px "Monoton"'),
      document.fonts.load('32px "Audiowide"'),
      document.fonts.load('500 28px "Chakra Petch"'),
      document.fonts.load('700 28px "Chakra Petch"'),
    ]);
    const timeout = new Promise((r) => setTimeout(r, 10000)); // solo por seguridad
    Promise.race([fonts, timeout]).then(go, go);
  }
}
