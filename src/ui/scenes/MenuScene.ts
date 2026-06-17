// src/ui/scenes/MenuScene.ts
import Phaser from 'phaser';
import { playSfx } from '../sound';
import type { Difficulty } from '../../bots/bot';

export class MenuScene extends Phaser.Scene {
  private difficulty: Difficulty = 'hard';

  constructor() { super('Menu'); }

  // Hardware back on the menu: exit the app (native only).
  handleBack(): void {
    void import('@capacitor/app').then(({ App }) => App.exitApp());
  }

  create(): void {
    this.add.text(360, 300, '29', { fontSize: '180px', color: '#ffd34d', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(360, 500, 'Opponents', { fontSize: '40px', color: '#eee' }).setOrigin(0.5);

    const toggle = this.add.text(360, 590, '', {
      fontSize: '52px', color: '#fff', backgroundColor: '#1f6f54', padding: { x: 28, y: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const renderToggle = (): void => { toggle.setText(this.difficulty === 'hard' ? 'Hard' : 'Easy'); };
    renderToggle();
    toggle.on('pointerup', () => {
      this.difficulty = this.difficulty === 'hard' ? 'easy' : 'hard';
      renderToggle();
      playSfx(this, 'button');
    });

    const play = this.add.text(360, 800, 'Play', {
      fontSize: '72px', color: '#222', backgroundColor: '#ffd34d', padding: { x: 56, y: 24 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    play.on('pointerup', () => {
      playSfx(this, 'button');
      this.scene.start('Table', { difficulty: this.difficulty, seed: (Math.random() * 1e9) | 0 });
    });
  }
}
