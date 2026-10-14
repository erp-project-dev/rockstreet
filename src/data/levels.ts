import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { ENEMY_UNLOCK, type EnemyId } from './enemies';
import type { MissionDef } from './missions';

/** Zona de combate: la cámara se bloquea en `x` hasta vencer todas sus oleadas. */
export interface Zone {
  x: number;
  waves: EnemyId[][];
}

export interface LevelPlan {
  /** Largo total del nivel en px. */
  length: number;
  zones: Zone[];
  /** Arena final del jefe (borde izquierdo de la cámara). */
  bossX: number;
  /** Escoltas que acompañan al jefe. */
  bossEscort: EnemyId[];
  breakables: { x: number; y: number }[];
  /** Multiplicadores de dificultad de la misión. */
  hpMult: number;
  dmgMult: number;
}

/**
 * Genera el plan de una misión de forma determinista (misma misión = mismo nivel).
 * Más misiones → más zonas, oleadas más grandes y más variedad de enemigos.
 */
export const buildLevel = (m: MissionDef): LevelPlan => {
  const rnd = new Phaser.Math.RandomDataGenerator([`level-${m.id}`]);
  const pool = (Object.keys(ENEMY_UNLOCK) as EnemyId[]).filter((id) => ENEMY_UNLOCK[id] <= m.id);
  const zoneCount = 2 + Math.floor((m.id - 1) / 3);
  const waveSize = 3 + Math.floor(m.id / 3);
  // Calle libre entre zonas para respirar, recoger objetos y romper cosas.
  const first = 1500;
  const spacing = 2600;
  const bossX = first + (zoneCount - 1) * spacing + 2800;
  const length = bossX + GAME_WIDTH;

  const zones: Zone[] = [];
  for (let i = 0; i < zoneCount; i++) {
    const x = first + i * spacing;
    const waves: EnemyId[][] = [];
    const waveCount = i === zoneCount - 1 ? 3 : 2;
    for (let w = 0; w < waveCount; w++) {
      const size = waveSize + (w === waveCount - 1 ? 1 : 0);
      // Siempre al menos un fanático básico; el resto, del pool de la misión.
      waves.push(Array.from({ length: size }, (_, k) => (k === 0 ? 'punk' : rnd.pick(pool))));
    }
    zones.push({ x, waves });
  }

  const breakables: { x: number; y: number }[] = [];
  for (let x = 900; x < bossX; x += rnd.between(900, 1500)) {
    breakables.push({ x, y: rnd.between(700, 1000) });
  }

  return {
    length,
    zones,
    bossX,
    bossEscort: m.id >= 3 ? ['punk', rnd.pick(pool)] : ['punk'],
    breakables,
    hpMult: 1 + 0.12 * (m.id - 1),
    dmgMult: 1 + 0.1 * (m.id - 1),
  };
};
