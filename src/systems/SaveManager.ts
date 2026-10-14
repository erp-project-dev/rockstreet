import type { BandMember } from '../data/missions';
import type { PowerId, StatId } from '../data/upgrades';

export const SAVE_VERSION = 1;
export const SLOT_COUNT = 3;
const KEY_PREFIX = 'rockstreet.save.';

export interface SaveData {
  version: number;
  slot: number;
  /** Nombre del jugador (máx. 10 caracteres), elegido al crear la partida. */
  name: string;
  createdAt: number;
  updatedAt: number;
  money: number;
  totalEarned: number;
  /** IDs de misiones completadas. */
  completed: number[];
  rescued: BandMember[];
  stats: Record<StatId, number>;
  /** Nivel de cada poder (0 = no comprado/desbloqueado aún). */
  powers: Record<PowerId, number>;
  introSeen: boolean;
  gameFinished: boolean;
}

export const NAME_MAX = 10;

export const createSave = (slot: number, name = ''): SaveData => ({
  version: SAVE_VERSION,
  slot,
  name: name.slice(0, NAME_MAX),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  money: 0,
  totalEarned: 0,
  completed: [],
  rescued: [],
  stats: { vida: 0, fuerza: 0, resistencia: 0, stamina: 0, recuperacion: 0 },
  powers: { powerChord: 1, feedback: 0, solo: 0 },
  introSeen: false,
  gameFinished: false,
});

/** Migra guardados antiguos al esquema actual. */
const migrate = (raw: Partial<SaveData> & { pick?: unknown }, slot: number): SaveData => {
  const base = createSave(slot);
  delete raw.pick; // la púa lanzable se eliminó del juego
  return {
    ...base,
    ...raw,
    stats: { ...base.stats, ...raw.stats },
    powers: { ...base.powers, ...raw.powers },
    version: SAVE_VERSION,
    slot,
  };
};

const storage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const SaveManager = {
  load(slot: number): SaveData | null {
    try {
      const raw = storage()?.getItem(KEY_PREFIX + slot);
      return raw ? migrate(JSON.parse(raw), slot) : null;
    } catch {
      return null;
    }
  },

  save(data: SaveData): void {
    // Negative slots are development previews and must never touch saved games.
    if (data.slot < 0) return;
    data.updatedAt = Date.now();
    try {
      storage()?.setItem(KEY_PREFIX + data.slot, JSON.stringify(data));
    } catch (e) {
      console.warn('No se pudo guardar la partida', e);
    }
  },

  delete(slot: number): void {
    try {
      storage()?.removeItem(KEY_PREFIX + slot);
    } catch {
      /* ignorar */
    }
  },

  listSlots(): (SaveData | null)[] {
    return Array.from({ length: SLOT_COUNT }, (_, i) => this.load(i));
  },

  /** Partida guardada más reciente (para "Continuar"). */
  latest(): SaveData | null {
    return this.listSlots()
      .filter((s): s is SaveData => s !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
  },
};
