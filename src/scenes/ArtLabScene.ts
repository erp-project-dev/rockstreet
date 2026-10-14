import Phaser from 'phaser';
import { GAME_WIDTH, CSS } from '../config';
import { CHARACTER_ART } from '../systems/EnemyArt';
import { PLAYER_ART } from '../systems/PlayerArt';
import { text } from '../ui/ui';

/** Development-only gallery using the SAME Phaser animations as combat. */
export class ArtLabScene extends Phaser.Scene {
  private actors: { sprite: Phaser.GameObjects.Sprite; key: string; base: string; source: number; height: number }[] = [];
  private pose = 'idle';
  constructor() { super('ArtLab'); }
  create(): void {
    text(this, GAME_WIDTH / 2, 38, 'ROCKSTREET · ANIMACIONES', { font: 'head', size: 30, color: CSS.cyan, origin: [.5, .5] });
    const poses = ['idle', 'walk', 'attack', 'windup', 'charge', 'hurt', 'getup', 'down'];
    poses.forEach((pose, i) => {
      const button = text(this, 120 + i * 230, 100, `${i + 1} · ${pose}`, { size: 22, color: CSS.yellow, origin: [.5, .5] }).setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.select(pose));
      this.input.keyboard!.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'][i]}`, () => this.select(pose));
    });
    text(this, GAME_WIDTH / 2, 141, 'F · CAMBIAR ORIENTACIÓN     /     ESC · MENÚ', { size: 20, origin: [.5, .5] });
    const entries = [{ key: PLAYER_ART, label: 'Axel', base: 'axel' }, ...CHARACTER_ART.map(x => ({ key: x.key, label: x.folder, base: x.key }))];
    entries.forEach((entry, i) => {
      const x = 160 + (i % 6) * 320;
      const y = 440 + Math.floor(i / 6) * 280;
      this.add.ellipse(x, y, 100, 16, 0x291d3c);
      const sprite = this.add.sprite(x, y, entry.key, '0').setOrigin(.5, .92);
      const frame = sprite.frame;
      this.actors.push({ sprite, key: entry.key, base: entry.base, source: frame.realHeight, height: frame.cutHeight });
      text(this, x, y + 26, entry.label, { size: 19, color: CSS.cyan, origin: [.5, .5] });
    });
    this.input.keyboard!.on('keydown-F', () => this.actors.forEach(({ sprite }) => sprite.setFlipX(!sprite.flipX)));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('MainMenu'));
    this.select('idle');
  }
  private select(pose: string): void {
    this.pose = pose;
    for (const actor of this.actors) {
      const playerPose = pose === 'attack' ? 'combo1' : pose === 'windup' ? 'combo3' : pose === 'charge' ? 'dashAttack' : pose;
      const key = `${actor.base}-${actor.base === 'axel' ? playerPose : pose}`;
      actor.sprite.play(key);
    }
  }
  update(): void {
    for (const actor of this.actors) {
      actor.sprite.setScale(185 * actor.source / actor.height / actor.sprite.frame.realHeight);
      if (!actor.sprite.anims.isPlaying && !['idle', 'walk', 'down'].includes(this.pose)) actor.sprite.play(actor.sprite.anims.currentAnim!.key);
    }
  }
}
