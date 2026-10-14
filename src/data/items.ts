export type ItemId = 'coin' | 'bill' | 'cash' | 'heartSmall' | 'heartBig' | 'energy' | 'extraLife' | 'goldRecord';

export interface ItemDef {
  id: ItemId;
  texture: string;
  /** Dinero que da al recogerlo. */
  money?: number;
  /** Fracción de vida máxima que cura (0..1). */
  heal?: number;
  /** Fracción de stamina máxima que recupera (0..1). */
  stamina?: number;
  /** +1 vida. */
  extraLife?: boolean;
  /** Duración en ms del daño x2. */
  damageBoostMs?: number;
  /** Desaparece tras este tiempo (ms). undefined = no desaparece. */
  lifetime?: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  coin: { id: 'coin', texture: 'item-coin', money: 10, lifetime: 8000 },
  bill: { id: 'bill', texture: 'item-bill', money: 50, lifetime: 8000 },
  cash: { id: 'cash', texture: 'item-cash', money: 200, lifetime: 8000 },
  heartSmall: { id: 'heartSmall', texture: 'item-heart-small', heal: 0.25, lifetime: 8000 },
  heartBig: { id: 'heartBig', texture: 'item-heart-big', heal: 1 },
  energy: { id: 'energy', texture: 'item-energy', stamina: 0.5, lifetime: 8000 },
  // 1UP: pase VIP "All Access" (antes era una púa dorada y se confundía con la púa lanzable).
  extraLife: { id: 'extraLife', texture: 'item-vip-pass', extraLife: true },
  goldRecord: { id: 'goldRecord', texture: 'item-gold-record', damageBoostMs: 10000, lifetime: 8000 },
};

/** Tabla de botín: [item, peso]. */
export type DropTable = [ItemId | null, number][];

export const pickDrop = (table: DropTable, lowHealth: boolean): ItemId | null => {
  // Ayuda oculta: con poca vida, los corazones pesan el doble.
  const weighted = table.map(([id, w]) => [id, lowHealth && id?.startsWith('heart') ? w * 2 : w] as const);
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [id, w] of weighted) {
    r -= w;
    if (r <= 0) return id;
  }
  return null;
};
