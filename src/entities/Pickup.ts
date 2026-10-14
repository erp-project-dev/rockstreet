import Phaser from 'phaser';
import { ITEM_SIZE } from '../systems/ItemArt';
import { ITEMS, type ItemDef, type ItemId } from '../data/items';

/** Objeto en el suelo (dinero, corazones, energía...). Usa la misma profundidad falsa que los luchadores. */
export class Pickup {
  readonly def: ItemDef;
  readonly sprite: Phaser.GameObjects.Image;
  private bornAt: number;

  constructor(
    private scene: Phaser.Scene,
    id: ItemId,
    readonly x: number,
    readonly y: number,
    /** Objetos colocados en el nivel no caducan; solo los que sueltan enemigos. */
    private permanent = false,
  ) {
    this.def = ITEMS[id];
    this.bornAt = scene.time.now;
    this.sprite = scene.add.image(x, y, this.def.texture).setOrigin(0.5, 1).setDepth(y - 1);
    this.sprite.setScale(ITEM_SIZE[id] / Math.max(this.sprite.width, this.sprite.height));
    // Pequeño rebote al aparecer
    scene.tweens.add({ targets: this.sprite, y: y - 32, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
  }

  /** Devuelve true cuando el objeto debe desaparecer por tiempo. */
  tick(): boolean {
    const { lifetime } = this.def;
    if (lifetime === undefined || this.permanent) return false;
    const age = this.scene.time.now - this.bornAt;
    if (age > lifetime) return true;
    // Parpadea los últimos 2 segundos
    if (age > lifetime - 2000) this.sprite.setVisible(Math.floor(age / 100) % 2 === 0);
    return false;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
