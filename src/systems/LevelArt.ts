import Phaser from 'phaser';
import { COLORS, CSS, FLOOR_TOP, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { MissionDef } from '../data/missions';
import { levelKey, drawWorldArt } from './WorldArt';
import { neonRect, text } from '../ui/ui';

export const SIDEWALK_TOP = 600;

/** Dibuja la calle de una misión: cielo, edificios con neón (parallax), acera y asfalto mojado. */
export const drawStreet = (scene: Phaser.Scene, mission: MissionDef, length: number, bossX: number) => {
  if (scene.textures.exists(levelKey(mission.id))) {
    drawWorldArt(scene, mission, length, bossX);
    return;
  }
  const rnd = new Phaser.Math.RandomDataGenerator([`mission-${mission.id}`]);
  const neon = [COLORS.magenta, COLORS.cyan, COLORS.yellow, COLORS.green, COLORS.orange];

  // Cielo nocturno fijo con luna
  const sky = scene.add.graphics().setScrollFactor(0).setDepth(-100);
  sky.fillGradientStyle(0x05020c, 0x05020c, 0x2a0d48, 0x2a0d48, 1).fillRect(0, 0, GAME_WIDTH, SIDEWALK_TOP);
  for (let i = 0; i < 120; i++) sky.fillStyle(COLORS.white, rnd.realInRange(0.1, 0.7)).fillCircle(rnd.between(0, GAME_WIDTH), rnd.between(0, 360), rnd.realInRange(0.6, 1.8));
  for (let i = 4; i > 0; i--) sky.fillStyle(COLORS.magenta, 0.04).fillCircle(1500, 200, 70 + i * 22);
  sky.fillStyle(0xffd6f5).fillCircle(1500, 200, 66);

  // Edificios lejanos (parallax lento)
  const far = scene.add.graphics().setScrollFactor(0.3).setDepth(-90);
  for (let x = 0; x < length * 0.3 + GAME_WIDTH; ) {
    const w = rnd.between(80, 200);
    const h = rnd.between(160, 400);
    far.fillStyle(0x140a2a).fillRect(x, 560 - h, w, h);
    for (let wy = 560 - h + 20; wy < 540; wy += 30)
      for (let wx = x + 12; wx < x + w - 12; wx += 24)
        if (rnd.frac() < 0.15) far.fillStyle(rnd.pick(neon), 0.25).fillRect(wx, wy, 8, 12);
    x += w + 6;
  }

  // Fachadas cercanas con ventanas, cornisas y letreros de neón
  const near = scene.add.graphics().setDepth(-80);
  const signs = ['ROCK', 'BAR', 'LIVE', 'VINYL', 'ARCADE', 'HOTEL', 'MOTEL', '24H', 'CLUB'];
  for (let x = 0; x < length + 200; ) {
    const w = rnd.between(280, 520);
    const h = rnd.between(320, 470);
    const top = SIDEWALK_TOP - h;
    const color = rnd.pick([0x1d0f36, 0x24123f, 0x1a1030, 0x2a1238]);
    near.fillStyle(color).fillRect(x, top, w, h);
    near.fillStyle(0x000000, 0.25).fillRect(x + w - 16, top, 16, h); // sombra lateral
    near.fillStyle(0x3a2a55).fillRect(x - 6, top, w + 12, 14); // cornisa
    for (let wy = top + 40; wy < SIDEWALK_TOP - 150; wy += 64)
      for (let wx = x + 32; wx < x + w - 60; wx += 64) {
        const lit = rnd.frac() < 0.35;
        near.fillStyle(lit ? 0xffd27a : 0x0b0618, lit ? 0.75 : 1).fillRect(wx, wy, 30, 40);
        near.fillStyle(0x000000, 0.4).fillRect(wx, wy + 38, 30, 4);
      }
    // Puerta
    near.fillStyle(0x0b0618).fillRect(x + w / 2 - 40, SIDEWALK_TOP - 130, 80, 130);
    near.fillStyle(0xffd27a, 0.15).fillRect(x + w / 2 - 34, SIDEWALK_TOP - 124, 68, 50);
    // Letrero neón
    if (rnd.frac() < 0.7) {
      const c = rnd.pick(neon);
      const sx = x + rnd.between(30, w - 230);
      const sy = SIDEWALK_TOP - 220;
      neonRect(near, sx, sy, 200, 60, c, 10);
      const label = text(scene, sx + 100, sy + 30, rnd.pick(signs), {
        font: 'head', size: 34, color: `#${c.toString(16).padStart(6, '0')}`, glow: `#${c.toString(16).padStart(6, '0')}`, origin: [0.5, 0.5],
      }).setDepth(-79);
      // Algunos letreros parpadean
      if (rnd.frac() < 0.3) scene.time.addEvent({ delay: rnd.between(1500, 4000), loop: true, callback: () => scene.tweens.add({ targets: label, alpha: 0.2, duration: 60, yoyo: true, repeat: 1 }) });
    }
    x += w;
  }

  // Acera, bordillo y calle
  const floor = scene.add.graphics().setDepth(-70);
  floor.fillStyle(0x2c2642).fillRect(0, SIDEWALK_TOP, length, FLOOR_TOP - SIDEWALK_TOP);
  for (let x = 0; x < length; x += 96) floor.lineStyle(2, 0x000000, 0.3).lineBetween(x, SIDEWALK_TOP, x - 30, FLOOR_TOP - 14);
  floor.fillStyle(0x4a4266).fillRect(0, FLOOR_TOP - 14, length, 14);
  floor.fillGradientStyle(0x1b1628, 0x1b1628, 0x0c0914, 0x0c0914, 1).fillRect(0, FLOOR_TOP, length, GAME_HEIGHT - FLOOR_TOP);
  for (let x = 0; x < length; x += 200) floor.fillStyle(COLORS.yellow, 0.55).fillRect(x, 880, 100, 10);
  // Reflejos de neón en el asfalto mojado
  for (let x = 0; x < length; x += rnd.between(120, 260)) floor.fillStyle(rnd.pick(neon), 0.06).fillEllipse(x, rnd.between(740, 1020), rnd.between(120, 260), 18);

  // Nombre del lugar al inicio y letrero del escenario del jefe
  text(scene, 80, 150, mission.location.toUpperCase(), { font: 'head', size: 48, color: CSS.cyan, glow: CSS.cyan, stroke: true }).setDepth(-60);
  const stage = scene.add.graphics().setDepth(-60);
  neonRect(stage, bossX + GAME_WIDTH / 2 - 260, 150, 520, 90, COLORS.red, 14);
  text(scene, bossX + GAME_WIDTH / 2, 195, 'ESCENARIO PRINCIPAL', { font: 'head', size: 34, color: CSS.red, glow: CSS.red, origin: [0.5, 0.5] }).setDepth(-59);
};
