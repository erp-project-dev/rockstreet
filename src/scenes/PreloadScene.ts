import Phaser from 'phaser';
import { loadCombatArt } from '../systems/CombatArt';
import { startArtPreview } from '../systems/ArtPreview';
import { loadPropArt } from '../systems/PropArt';
import { loadItemArt } from '../systems/ItemArt';
import { loadEnemyArt, createEnemyAnimations } from '../systems/EnemyArt';
import { loadWorldArt } from '../systems/WorldArt';
import { loadSkillArt } from '../systems/SkillArt';
import { Sfx } from '../systems/Sfx';
import { DEBUG_ENABLED } from '../systems/Debug';
import { COLORS, CSS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { PLAYER_ART, PLAYER_DASH_ART, PLAYER_MOTION_ART, createPlayerAnimations } from '../systems/PlayerArt';
import { MUSIC } from '../systems/Music';
import { BACKGROUNDS } from '../ui/background';
import { text } from '../ui/ui';

/**
 * Genera los gráficos provisionales en HD por código (formas vectoriales suavizadas).
 * Cuando haya arte final, se cargan aquí con this.load.* usando las mismas claves
 * y tamaños aproximados (jugador ~150x230 px).
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Preload);
  }

  preload() {
    this.showLoading();
    Sfx.load(this);
    loadItemArt(this);
    loadPropArt(this);
    loadCombatArt(this);
    loadEnemyArt(this);
    loadSkillArt(this);
    loadWorldArt(this);
    this.load.atlas(PLAYER_ART, 'assets/characters/axel/axel-sheet.png', 'assets/characters/axel/axel-atlas.json');
    this.load.atlas(PLAYER_DASH_ART, 'assets/characters/axel/axel-dash-sheet.png', 'assets/characters/axel/axel-dash-atlas.json');
    this.load.atlas(PLAYER_MOTION_ART, 'assets/characters/axel/axel-motion.png', 'assets/characters/axel/axel-motion-atlas.json');
    this.load.image(BACKGROUNDS.menu, 'assets/backgrounds/menu.jpg');
    this.load.image(BACKGROUNDS.backstage, 'assets/backgrounds/backstage.jpg');
    this.load.image(BACKGROUNDS.map, 'assets/backgrounds/map.jpg');
    this.load.audio(MUSIC.menu, 'assets/audio/music/menu.mp3');
  }

  create() {
    createPlayerAnimations(this);
    createEnemyAnimations(this);
    this.makeShadow();
    // Menú de debug (F1): escena siempre activa encima de todo, solo en dev o con ?debug.
    if (DEBUG_ENABLED) this.scene.launch(SCENES.Debug);
    if (!startArtPreview(this)) this.scene.start(SCENES.MainMenu);
  }

  /** Pantalla de carga: logo y barra de progreso. Todo el contenido se carga antes del menú. */
  private showLoading() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const barW = 900;
    const barH = 22;
    text(this, cx, cy - 140, 'ROCKSTREET', { font: 'logo', size: 110, color: CSS.cyan, glow: CSS.cyan, origin: [0.5, 0.5] });
    text(this, cx, cy - 40, 'NEON CITY  ·  1986', { font: 'head', size: 30, color: CSS.magenta, glow: CSS.magenta, origin: [0.5, 0.5] });
    const frame = this.add.graphics();
    frame.lineStyle(2, COLORS.magenta, 0.9).strokeRoundedRect(cx - barW / 2 - 6, cy + 60 - 6, barW + 12, barH + 12, (barH + 12) / 2);
    const bar = this.add.graphics();
    const pct = text(this, cx, cy + 120, 'CARGANDO...  0%', { font: 'head', size: 24, color: CSS.yellow, origin: [0.5, 0.5] });
    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => {
      bar.clear();
      bar.fillStyle(COLORS.cyan, 0.15).fillRoundedRect(cx - barW / 2, cy + 60, barW, barH, barH / 2);
      if (v > 0) bar.fillStyle(COLORS.cyan).fillRoundedRect(cx - barW / 2, cy + 60, Math.max(barH, barW * v), barH, barH / 2);
      pct.setText(`CARGANDO...  ${Math.round(v * 100)}%`);
    });
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      pct.setText('¡LISTO!');
    });
  }

  private bake(key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeShadow() {
    this.bake('shadow', 110, 28, (g) => {
      for (let i = 0; i < 6; i++) g.fillStyle(0x000000, 0.1).fillEllipse(55, 14, 110 - i * 14, 28 - i * 3.5);
    });
  }

}
