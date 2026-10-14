import Phaser from 'phaser';

const variants = { hit: 3 } as const;
const singles = ['cash', 'heal', 'energy', 'life', 'boost', 'heavy', 'hurt', 'break', 'slam', 'pickThrow', 'pickHit'] as const;
export type SfxId = typeof singles[number] | keyof typeof variants;
const volumes: Partial<Record<SfxId, number>> = {
  hit: .43, heavy: .48, hurt: .35, break: .34, slam: .4,
  pickThrow: .2, pickHit: .36, cash: .18, heal: .2, energy: .2, life: .23, boost: .23,
};
type State = { last: Map<string, number>; variant: Map<string, number>; active: Set<Phaser.Sound.BaseSound> };
const states = new WeakMap<Phaser.Sound.BaseSoundManager, State>();
/** Global voices survive scene transitions; caps prevent multi-target hits piling up. */
export const Sfx = {
  load(scene: Phaser.Scene): void {
    for (const id of singles) scene.load.audio(`sfx-${id}`, `assets/audio/sfx/${id}.wav?v=physical-1`);
    for (const [id, count] of Object.entries(variants)) {
      for (let i = 1; i <= count; i++) scene.load.audio(`sfx-${id}-${i}`, `assets/audio/sfx/${id}-${i}.wav?v=physical-1`);
    }
  },
  play(scene: Phaser.Scene, id: SfxId): void {
    const manager = scene.sound;
    if (manager.locked || manager.mute) return;
    let state = states.get(manager);
    if (!state) {
      state = { last: new Map(), variant: new Map(), active: new Set() };
      states.set(manager, state);
    }
    const now = performance.now();
    const gap = id === 'hit' || id === 'heavy' || id === 'pickHit' || id === 'cash' ? 65 : 45;
    if (now - (state.last.get(id) ?? -Infinity) < gap || state.active.size >= 12) return;
    const count = variants[id as keyof typeof variants];
    let key = `sfx-${id}`;
    if (count) {
      const prev = state.variant.get(id) ?? 0;
      const next = (prev + 1 + Math.floor(Math.random() * (count - 1))) % count;
      state.variant.set(id, next);
      key += `-${next + 1}`;
    }
    if (!scene.cache.audio.exists(key)) return;
    state.last.set(id, now);
    const voice = manager.add(key, { volume: volumes[id] ?? .33 });
    const active = state.active;
    active.add(voice);
    voice.once(Phaser.Sound.Events.COMPLETE, () => voice.destroy());
    voice.once(Phaser.Sound.Events.DESTROY, () => active.delete(voice));
    if (!voice.play()) voice.destroy();
  },
  stop(scene: Phaser.Scene): void {
    const state = states.get(scene.sound);
    if (state) for (const voice of [...state.active]) voice.destroy();
  },
};
