import fs from 'node:fs';
import ts from 'typescript';
function moduleExports(file) {
  const source = fs.readFileSync(file, 'utf8').replace(/^import .*\r?\n/gm, '');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('exports', compiled)(exports);
  return exports;
}
const player = moduleExports('src/systems/PlayerArt.ts');
const enemy = moduleExports('src/systems/EnemyArt.ts');
const animations = {};
const scene = { anims: { exists: () => false, create: def => { animations[def.key] = def; } } };
player.createPlayerAnimations(scene);
enemy.createEnemyAnimations(scene);
const textures = {
  [player.PLAYER_ART]: { image: 'assets/characters/axel/axel-sheet.png', atlas: 'assets/characters/axel/axel-atlas.json' },
  [player.PLAYER_DASH_ART]: { image: 'assets/characters/axel/axel-dash-sheet.png', atlas: 'assets/characters/axel/axel-dash-atlas.json' },
  [player.PLAYER_MOTION_ART]: { image: 'assets/characters/axel/axel-motion.png', atlas: 'assets/characters/axel/axel-motion-atlas.json' },
};
for (const item of enemy.CHARACTER_ART) {
  textures[item.key] = { image: `assets/characters/${item.folder}/${item.folder}-sheet.png`, atlas: `assets/characters/${item.folder}/${item.folder}-atlas.json` };
  textures[`${item.key}-motion`] = { image: `assets/characters/${item.folder}/${item.folder}-motion.png`, atlas: `assets/characters/${item.folder}/${item.folder}-motion-atlas.json` };
}
const characters = { axel: { prefix: 'axel', texture: player.PLAYER_ART } };
for (const item of enemy.CHARACTER_ART) characters[item.folder] = { prefix: item.key, texture: item.key };
fs.writeFileSync('public/assets/animation-manifest.json', JSON.stringify({ animations, textures, characters }, null, 2));
console.log('Exported actual Phaser definitions:', Object.keys(animations).length, 'animations.');
