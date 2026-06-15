// src/ui/scenes/BootScene.ts
import Phaser from 'phaser';
import { cardsMedium, sounds } from '../../../assets.js';
import { makeDeck } from '../../engine/deck';
import { cardKey } from '../cardKey';
import { soundKey, SFX_KEYS } from '../sound';

const SUIT_SYMBOLS = ['card_clubs_suit', 'card_diamonds_suit', 'card_hearts_suit', 'card_spades_suit'];

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    const bar = this.add.rectangle(360, 640, 0, 24, 0xffd34d).setOrigin(0, 0.5);
    this.load.on('progress', (p: number) => { bar.width = 440 * p; });

    const keys = new Set<string>();
    for (const c of makeDeck()) keys.add(cardKey(c));
    keys.add('card_back');
    for (const s of SUIT_SYMBOLS) keys.add(s);
    for (const k of keys) this.load.image(k, cardsMedium[k]!);

    for (const sfx of SFX_KEYS) {
      const k = soundKey(sfx);
      this.load.audio(k, sounds[k]!);
    }
  }

  create(): void { this.scene.start('Menu'); }
}
