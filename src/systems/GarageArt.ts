import Phaser from 'phaser';
import { COLORS, CSS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { neonRect, text } from '../ui/ui';

export const GARAGE_ART = 'level-garage';

/** World-space panorama: alternating mirrors meet at the same edge without gaps. */
export function drawGarage(scene: Phaser.Scene, length: number, bossX: number): void {
  const source = scene.textures.get(GARAGE_ART).getSourceImage();
  const scale = GAME_HEIGHT / source.height;
  const width = source.width * scale;
  const count = Math.ceil(length / width);
  // Align the final, unmirrored panorama with the level end: stage behind Sid.
  const start = length - count * width;
  for (let i = 0; i < count; i++) {
    scene.add.image(start + i * width, 0, GARAGE_ART)
      .setOrigin(0, 0).setScale(scale).setFlipX((count - 1 - i) % 2 === 1).setDepth(-100);
  }
  // Keep the rear wall and floor readable under the bright fighters and effects.
  scene.add.rectangle(0, 0, length, GAME_HEIGHT, 0x07040f, .08).setOrigin(0).setDepth(-90);
  text(scene, 80, 150, 'EL GARAGE · BARRIO SUR', {
    font: 'head', size: 40, color: CSS.cyan, stroke: true,
  }).setDepth(-60);
  const stage = scene.add.graphics().setDepth(-60);
  neonRect(stage, bossX + GAME_WIDTH / 2 - 260, 150, 520, 90, COLORS.red, 14);
  text(scene, bossX + GAME_WIDTH / 2, 195, 'SID · TRES ACORDES', {
    font: 'head', size: 34, color: CSS.red, glow: CSS.red, origin: [0.5, 0.5],
  }).setDepth(-59);
}
