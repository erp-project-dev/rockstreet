import Phaser from 'phaser';

/** Objeto del escenario que se rompe de un golpe y suelta un consumible (bote de basura, ampli viejo). */
export class Breakable {
  readonly sprite: Phaser.GameObjects.Image;
  readonly z = 0;
  broken = false;
  private readonly debris: number[];

  constructor(
    private scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
  ) {
    const tex = Phaser.Math.RND.pick(['prop-trash', 'prop-amp']);
    this.sprite = scene.add.image(x, y, tex, '0').setOrigin(0.5, 1).setDepth(y);
    this.sprite.setScale((tex === 'prop-trash' ? 120 : 110) / this.sprite.height);
    this.debris = tex === 'prop-trash' ? [0x5a5a70, 0x8a8aa0, 0xb0b0b8] : [0x111111, 0x5a3418, 0x8a5530, 0x9a8a60];
  }

  /** Lo rompe con un pequeño estallido de piezas. */
  break(dir: 1 | -1): void {
    if (this.broken) return;
    this.broken = true;
    for (let i = 0; i < 10; i++) {
      const piece = this.scene.add
        .rectangle(this.x, this.y - Phaser.Math.Between(20, 90), Phaser.Math.Between(8, 18), Phaser.Math.Between(6, 14), Phaser.Math.RND.pick(this.debris))
        .setDepth(this.y + 1);
      this.scene.tweens.add({
        targets: piece,
        x: piece.x + dir * Phaser.Math.Between(20, 180),
        y: this.y + Phaser.Math.Between(-10, 20),
        angle: Phaser.Math.Between(-300, 300),
        duration: Phaser.Math.Between(350, 600),
        ease: 'Quad.easeIn',
        onComplete: () => this.scene.tweens.add({ targets: piece, alpha: 0, delay: 800, duration: 400, onComplete: () => piece.destroy() }),
      });
    }
    this.sprite.destroy();
  }
}
