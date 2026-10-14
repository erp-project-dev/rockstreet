/**
 * Mejoras compradas con dinero en el Backstage.
 * Costo de un nivel: base * 1.5^nivelActual, redondeado a múltiplos de 5.
 */

export type StatId = 'vida' | 'fuerza' | 'resistencia' | 'stamina' | 'recuperacion';
export type PowerId = 'powerChord' | 'feedback' | 'solo';

export interface UpgradeDef<T extends string> {
  id: T;
  name: string;
  desc: string;
  maxLevel: number;
  baseCost: number;
}

export const STATS: UpgradeDef<StatId>[] = [
  { id: 'vida', name: 'Vida', desc: '+15 de vida máxima por nivel.', maxLevel: 10, baseCost: 100 },
  { id: 'fuerza', name: 'Fuerza', desc: '+12% de daño de golpes físicos por nivel.', maxLevel: 10, baseCost: 100 },
  { id: 'resistencia', name: 'Resistencia', desc: '-4% de daño recibido por nivel.', maxLevel: 10, baseCost: 100 },
  { id: 'stamina', name: 'Stamina', desc: '+10 de stamina máxima por nivel.', maxLevel: 10, baseCost: 100 },
  { id: 'recuperacion', name: 'Recuperación', desc: 'La stamina se recarga más rápido.', maxLevel: 5, baseCost: 120 },
];

export interface PowerDef extends UpgradeDef<PowerId> {
  /** Misión que lo desbloquea (0 = disponible desde el inicio). */
  unlockedByMission: number;
  baseDamage: number;
  baseStaminaCost: number;
  /** Qué cambia en los niveles clave. */
  milestones: Record<number, string>;
}

export const POWERS: PowerDef[] = [
  {
    id: 'powerChord',
    name: 'Power Chord',
    desc: 'Lanza una onda de sonido en línea recta.',
    maxLevel: 5,
    baseCost: 200,
    unlockedByMission: 0,
    baseDamage: 20,
    baseStaminaCost: 25,
    milestones: { 1: 'Onda corta', 3: 'Atraviesa enemigos', 5: 'Doble onda, más alcance' },
  },
  {
    id: 'feedback',
    name: 'Feedback',
    desc: 'Explosión de sonido alrededor de Axel.',
    maxLevel: 5,
    baseCost: 200,
    unlockedByMission: 2,
    baseDamage: 15,
    baseStaminaCost: 35,
    milestones: { 1: 'Empuja', 3: 'Aturde 1 s', 5: 'Radio grande, quema' },
  },
  {
    id: 'solo',
    name: 'Solo de guitarra',
    desc: 'Súper: rayos en toda la pantalla. Gasta toda la stamina.',
    maxLevel: 5,
    baseCost: 400,
    unlockedByMission: 4,
    baseDamage: 60,
    baseStaminaCost: 0, // usa la barra completa
    milestones: { 1: 'Rayos en pantalla', 3: 'Más daño', 5: 'Dura más y cura' },
  },
];

export const upgradeCost = (baseCost: number, currentLevel: number): number =>
  Math.round((baseCost * Math.pow(1.5, currentLevel)) / 5) * 5;
