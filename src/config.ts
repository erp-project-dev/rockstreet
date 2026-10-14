import Phaser from 'phaser';

/** Resolución nativa Full HD; se escala a la ventana manteniendo proporción 16:9. */
export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

/** Tipografías: logo neón, títulos/menús y texto corrido. */
export const FONTS = {
  logo: '"Monoton", sans-serif',
  head: '"Audiowide", sans-serif',
  body: '"Chakra Petch", sans-serif',
} as const;

/** Paleta neón ochentera, usada por toda la UI y los placeholders. */
export const COLORS = {
  bg: 0x07040f,
  bgPanel: 0x140a26,
  magenta: 0xff2bd6,
  cyan: 0x2bf0ff,
  yellow: 0xffe14d,
  orange: 0xff8a2b,
  red: 0xff3b4e,
  green: 0x4dff88,
  purple: 0x7a3cff,
  white: 0xffffff,
  grey: 0x6b6385,
  darkGrey: 0x2a2440,
} as const;

/** Mismos colores como string CSS para Phaser.Text. */
export const CSS = {
  magenta: '#ff2bd6',
  cyan: '#2bf0ff',
  yellow: '#ffe14d',
  orange: '#ff8a2b',
  red: '#ff3b4e',
  green: '#4dff88',
  white: '#ffffff',
  grey: '#6b6385',
} as const;

/** Mapa de teclas del juego (solo teclado). */
export const KEYS = {
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  attack: ['J'], // + clic izquierdo (ver systems/Input.ts)
  dash: ['SPACE', 'K'],
  power1: [], // Power Chord: clic derecho (ver systems/Input.ts)
  power2: ['Q'], // Feedback
  super: ['E'], // Solo de guitarra
  confirm: ['ENTER'],
  back: ['ESC', 'BACKSPACE'],
} as const;

export type Action = keyof typeof KEYS;

/** Banda de suelo caminable (profundidad falsa estilo beat 'em up). */
export const FLOOR_TOP = 680;
export const FLOOR_BOTTOM = 1040;

export const SCENES = {
  Boot: 'Boot',
  Preload: 'Preload',
  MainMenu: 'MainMenu',
  SaveSlots: 'SaveSlots',
  Controls: 'Controls',
  Debug: 'Debug',
  Story: 'Story',
  WorldMap: 'WorldMap',
  Briefing: 'Briefing',
  Backstage: 'Backstage',
  Game: 'Game',
  HUD: 'HUD',
  Pause: 'Pause',
  MissionComplete: 'MissionComplete',
  GameOver: 'GameOver',
} as const;

export const GAME_CONFIG_BASE: Partial<Phaser.Types.Core.GameConfig> = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.bg,
  antialias: true,
  pixelArt: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
