import Phaser from 'phaser';
export const PLAYER_ART = 'axel-riff';
export const PLAYER_DASH_ART = 'axel-dash';
export const PLAYER_MOTION_ART = 'axel-motion';
const main = (frame: number) => ({ key: PLAYER_ART, frame: String(frame) });
const motion = (frame: number) => ({ key: PLAYER_MOTION_ART, frame: String(frame) });
const dash = (frame: number) => ({ key: PLAYER_DASH_ART, frame: String(frame) });
/** Contact remains first: the existing damage windows are unchanged. */
export const PLAYER_ANIMS = {
  idle: { frames: [main(0), main(1)], fps: 3, repeat: -1 },
  walk: { frames: [main(2), main(3), main(4), main(5)], fps: 10, repeat: -1 },
  combo1: { frames: [main(6), motion(2), main(0)], fps: 15, repeat: 0 },
  combo2: { frames: [main(7), motion(4), main(0)], fps: 14.2857, repeat: 0 },
  combo3: { frames: [main(8), motion(6), main(0)], fps: 8.8235, repeat: 0 },
  dash: { frames: [dash(0), dash(1), dash(1), dash(2)], fps: 22.22, repeat: 0 },
  dashAttack: { frames: [motion(7), dash(1), motion(6), main(0)], fps: 15.3846, repeat: 0 },
  hurt: { frames: [main(11), motion(8), motion(9)], fps: 11.54, repeat: 0 },
  fall: { frames: [main(11), motion(8)], fps: 8, repeat: 0 },
  down: { frames: [motion(10)], fps: 1, repeat: 0 },
  dead: { frames: [motion(10)], fps: 1, repeat: 0 },
  getup: { frames: [main(12), motion(11), main(0)], fps: 6.67, repeat: 0 },
  powerChord: { frames: [main(13), motion(6), main(0)], fps: 10, repeat: 0 },
  feedback: { frames: [main(14), motion(6), main(0)], fps: 10, repeat: 0 },
  solo: { frames: [main(15), main(14), main(13), main(0)], fps: 8, repeat: 0 },
} as const;
export type PlayerAnim = keyof typeof PLAYER_ANIMS;
export function createPlayerAnimations(scene: Phaser.Scene): void {
  for (const [name, def] of Object.entries(PLAYER_ANIMS)) {
    const key = `axel-${name}`;
    if (scene.anims.exists(key)) continue;
    scene.anims.create({ key, frames: [...def.frames], frameRate: def.fps, repeat: def.repeat });
  }
}
