import Phaser from 'phaser';

export function loadPropArt(scene: Phaser.Scene): void {
  for (const name of ['trash', 'amp']) {
    scene.load.atlas(`prop-${name}`, `assets/props/${name}.png`, `assets/props/${name}-atlas.json`);
  }
}
