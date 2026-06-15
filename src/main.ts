// src/main.ts — Phaser entry point.
import Phaser from 'phaser';
import { BootScene } from './ui/scenes/BootScene';
import { MenuScene } from './ui/scenes/MenuScene';
import { TableScene } from './ui/scenes/TableScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b3d2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  scene: [BootScene, MenuScene, TableScene],
});
