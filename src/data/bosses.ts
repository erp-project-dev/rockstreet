import type { EnemyId } from './enemies';

/**
 * Movimientos reutilizables de los jefes:
 *  - combo:   se acerca y encadena golpes cuerpo a cuerpo
 *  - charge:  se alinea en el carril y embiste (esquiva cambiando de carril)
 *  - slam:    golpe al suelo con onda expansiva alrededor (esquiva alejándote; el dash ayuda)
 *  - shoot:   dispara proyectiles por el carril (esquiva cambiando de carril)
 *  - summon:  llama a fanáticos de refuerzo
 *  - loop:      repite su último movimiento ("¡pon el loop!")
 *  - sidechain: 4 pulsos al ritmo del beat alrededor suyo (aléjate de su radio)
 *  - contract:  lanza contratos que te ralentizan si te alcanzan
 *  - scale:     barre los 7 carriles EN ORDEN como una escala; nunca toca el 7.º (la séptima) = carril seguro
 *  - arpeggio:  tríada de 3 notas en tu carril y los vecinos
 */
export type BossMove = 'combo' | 'charge' | 'slam' | 'shoot' | 'summon' | 'loop' | 'sidechain' | 'contract' | 'scale' | 'arpeggio';

export interface BossDef {
  missionId: number;
  hp: number;
  damage: number;
  speed: number;
  /** Escala del sprite (1 = tamaño de un fanático). */
  scale: number;
  /** Colores del sprite provisional: tono de piel y ropa/acento. */
  skin: number;
  accent: number;
  /** Peinado del sprite provisional. */
  hair: 'mohawk' | 'long' | 'bald' | 'crown' | 'pomp' | 'chullo';
  /** Complexión del sprite. */
  build?: 'normal' | 'slender';
  /** Lo que lleva en la mano. */
  holds?: 'guitar' | 'vinyl';
  /** Movimientos y su peso (probabilidad relativa). */
  moves: Partial<Record<BossMove, number>>;
  /** Golpes por combo. */
  comboHits: number;
  /** Proyectiles por disparo. */
  shots: number;
  /** Refuerzos que llama con "summon". */
  summon: EnemyId[];
  /** Frase al aparecer (estilo arcade). */
  taunt: string;
  /** Ciclo fijo de movimientos en vez de elegir al azar (predecible a propósito). */
  pattern?: BossMove[];
  /** Fases por vida (cada fase: más rápido y más proyectiles). Sin esto, se enfurece al 50%. */
  phases?: number;
  /** Texto al entrar en cada fase (índice = fase). */
  phaseTexts?: string[];
  /** Lo que grita al empezar cada movimiento. */
  callouts?: Partial<Record<BossMove, string>>;
  /** Momento de debilidad ligado a su defecto: con este % de vida queda aturdido (una vez). */
  fumble?: { at: number; text: string; ms: number };
}

