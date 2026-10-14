import Phaser from 'phaser';
export const PROJECTILE_SIZE = { bottle: [24, 54], contract: [52, 66], note: [52, 64] } as const;
export function loadCombatArt(scene: Phaser.Scene): void {
  for (const name of Object.keys(PROJECTILE_SIZE)) scene.load.atlas(name, `assets/projectiles/${name}.png`, `assets/projectiles/${name}-atlas.json`);
  for (const name of ['impact', 'wave', 'ring', 'bolt']) scene.load.atlas(`fx-${name}`, `assets/effects/${name}.png`, `assets/effects/${name}-atlas.json`);
}
/** Use the visible trim, rather than the transparent image's entire canvas. */
export function combatImage(scene: Phaser.Scene, x: number, y: number, key: string, width: number, height: number, fit = false): Phaser.GameObjects.Image {
  const image = scene.add.image(x, y, key, '0');
  const f = image.frame;
  image.setOrigin((f.x + f.cutWidth / 2) / f.realWidth, (f.y + f.cutHeight / 2) / f.realHeight);
  if (fit) image.setScale(Math.min(width / f.cutWidth, height / f.cutHeight));
  else image.setScale(width / f.cutWidth, height / f.cutHeight);
  return image;
}
