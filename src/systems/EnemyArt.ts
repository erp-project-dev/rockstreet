import Phaser from 'phaser';

export const CHARACTER_ART = [
  { key: 'enemy-punk', folder: 'punk', frameCount: 12, ready: true },
  { key: 'enemy-punk-blue', folder: 'punk-blue', frameCount: 12, ready: true },
  { key: 'enemy-punk-red', folder: 'punk-red', frameCount: 12, ready: true },
  { key: 'boss-1', folder: 'sid', frameCount: 12, ready: true },
  { key: 'enemy-mohawk', folder: 'mohawk', frameCount: 16, ready: true },
  { key: 'enemy-chain', folder: 'chain', frameCount: 16, ready: true },
  { key: 'enemy-skinhead', folder: 'skinhead', frameCount: 16, ready: true },
  { key: 'enemy-thrower', folder: 'thrower', frameCount: 16, ready: true },
  { key: 'boss-2', folder: 'boss-2', frameCount: 16, ready: true },
  { key: 'boss-3', folder: 'boss-3', frameCount: 16, ready: true },
  { key: 'boss-4', folder: 'boss-4', frameCount: 16, ready: true },
  { key: 'boss-5', folder: 'boss-5', frameCount: 16, ready: true },
  { key: 'boss-6', folder: 'boss-6', frameCount: 16, ready: true },
  { key: 'boss-7', folder: 'boss-7', frameCount: 16, ready: true },
  { key: 'boss-8', folder: 'boss-8', frameCount: 16, ready: true },
  { key: 'boss-9', folder: 'boss-9', frameCount: 16, ready: true },
  { key: 'boss-10', folder: 'boss-10', frameCount: 16, ready: true }
] as const;
export const ENEMY_ART = CHARACTER_ART.filter(item => item.ready).map(item => item.key);
export function hasEnemyArt(key: string): boolean {
  return CHARACTER_ART.some(item => item.ready && item.key === key);
}
export function loadEnemyArt(scene: Phaser.Scene): void {
  for (const { key, folder, ready } of CHARACTER_ART) {
    if (!ready) continue;
    scene.load.atlas(key, `assets/characters/${folder}/${folder}-sheet.png`, `assets/characters/${folder}/${folder}-atlas.json`);
    scene.load.atlas(`${key}-motion`, `assets/characters/${folder}/${folder}-motion.png`, `assets/characters/${folder}/${folder}-motion-atlas.json`);
  }
}
export function createEnemyAnimations(scene: Phaser.Scene): void {
  for (const { key, frameCount, ready } of CHARACTER_ART) {
    if (!ready) continue;
    const main = (frame: number) => ({ key, frame: String(frame) });
    const motion = (frame: number) => ({ key: `${key}-motion`, frame: String(frame) });
    const poses: Record<string, { frames: { key: string; frame: string }[]; fps: number; repeat: number }> = {
      idle: { frames: [main(0), main(1)], fps: 3, repeat: -1 },
      walk: { frames: [main(2), main(3), main(4), main(5)], fps: 9, repeat: -1 },
      windup: { frames: [motion(1), main(6)], fps: 5, repeat: 0 },
      attack: { frames: [main(7), motion(2), main(0)], fps: key.startsWith('boss-') ? 12.5 : 9.375, repeat: 0 },
      charge: { frames: [main(8), motion(3)], fps: 12, repeat: -1 },
      hurt: { frames: [main(9), motion(4), motion(5)], fps: 11.54, repeat: 0 },
      down: { frames: [motion(6)], fps: 1, repeat: 0 },
      dead: { frames: [motion(6)], fps: 1, repeat: 0 },
      getup: { frames: [main(11), motion(7), main(0)], fps: 6.67, repeat: 0 },
    };
    if (frameCount === 16) {
      poses.shoot = { frames: [main(12), motion(2), main(0)], fps: 10, repeat: 0 };
      poses.slam = { frames: [main(13), motion(2), main(0)], fps: 6.67, repeat: 0 };
      poses.summon = { frames: [main(14), motion(0), main(0)], fps: 6, repeat: 0 };
      poses.special = { frames: [main(15), motion(2), main(0)], fps: 7.5, repeat: 0 };
    }
    for (const [pose, def] of Object.entries(poses)) {
      const name = `${key}-${pose}`;
      if (scene.anims.exists(name)) continue;
      scene.anims.create({ key: name, frames: def.frames, frameRate: def.fps, repeat: def.repeat });
    }
  }
}
