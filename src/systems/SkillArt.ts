import Phaser from 'phaser';
import type { PowerId } from '../data/upgrades';

export const powerIcon = (id: PowerId): string => `skill-${id}`;
export function loadSkillArt(scene: Phaser.Scene): void {
  for (const id of ['powerChord', 'feedback', 'solo'] as const) {
    scene.load.image(powerIcon(id), `assets/skills/${id}.png`);
  }
}
