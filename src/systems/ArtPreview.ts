import Phaser from 'phaser';
import { ArtLabScene } from '../scenes/ArtLabScene';
import { SCENES } from '../config';
import { GameState } from './GameState';
import { createSave } from './SaveManager';

/** Development-only entrypoints for visual QA, with an unsaved temporary party. */
export function startArtPreview(scene: Phaser.Scene): boolean {
  if (!import.meta.env.DEV) return false;
  const preview = new URLSearchParams(window.location.search).get('artPreview');
  if (!preview) return false;
  const match = /^(level|lore|boss)-(10|[1-9])$/.exec(preview);
  if (!match && !['intro', 'ending', 'actors', 'backstage', 'map'].includes(preview)) return false;
  const data = createSave(-1);
  data.money = 9999;
  data.powers = { powerChord: 1, feedback: 1, solo: 1 };
  data.completed = Array.from({ length: 10 }, (_, i) => i + 1);
  data.rescued = ['TAMBO', 'LOLA', 'KEI'];
  data.stats.vida = 8;
  data.stats.resistencia = 10;
  GameState.set(data);
  if (preview === 'actors') { scene.scene.add('ArtLab', ArtLabScene, false); scene.scene.start('ArtLab'); return true; }
  if (match) scene.scene.start(match[1] === 'lore' ? SCENES.Briefing : SCENES.Game, { missionId: Number(match[2]), previewBoss: match[1] === 'boss' });
  else scene.scene.start(preview === 'intro' || preview === 'ending' ? SCENES.Story : preview === 'map' ? SCENES.WorldMap : SCENES.Backstage, { kind: preview === 'ending' ? 'ending' : 'intro' });
  return true;
}
