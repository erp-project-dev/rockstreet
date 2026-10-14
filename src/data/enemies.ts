import type { DropTable } from './items';

export type EnemyId = 'punk' | 'mohawk' | 'chain' | 'skinhead' | 'thrower';

export type EnemyBehavior = 'brawler' | 'charger' | 'thrower';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  role: string;
  behavior: EnemyBehavior;
  hp: number;
  damage: number;
  /** Velocidad de marcha (px/s, resolución 1080p). */
  speed: number;
  /** Alcance del golpe en px. */
  reach: number;
  /** Tiempo de aviso antes de golpear (ms): la ventana para esquivar. */
  windup: number;
  /** Pausa entre ataques (ms) [mín, máx]. */
  cooldown: [number, number];
  /** Su golpe tumba al jugador. */
  knockdown?: boolean;
  /** No se interrumpe al recibir golpes normales. */
  superArmor?: boolean;
  /** Colores del sprite provisional. */
  colors: { crest: number; jacket: number };
  /** Escala del sprite (los grandotes son más grandes). */
  scale: number;
  drops: DropTable;
}

/** LOS FANÁTICOS: punks que defienden a los falsos guitarristas. */
export const ENEMIES: Record<EnemyId, EnemyDef> = {
  punk: {
    id: 'punk', name: 'FANÁTICO', role: 'Básico, golpea y va en grupo', behavior: 'brawler',
    hp: 40, damage: 7, speed: 170, reach: 110, windup: 320, cooldown: [900, 1600],
    colors: { crest: 0x4dff88, jacket: 0x3a2a4a }, scale: 1,
    drops: [['coin', 50], ['bill', 10], ['heartSmall', 10], ['energy', 8], [null, 40]],
  },
  mohawk: {
    id: 'mohawk', name: 'CRESTA', role: 'Rápido, embiste en carrera, frágil', behavior: 'charger',
    hp: 30, damage: 9, speed: 260, reach: 100, windup: 450, cooldown: [1400, 2200], knockdown: true,
    colors: { crest: 0xff2bd6, jacket: 0x2a1a3a }, scale: 0.95,
    drops: [['coin', 50], ['bill', 15], ['heartSmall', 8], ['energy', 10], [null, 35]],
  },
  chain: {
    id: 'chain', name: 'CADENAS', role: 'Latigazo de alcance medio', behavior: 'brawler',
    hp: 50, damage: 10, speed: 150, reach: 190, windup: 420, cooldown: [1100, 1800],
    colors: { crest: 0xffe14d, jacket: 0x4a2a2a }, scale: 1,
    drops: [['coin', 40], ['bill', 20], ['heartSmall', 12], ['energy', 8], [null, 30]],
  },
  skinhead: {
    id: 'skinhead', name: 'GRANDOTE', role: 'Tanque, no se interrumpe, golpe que tumba', behavior: 'brawler',
    hp: 120, damage: 15, speed: 120, reach: 130, windup: 600, cooldown: [1500, 2300], knockdown: true, superArmor: true,
    colors: { crest: 0xf2b38a, jacket: 0x2a3a2a }, scale: 1.2,
    drops: [['bill', 40], ['cash', 8], ['heartSmall', 15], ['heartBig', 3], [null, 20]],
  },
  thrower: {
    id: 'thrower', name: 'LANZADOR', role: 'Tira botellas desde lejos', behavior: 'thrower',
    hp: 35, damage: 8, speed: 160, reach: 0, windup: 500, cooldown: [1800, 2800],
    colors: { crest: 0x2bf0ff, jacket: 0x2a2a4a }, scale: 1,
    drops: [['coin', 50], ['bill', 15], ['energy', 15], [null, 35]],
  },
};

/** Enemigos disponibles a partir de cada misión (la variedad crece con el juego). */
export const ENEMY_UNLOCK: Record<EnemyId, number> = {
  punk: 1,
  mohawk: 2,
  chain: 3,
  thrower: 4,
  skinhead: 5,
};

/** Botín de objetos rompibles del escenario: más corazones que los enemigos. */
export const BREAKABLE_DROPS: DropTable = [['heartSmall', 30], ['heartBig', 6], ['energy', 20], ['bill', 20], ['cash', 6], ['goldRecord', 4], ['extraLife', 1]];
