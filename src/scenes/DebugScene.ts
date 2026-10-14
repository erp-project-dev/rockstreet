import Phaser from 'phaser';
import { COLORS, CSS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { MISSIONS } from '../data/missions';
import { POWERS, STATS } from '../data/upgrades';
import { DEBUG_ENABLED, DebugFlags } from '../systems/Debug';
import { GameState } from '../systems/GameState';
import { Input } from '../systems/Input';
import { formatMoney, panel, text } from '../ui/ui';
import type { GameScene } from './GameScene';

interface Item {
  label: () => string;
  /** Solo disponible dentro de una misión / con partida cargada. */
  needs?: 'game' | 'save';
  run: () => void;
}

/**
 * Menú de debug (F1), siempre corriendo encima de todo. Al abrirlo pausa las escenas activas;
 * al cerrarlo las reanuda. Solo existe si DEBUG_ENABLED (dev o URL con ?debug).
 */
export class DebugScene extends Phaser.Scene {
  private input2!: Input;
  private toggleKey!: Phaser.Input.Keyboard.Key;
  private open = false;
  private paused: string[] = [];
  private index = 0;
  private items: Item[] = [];
  private menu!: Phaser.GameObjects.Container;
  private rows: Phaser.GameObjects.Text[] = [];
  private toast!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.Debug);
  }

  create() {
    this.input2 = new Input(this);
    this.toggleKey = this.input.keyboard!.addKey('F1', true);
    this.items = [
      { label: () => `Vida infinita: ${DebugFlags.god ? 'SÍ' : 'NO'}`, run: () => this.toggleGod() },
      { label: () => `Mostrar info (FPS, nivel): ${DebugFlags.info ? 'SÍ' : 'NO'}`, run: () => (DebugFlags.info = !DebugFlags.info) },
      { label: () => 'Ir al jefe', needs: 'game', run: () => this.game2()?.debugJumpToBoss() },
      { label: () => 'Derrotar enemigos en pantalla', needs: 'game', run: () => this.game2()?.debugClearEnemies() },
      { label: () => 'Vida y stamina al máximo', needs: 'game', run: () => this.game2()?.debugHeal() },
      { label: () => 'Ganar la misión', needs: 'game', run: () => this.game2()?.debugWin() },
      { label: () => '+ $1,000', needs: 'save', run: () => this.addMoney(1000) },
      { label: () => 'Desbloquear todas las misiones', needs: 'save', run: () => this.unlockAll() },
      { label: () => 'Mejoras al máximo', needs: 'save', run: () => this.maxUpgrades() },
      { label: () => 'Reiniciar mejoras', needs: 'save', run: () => this.resetUpgrades() },
    ];

    // Panel del menú (oculto)
    this.menu = this.add.container(0, 0).setVisible(false);
    const W = 760;
    const H = 110 + this.items.length * 52;
    const x0 = (GAME_WIDTH - W) / 2;
    const y0 = (GAME_HEIGHT - H) / 2;
    this.menu.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bg, 0.6).setOrigin(0));
    this.menu.add(panel(this, x0, y0, W, H, COLORS.orange));
    this.menu.add(text(this, x0 + 40, y0 + 45, 'DEBUG  ·  F1 para cerrar', { font: 'head', size: 26, color: CSS.orange, origin: [0, 0.5] }));
    this.rows = this.items.map((_, i) => {
      const t = text(this, x0 + 40, y0 + 105 + i * 52, '', { size: 28, origin: [0, 0.5] });
      this.menu.add(t);
      return t;
    });
    this.toast = text(this, GAME_WIDTH / 2, y0 + H + 40, '', { font: 'head', size: 22, color: CSS.yellow, origin: [0.5, 0.5] });
    this.menu.add(this.toast);

    // Info en pantalla (esquina inferior izquierda)
    this.info = text(this, 20, GAME_HEIGHT - 20, '', { size: 20, color: CSS.green, origin: [0, 1], stroke: true });
  }

  private game2(): GameScene | null {
    const g = this.scene.get(SCENES.Game) as GameScene;
    return g && (g.sys.isActive() || g.sys.isPaused()) && g.player ? g : null;
  }

  private available(item: Item): boolean {
    if (item.needs === 'game') return this.game2() !== null;
    if (item.needs === 'save') return GameState.hasGame;
    return true;
  }

  private toggleGod() {
    DebugFlags.god = !DebugFlags.god;
  }

  private addMoney(n: number) {
    GameState.data.money += n;
    GameState.persist();
    this.say(`Dinero: ${formatMoney(GameState.data.money)}`);
  }

  private unlockAll() {
    const d = GameState.data;
    // Completa 1..9 (la 10 queda disponible) y aplica sus recompensas de historia.
    for (const m of MISSIONS.slice(0, -1)) {
      if (!d.completed.includes(m.id)) d.completed.push(m.id);
      if (m.rescues && !d.rescued.includes(m.rescues)) d.rescued.push(m.rescues);
      if (m.unlocksPower && d.powers[m.unlocksPower] === 0) d.powers[m.unlocksPower] = 1;
    }
    GameState.persist();
    this.say('Misiones 1–9 completadas (vuelve a entrar al mapa)');
  }

  private maxUpgrades() {
    const d = GameState.data;
    for (const s of STATS) d.stats[s.id] = s.maxLevel;
    for (const p of POWERS) d.powers[p.id] = p.maxLevel;
    GameState.persist();
    this.say('Mejoras al máximo (aplican al entrar a una misión)');
  }

  private resetUpgrades() {
    const d = GameState.data;
    for (const s of STATS) d.stats[s.id] = 0;
    for (const p of POWERS) d.powers[p.id] = p.id === 'powerChord' ? 1 : d.powers[p.id] > 0 ? 1 : 0;
    GameState.persist();
    this.say('Mejoras reiniciadas');
  }

  private say(msg: string) {
    this.toast.setText(msg);
  }

  private setOpen(open: boolean) {
    this.open = open;
    this.menu.setVisible(open);
    this.toast.setText('');
    if (open) {
      this.scene.bringToTop();
      this.paused = this.scene.manager
        .getScenes(true)
        .filter((s) => s !== this)
        .map((s) => s.scene.key);
      this.paused.forEach((k) => this.scene.pause(k));
      this.index = 0;
      this.refresh();
    } else {
      // Solo reanuda las que siguen pausadas (una acción puede haber cambiado de escena, p. ej. "Ganar").
      this.paused.forEach((k) => this.scene.isPaused(k) && this.scene.resume(k));
      this.paused = [];
    }
  }

  private refresh() {
    this.rows.forEach((t, i) => {
      const item = this.items[i];
      const ok = this.available(item);
      const sel = i === this.index;
      t.setText(`${sel ? '▶ ' : '   '}${item.label()}`).setColor(!ok ? '#4a4366' : sel ? CSS.yellow : CSS.white);
    });
  }

  update() {
    if (!DEBUG_ENABLED) return;
    if (Phaser.Input.Keyboard.JustDown(this.toggleKey)) this.setOpen(!this.open);

    if (this.open) {
      const n = this.items.length;
      if (this.input2.justDown('up')) this.index = (this.index - 1 + n) % n;
      if (this.input2.justDown('down')) this.index = (this.index + 1) % n;
      if (this.input2.justDown('confirm')) {
        const item = this.items[this.index];
        if (this.available(item)) item.run();
        else this.say('No disponible aquí');
      }
      if (this.input2.justDown('back')) this.setOpen(false);
      this.refresh();
    }

    // Info en pantalla
    if (DebugFlags.info) {
      this.scene.bringToTop();
      const g = this.game2();
      const lines = [`FPS ${Math.round(this.game.loop.actualFps)}`];
      if (g) {
        const p = g.player;
        const st = g as unknown as { phase: string; zoneIndex: number; enemies: { alive: boolean }[] };
        lines.push(
          `Misión ${g.mission.id} · fase ${st.phase} · zona ${st.zoneIndex}`,
          `Axel x=${Math.round(p.x)} y=${Math.round(p.y)} hp=${Math.ceil(p.hp)}/${p.maxHp}`,
          `Enemigos vivos: ${st.enemies.filter((e) => e.alive).length}${g.boss?.alive ? ` · jefe ${Math.ceil(g.boss.hp)}/${g.boss.maxHp} fase ${g.boss.phase}` : ''}`,
        );
      }
      if (DebugFlags.god) lines.push('VIDA INFINITA');
      this.info.setText(lines.join('\n')).setVisible(true);
    } else {
      this.info.setVisible(false);
    }
  }
}
