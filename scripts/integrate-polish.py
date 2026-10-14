"""Install reviewed animation sheets and combat assets into the existing game."""
from pathlib import Path
import re,json
ROOT=Path(__file__).resolve().parents[1]
tasks=json.loads((ROOT/'scripts/polish-prompts.json').read_text())['tasks']
for task in tasks:assert (ROOT/task['out']).exists(),task['out']
for name in ['PlayerArt','CombatArt']:
 (ROOT/f'src/systems/{name}.ts').write_text((ROOT/f'scripts/art-integration/{name}.ts').read_text())
(ROOT/'src/scenes/ArtLabScene.ts').write_text((ROOT/'scripts/art-integration/ArtLabScene.ts').read_text())
p=ROOT/'src/systems/EnemyArt.ts';s=p.read_text();needle='    scene.load.atlas(key, `assets/characters/${folder}/${folder}-sheet.png`, `assets/characters/${folder}/${folder}-atlas.json`);';assert needle in s;s=s.replace(needle,needle+'\n    scene.load.atlas(`${key}-motion`, `assets/characters/${folder}/${folder}-motion.png`, `assets/characters/${folder}/${folder}-motion-atlas.json`);')
a=s.index('    const poses:');b=s.index('    for (const [pose, def]',a)
s=s[:a]+'''    const main = (frame: number) => ({ key, frame: String(frame) });
    const motion = (frame: number) => ({ key: `${key}-motion`, frame: String(frame) });
    const poses: Record<string, { frames: { key: string; frame: string }[]; fps: number; repeat: number }> = {
      idle: { frames: [main(0), main(1)], fps: 3, repeat: -1 },
      walk: { frames: [main(2), main(3), main(4), main(5)], fps: 9, repeat: -1 },
      windup: { frames: [motion(1), main(6)], fps: 5, repeat: 0 },
      attack: { frames: [main(7), motion(2), main(0)], fps: key.startsWith('boss-') ? 12.5 : 9.375, repeat: 0 },
      charge: { frames: [main(8), motion(3)], fps: 12, repeat: -1 },
      hurt: { frames: [main(9), motion(4), motion(5)], fps: 11.54, repeat: 0 },
      down: { frames: [motion(6)], fps: 1, repeat: 0 },
      dead: { frames: [motion(6)], fps: 1, repeat: 0 },
      getup: { frames: [main(11), motion(7), main(0)], fps: 6.67, repeat: 0 },
    };
    if (frameCount === 16) {
      poses.shoot = { frames: [main(12), motion(2), main(0)], fps: 10, repeat: 0 };
      poses.slam = { frames: [main(13), motion(2), main(0)], fps: 6.67, repeat: 0 };
      poses.summon = { frames: [main(14), motion(0), main(0)], fps: 6, repeat: 0 };
      poses.special = { frames: [main(15), motion(2), main(0)], fps: 7.5, repeat: 0 };
    }
''' +s[b:];s=s.replace('def.frames.map(frame => ({ key, frame: String(frame) }))','def.frames');p.write_text(s)
p=ROOT/'src/entities/Fighter.ts';s=p.read_text().replace('  protected baseScale: number;','  protected baseScale: number;\n  readonly artTexture: string;').replace('    this.baseScale = scale;','    this.baseScale = scale;\n    this.artTexture = texture;');p.write_text(s)
p=ROOT/'src/entities/Enemy.ts';s=p.read_text().replace('const texture = this.sprite.texture.key;','const texture = this.artTexture;');needle='    // The sheet includes a lying pose';idx=s.index(needle);s=s[:idx]+'''    // Normalize across the source sheet and its higher-resolution transitions.
    const reference = this.scene.textures.get(texture).get('0');
    this.sprite.setScale(this.baseScale * 232 * reference.realHeight / reference.cutHeight / this.sprite.frame.realHeight);
''' +s[idx:];s=re.sub(r"    this.scene.tweens.add\(\{ targets: this.sprite, scaleX: this.sprite.scaleX \* 0.92, duration: ms \* 0.8, yoyo: true \}\);\n",'',s);p.write_text(s)
p=ROOT/'src/entities/Player.ts';s=p.read_text().replace("    if (this.state === 'attack') pose", "    const falling = this.state === 'down' && !this.onGround;\n    if (falling) pose = 'fall';\n    else if (this.state === 'attack') pose").replace("    if (pose === 'getup') this.sprite.setAngle(0);","    if (pose === 'getup' || pose === 'down' || pose === 'dead') this.sprite.setAngle(0);");p.write_text(s)
p=ROOT/'src/scenes/PreloadScene.ts';s=p.read_text().replace("import Phaser from 'phaser';","import Phaser from 'phaser';\nimport { loadCombatArt } from '../systems/CombatArt';").replace('PLAYER_DASH_ART, createPlayerAnimations','PLAYER_DASH_ART, PLAYER_MOTION_ART, createPlayerAnimations').replace('    loadPropArt(this);','    loadPropArt(this);\n    loadCombatArt(this);');needle="    this.load.atlas(PLAYER_DASH_ART, 'assets/characters/axel/axel-dash-sheet.png', 'assets/characters/axel/axel-dash-atlas.json');";s=s.replace(needle,needle+"\n    this.load.atlas(PLAYER_MOTION_ART, 'assets/characters/axel/axel-motion.png', 'assets/characters/axel/axel-motion-atlas.json');")
a=s.index('    // Botella\n');b=s.index('\n  }\n}',a);s=s[:a]+s[b:];s=s.replace('    this.makeProps();\n','');a=s.index('  private makeProps()');s=s[:a]+'}\n';p.write_text(s)
p=ROOT/'src/systems/WorldArt.ts';s=p.read_text().replace("  scene.load.image('story-intro', 'assets/lore/intro.jpg');","  scene.load.image('story-intro', 'assets/lore/intro.jpg');\n  scene.load.image('story-ending', 'assets/lore/ending.jpg');");p.write_text(s)
p=ROOT/'src/scenes/StoryScene.ts';s=p.read_text().replace('panel, synthwaveBackground, text','panel, text').replace("    else synthwaveBackground(this, { sun: true });","    else background(this, 'story-ending', .2);");p.write_text(s)
p=ROOT/'src/systems/ArtPreview.ts';s=p.read_text().replace("import Phaser from 'phaser';","import Phaser from 'phaser';\nimport { ArtLabScene } from '../scenes/ArtLabScene';").replace("['intro', 'backstage', 'map']","['intro', 'ending', 'actors', 'backstage', 'map']");s=s.replace('  if (match) scene.scene.start',"  if (preview === 'actors') { scene.scene.add('ArtLab', ArtLabScene, true); return true; }\n  if (match) scene.scene.start");s=s.replace("preview === 'intro' ? SCENES.Story", "preview === 'intro' || preview === 'ending' ? SCENES.Story").replace("{ kind: 'intro' });","{ kind: preview === 'ending' ? 'ending' : 'intro' });");p.write_text(s)
p=ROOT/'src/scenes/GameScene.ts';s=p.read_text().replace("import Phaser from 'phaser';","import Phaser from 'phaser';\nimport { combatImage, PROJECTILE_SIZE } from '../systems/CombatArt';")
s=s.replace('    const sprite = this.add.image(0, 0, kind);',"    const [width, height] = PROJECTILE_SIZE[kind];\n    const sprite = combatImage(this, 0, 0, kind, width, height, true);")
a=s.index('          const wave = this.add.graphics();');b=s.index('          this.projectiles.push(new Projectile(wave',a)
s=s[:a]+"          const wave = combatImage(this, 0, 0, 'fx-wave', 128, 166).setFlipX(p.facing === -1);\n"+s[b:]
s=s.replace("        const ring = this.add.ellipse(p.x, p.y - 40, 80, 36).setStrokeStyle(6 - i * 1.5, COLORS.magenta).setDepth(depth);", "        const ring = combatImage(this, p.x, p.y - 40, 'fx-ring', 80, 36).setAlpha(1 - i * .15).setDepth(depth);")
s=s.replace('scaleX: (radius * 2) / 80, scaleY: (radius * 0.9) / 36','scaleX: ring.scaleX * (radius * 2) / 80, scaleY: ring.scaleY * (radius * 0.9) / 36')
a=s.index('    const g = this.add.graphics().setDepth(6000);');b=s.index('    const soloDamage =',a)
s=s[:a]+'''    for (let i = 0; i < 8; i++) {
      const x = cam.scrollX + (i + .5) * GAME_WIDTH / 8 + Phaser.Math.Between(-40, 40);
      const bolt = combatImage(this, x, FLOOR_BOTTOM / 2, 'fx-bolt', 65 + i % 3 * 18, FLOOR_BOTTOM).setDepth(6000).setFlipX(i % 2 === 1);
      this.tweens.add({ targets: bolt, alpha: 0, delay: i * 18, duration: 420, onComplete: () => bolt.destroy() });
    }
''' +s[b:]
a=s.index('    const g = this.add.graphics().setPosition(x, y).setDepth(7000);');b=s.index('\n  }',a)
s=s[:a]+'''    const burst = combatImage(this, x, y, 'fx-impact', 92 * scale, 92 * scale).setDepth(7000);
    if (color !== COLORS.white && color !== COLORS.yellow) burst.setTint(color);
    burst.setAngle(Phaser.Math.Between(-18, 18));
    this.tweens.add({ targets: burst, scaleX: burst.scaleX * 1.45, scaleY: burst.scaleY * 1.45, alpha: 0, duration: 150, ease: 'Quad.easeOut', onComplete: () => burst.destroy() });
''' +s[b:]
p.write_text(s)
