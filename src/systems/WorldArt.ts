import Phaser from 'phaser';
import { COLORS, CSS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { MissionDef } from '../data/missions';
import { neonRect, text } from '../ui/ui';

export const LEVEL_NAMES: Record<number, string> = {
  1: 'garage', 2: 'club', 3: 'arcade', 4: 'vinyl', 5: 'metro',
  6: 'studio', 7: 'highway', 8: 'label', 9: 'academy', 10: 'stadium',
};
export const levelKey = (id: number): string => `level-${LEVEL_NAMES[id]}`;
export const loreKey = (id: number): string => `lore-${LEVEL_NAMES[id]}`;
export function loadWorldArt(scene: Phaser.Scene): void {
  for (const [id, name] of Object.entries(LEVEL_NAMES)) {
    scene.load.image(levelKey(Number(id)), `assets/levels/${name}.jpg`);
    scene.load.image(loreKey(Number(id)), `assets/lore/${name}.jpg`);
  }
  scene.load.image('story-intro', 'assets/lore/intro.jpg');
  scene.load.image('story-ending', 'assets/lore/ending.jpg');
}
/** Full-height world panorama; alternating mirrored spans meet at identical edges. */
export function drawWorldArt(scene: Phaser.Scene, mission: MissionDef, length: number, bossX: number): void {
  const key = levelKey(mission.id);
  const source = scene.textures.get(key).getSourceImage();
  const scale = GAME_HEIGHT / source.height;
  const width = source.width * scale;
  const count = Math.ceil(length / width);
  const start = length - count * width;
  for (let i = 0; i < count; i++) {
    scene.add.image(start + i * width, 0, key).setOrigin(0).setScale(scale)
      .setFlipX((count - 1 - i) % 2 === 1).setDepth(-100);
  }
  scene.add.rectangle(0, 0, length, GAME_HEIGHT, 0x07040f, .08).setOrigin(0).setDepth(-90);
  text(scene, 80, 150, mission.location.toUpperCase(), {
    font: 'head', size: 40, color: CSS.cyan, stroke: true,
  }).setDepth(-60);
  const stage = scene.add.graphics().setDepth(-60);
  neonRect(stage, bossX + GAME_WIDTH / 2 - 360, 150, 720, 90, COLORS.red, 14);
  text(scene, bossX + GAME_WIDTH / 2, 195, mission.boss, {
    font: 'head', size: 28, color: CSS.red, glow: CSS.red, origin: [0.5, 0.5],
  }).setDepth(-59);
}
