import { MISSIONS, getMission } from '../data/missions';
import { POWERS, STATS, upgradeCost, type PowerId, type StatId } from '../data/upgrades';
import { SaveManager, type SaveData } from './SaveManager';

/** Estadísticas reales del jugador, derivadas de las mejoras compradas. */
export interface PlayerStats {
  maxHp: number;
  attackMult: number;
  damageTaken: number; // multiplicador (1 = daño completo)
  maxStamina: number;
  staminaRegen: number; // puntos por segundo
  speed: number;
}

let current: SaveData | null = null;

/** Estado de la partida activa. Una sola fuente de verdad para todas las escenas. */
export const GameState = {
  get data(): SaveData {
    if (!current) throw new Error('No hay partida cargada');
    return current;
  },

  get hasGame(): boolean {
    return current !== null;
  },

  set(data: SaveData): void {
    current = data;
  },

  persist(): void {
    if (current) SaveManager.save(current);
  },

  stats(): PlayerStats {
    const s = this.data.stats;
    return {
      maxHp: 100 + 15 * s.vida,
      attackMult: 1 + 0.12 * s.fuerza,
      damageTaken: 1 - 0.04 * s.resistencia,
      maxStamina: 100 + 10 * s.stamina,
      staminaRegen: 4 + 1.5 * s.recuperacion,
      speed: 380,
    };
  },

  // ---- Misiones ----

  isCompleted(id: number): boolean {
    return this.data.completed.includes(id);
  },

  /** Progresión lineal: la misión N se desbloquea al completar la N-1. */
  isUnlocked(id: number): boolean {
    return id === 1 || this.isCompleted(id - 1);
  },

  /** Siguiente misión pendiente (la que el mapa resalta). */
  nextMission(): number {
    return MISSIONS.find((m) => !this.isCompleted(m.id))?.id ?? MISSIONS.length;
  },

  /** Aplica las recompensas al terminar una misión. */
  completeMission(id: number, moneyCollected: number): { firstTime: boolean; reward: number } {
    const d = this.data;
    const mission = getMission(id);
    const firstTime = !d.completed.includes(id);
    // La recompensa fija solo se da la primera vez; el dinero recogido siempre.
    const reward = firstTime ? mission.reward : 0;
    d.money += moneyCollected + reward;
    d.totalEarned += moneyCollected + reward;
    if (firstTime) {
      d.completed.push(id);
      if (mission.rescues && !d.rescued.includes(mission.rescues)) d.rescued.push(mission.rescues);
      if (mission.unlocksPower && d.powers[mission.unlocksPower] === 0) d.powers[mission.unlocksPower] = 1;
      if (id === MISSIONS.length) d.gameFinished = true;
    }
    this.persist();
    return { firstTime, reward };
  },

  // ---- Tienda ----

  statCost(id: StatId): number | null {
    const def = STATS.find((s) => s.id === id)!;
    const lvl = this.data.stats[id];
    return lvl >= def.maxLevel ? null : upgradeCost(def.baseCost, lvl);
  },

  powerCost(id: PowerId): number | null {
    const def = POWERS.find((p) => p.id === id)!;
    const lvl = this.data.powers[id];
    if (lvl === 0 || lvl >= def.maxLevel) return null;
    return upgradeCost(def.baseCost, lvl);
  },

  buyStat(id: StatId): boolean {
    const cost = this.statCost(id);
    if (cost === null || cost > this.data.money) return false;
    this.data.money -= cost;
    this.data.stats[id]++;
    this.persist();
    return true;
  },

  buyPower(id: PowerId): boolean {
    const cost = this.powerCost(id);
    if (cost === null || cost > this.data.money) return false;
    this.data.money -= cost;
    this.data.powers[id]++;
    this.persist();
    return true;
  },
};
