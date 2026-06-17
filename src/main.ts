// src/main.ts — Phaser entry point.
import Phaser from 'phaser';
import { BootScene } from './ui/scenes/BootScene';
import { MenuScene } from './ui/scenes/MenuScene';
import { TableScene } from './ui/scenes/TableScene';
import { initNative, onBackButton } from './platform/native';

const game = new Phaser.Game({
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

void initNative();

// Dispatch hardware back to the active scene's handleBack(), if any.
onBackButton(() => {
  for (const scene of game.scene.getScenes(true)) {
    const s = scene as Phaser.Scene & { handleBack?: () => void };
    if (typeof s.handleBack === 'function') { s.handleBack(); return; }
  }
});
