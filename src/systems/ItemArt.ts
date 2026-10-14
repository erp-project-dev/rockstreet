import Phaser from 'phaser';
import { ITEMS, type ItemId } from '../data/items';

/** Maximum canvas extent; each illustration includes transparent breathing room. */
export const ITEM_SIZE: Record<ItemId, number> = {
  coin: 58, bill: 90, cash: 98, heartSmall: 60,
  heartBig: 88, energy: 82, extraLife: 100, goldRecord: 80,
};
export function loadItemArt(scene: Phaser.Scene): void {
  for (const [id, item] of Object.entries(ITEMS)) {
    scene.load.image(item.texture, `assets/items/${id}.png`);
  }
}
