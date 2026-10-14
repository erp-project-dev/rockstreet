import Phaser from 'phaser';
import { GAME_CONFIG_BASE } from './config';
import { BackstageScene } from './scenes/BackstageScene';
import { BootScene } from './scenes/BootScene';
import { BriefingScene } from './scenes/BriefingScene';
import { ControlsScene } from './scenes/ControlsScene';
import { DebugScene } from './scenes/DebugScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { HUDScene } from './scenes/HUDScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { MissionCompleteScene } from './scenes/MissionCompleteScene';
import { PauseScene } from './scenes/PauseScene';
import { PreloadScene } from './scenes/PreloadScene';
import { SaveSlotsScene } from './scenes/SaveSlotsScene';
import { StoryScene } from './scenes/StoryScene';
import { WorldMapScene } from './scenes/WorldMapScene';

const game = new Phaser.Game({
  ...GAME_CONFIG_BASE,
  parent: 'game',
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    SaveSlotsScene,
    ControlsScene,
    DebugScene,
    StoryScene,
    WorldMapScene,
    BriefingScene,
    BackstageScene,
    GameScene,
    HUDScene,
    PauseScene,
    MissionCompleteScene,
    GameOverScene,
  ],
});

// Acceso desde la consola del navegador en desarrollo.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