/** Un jefe por misión: cada falso guitarrista. Los nombres y defectos están en missions.ts. */
export const BOSSES: Record<number, BossDef> = {
  1: {
    missionId: 1, hp: 260, damage: 10, speed: 190, scale: 1.25, skin: 0xe0a07a, accent: 0x4dff88, hair: 'mohawk',
    moves: { combo: 3, charge: 1 }, comboHits: 2, shots: 0, summon: [],
    taunt: '¡Tres acordes bastan para ser leyenda!',
  },
  2: {
    missionId: 2, hp: 340, damage: 11, speed: 180, scale: 1.25, skin: 0xc98b62, accent: 0xffe14d, hair: 'pomp',
    moves: { combo: 2, shoot: 2, summon: 1 }, comboHits: 2, shots: 1, summon: ['punk', 'punk'],
    taunt: 'Dale play a la cinta... ¡y aplaudan!',
  },
  3: {
    missionId: 3, hp: 400, damage: 11, speed: 240, scale: 1.25, skin: 0xf2c19a, accent: 0x2bf0ff, hair: 'long',
    moves: { combo: 3, shoot: 2 }, comboHits: 4, shots: 3, summon: [],
    taunt: '¡Mil notas por segundo! ¿Sentimiento? ¿Qué es eso?',
  },
  4: {
    missionId: 4, hp: 460, damage: 12, speed: 200, scale: 1.25, skin: 0xe8b08a, accent: 0xff2bd6, hair: 'crown',
    moves: { shoot: 3, slam: 1, combo: 1 }, comboHits: 2, shots: 2, summon: [],
    taunt: 'Ese bend... ¡casi llega a la nota!',
  },
  5: {
    missionId: 5, hp: 520, damage: 13, speed: 220, scale: 1.3, skin: 0xb07a52, accent: 0xff8a2b, hair: 'pomp',
    moves: { charge: 3, summon: 1, combo: 1 }, comboHits: 2, shots: 0, summon: ['mohawk', 'punk'],
    taunt: 'No necesito enchufar la guitarra. ¡Mira mi pose!',
  },
  6: {
    missionId: 6, hp: 580, damage: 13, speed: 210, scale: 1.25, skin: 0xd09670, accent: 0x7a3cff, hair: 'long',
    moves: { combo: 2, charge: 1, shoot: 2 }, comboHits: 3, shots: 2, summon: [],
    taunt: 'Tu solo... ahora es mío. Nota por nota.',
  },
  7: {
    missionId: 7, hp: 640, damage: 15, speed: 180, scale: 1.4, skin: 0xa8704c, accent: 0xff3b4e, hair: 'mohawk',
    moves: { slam: 3, shoot: 2, combo: 1 }, comboHits: 2, shots: 1, summon: [],
    taunt: '¡MÁS VOLUMEN! ¡Así nadie nota nada!',
  },
  8: {
    // BLAK SOURCE, el Productor: dejó la guitarra y ahora solo produce desde su consola.
    missionId: 8, hp: 760, damage: 15, speed: 190, scale: 1.3, skin: 0xe6ac84, accent: 0xd98a2b, hair: 'chullo', holds: 'vinyl',
    moves: { loop: 2, sidechain: 2, contract: 2, summon: 1, combo: 1 }, comboHits: 2, shots: 2, summon: ['skinhead', 'thrower'],
    taunt: 'Yo ya no toco. Yo PRODUZCO.',
    callouts: { loop: '¡PON EL LOOP!', sidechain: 'SIDECHAIN...', contract: '¡FIRMA AQUÍ!', summon: '¡MÚSICOS DE SESIÓN!' },
    fumble: { at: 0.25, text: 'Agarra la guitarra... ¿cómo era el acorde de Mi?', ms: 2600 },
  },
  9: {
    // ALEX ESCALANDER: todo en el orden de las escalas, arpegios de manual, no conoce las séptimas.
    missionId: 9, hp: 920, damage: 16, speed: 210, scale: 1.3, skin: 0xf0c8a0, accent: 0x3a5cff, hair: 'pomp', build: 'slender',
    moves: { scale: 3, arpeggio: 2, combo: 1 }, comboHits: 2, shots: 1, summon: [],
    taunt: 'Primero la escala. Luego otra escala. Siempre en orden.',
    callouts: { scale: 'DO · RE · MI · FA · SOL · LA...', arpeggio: 'ARPEGIO DE MANUAL' },
    fumble: { at: 0.5, text: 'Intenta una séptima... ¡y se le enredan los dedos!', ms: 2400 },
  },
  10: {
    // CARLOS PARRILLA: toda su carrera con 3 licks. Siempre el mismo ciclo, cada fase más fuerte.
    missionId: 10, hp: 1250, damage: 18, speed: 230, scale: 1.4, skin: 0xd9a07a, accent: 0xff2bd6, hair: 'crown',
    moves: { combo: 1, shoot: 1, charge: 1 }, comboHits: 3, shots: 2, summon: [],
    taunt: 'Tres licks. Toda una carrera. ¿Para qué más?',
    pattern: ['combo', 'shoot', 'charge'],
    callouts: { combo: 'LICK #1', shoot: 'LICK #2', charge: 'LICK #3' },
    phases: 3,
    phaseTexts: ['', '', '¡LOS MISMOS 3 LICKS... MÁS FUERTE!', '¡LA CONSOLA MAESTRA LO POTENCIA!'],
  },
};
