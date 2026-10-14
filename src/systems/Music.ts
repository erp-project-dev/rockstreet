import Phaser from 'phaser';

/** Pistas de música fijas (se cargan en la pantalla de carga). Archivos en public/assets/audio/music/. */
export const MUSIC = {
  menu: 'music-menu',
} as const;

export type MusicKey = string;

/**
 * Temas de gameplay, uno por escenario: public/assets/audio/music/stage-<nombre>.mp3.
 * NO se cargan al inicio: cada tema decodificado ocupa ~80 MB de RAM, así que se carga
 * solo el de la misión actual (ver Music.loadStage).
 */
export const STAGE_TRACKS = ['garage', 'club', 'arcade', 'disqueria', 'metro', 'estudio', 'autopista', 'fachada', 'academia', 'coronacion'] as const;
type StageTrack = (typeof STAGE_TRACKS)[number];

/** Tema de cada misión (uno propio por misión). */
export const MISSION_TRACK: Record<number, StageTrack> = {
  1: 'garage',
  2: 'club',
  3: 'arcade',
  4: 'disqueria',
  5: 'metro',
  6: 'estudio',
  7: 'autopista',
  8: 'fachada', // La Disquera · Discos Fachada
  9: 'academia', // La Academia
  10: 'coronacion', // La Coronación (batalla final)
};

const stageKey = (t: StageTrack) => `music-stage-${t}`;

/** Clave de la música de una misión. */
export const stageMusic = (missionId: number): MusicKey => stageKey(MISSION_TRACK[missionId] ?? 'garage');

const VOLUME = 0.6;
const FADE_MS = 600;

type Track = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
let current: Track | null = null;

/** Fundido independiente de las escenas (sus tweens mueren al cambiar de escena). */
const fade = (track: Track, to: number, ms: number, done?: () => void) => {
  const from = track.volume;
  const start = performance.now();
  const id = window.setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / ms);
    track.setVolume(from + (to - from) * t);
    if (t >= 1) {
      window.clearInterval(id);
      done?.();
    }
  }, 30);
};

/**
 * Música global: el SoundManager es del juego, no de la escena, así que
 * sigue sonando sin cortes entre escenas que usan la misma pista.
 */
export const Music = {
  play(scene: Phaser.Scene, key: MusicKey): void {
    if (current?.key === key && !current.pendingRemove) return;
    this.stop();
    if (!scene.cache.audio.exists(key)) return;
    const track = scene.sound.add(key, { loop: true, volume: 0 }) as Track;
    current = track;
    // Si el navegador bloquea el audio hasta la primera tecla o clic, Phaser lo reproduce al desbloquearse.
    track.play();
    fade(track, VOLUME, FADE_MS);
  },

  /**
   * Encola la carga del tema de la misión (llamar desde preload()) y libera de memoria
   * los demás temas de escenario que no estén sonando.
   */
  loadStage(scene: Phaser.Scene, missionId: number): void {
    const track = MISSION_TRACK[missionId] ?? 'garage';
    for (const t of STAGE_TRACKS) {
      const key = stageKey(t);
      if (t !== track && key !== current?.key && scene.cache.audio.exists(key)) scene.cache.audio.remove(key);
    }
    if (!scene.cache.audio.exists(stageKey(track))) scene.load.audio(stageKey(track), `assets/audio/music/stage-${track}.mp3`);
  },

  stop(fadeMs = FADE_MS): void {
    const track = current;
    current = null;
    if (track) fade(track, 0, fadeMs, () => track.destroy());
  },
};
