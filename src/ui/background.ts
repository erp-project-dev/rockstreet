import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

export const BACKGROUNDS = {
  menu: 'background-menu',
  backstage: 'background-backstage',
  map: 'background-map',
} as const;

/** Cover the native canvas without stretching the illustration. */
export function background(scene: Phaser.Scene, key: string, shade = .12): void {
  const art = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key);
  art.setScale(Math.max(GAME_WIDTH / art.width, GAME_HEIGHT / art.height));
  scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07040f, shade).setOrigin(0);
}
