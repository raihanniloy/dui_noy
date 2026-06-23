// src/main.ts — Phaser table + DOM UI entry point.
import Phaser from 'phaser';
import { BootScene } from './ui/scenes/BootScene';
import { TableScene } from './ui/scenes/TableScene';
import { initNative, onBackButton } from './platform/native';
import { Screen } from './ui/dom/Screen';
import { SplashScreen } from './ui/dom/screens/SplashScreen';
import { MenuScreen } from './ui/dom/screens/MenuScreen';
import { SetupScreen } from './ui/dom/screens/SetupScreen';
import { UIController } from './ui/dom/UIController';
import { whenBootReady, whenTableReady, resetTableBridge } from './ui/dom/tableBridge';
import { GameClient } from './ui/GameClient';
import type { SetupChoice } from './ui/dom/types';
import type { Difficulty } from './bots/bot';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d1d1f',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 720, height: 1280 },
  scene: [BootScene, TableScene],
});

const root = document.getElementById('ui-root')!;
const screen = new Screen(root);

screen.mount('splash', SplashScreen());
screen.mount('menu', MenuScreen({
  onPlay: () => screen.show('setup'),
  onHowTo: () => {/* stub (Plan 6) */},
  onSettings: () => {/* stub (Plan 6) */},
}));
screen.mount('setup', SetupScreen({
  onBack: () => screen.show('menu'),
  onDeal: (choice) => void startMatch(choice),
}));

void initNative();
onBackButton(() => {
  const cur = screen.current();
  if (cur === 'setup') screen.show('menu');
  else if (cur === 'menu') void import('@capacitor/app').then(({ App }) => App.exitApp());
  // during a game: ignore for now (Plan 6 adds Pause)
});

// Splash → Menu once boot assets are ready (min 1.2s for the shuffle bar).
screen.show('splash');
void Promise.all([whenBootReady(), delay(1200)]).then(() => screen.show('menu'));

async function startMatch(choice: SetupChoice): Promise<void> {
  const difficulty: Difficulty = choice.difficulty;
  // points-to-win is visual-only this pass (engine target stays ±6).
  const seed = (Math.random() * 1e9) | 0;
  const client = new GameClient(seed, difficulty);
  screen.hideAll();
  resetTableBridge();             // arm a fresh table-ready promise
  game.scene.start('Table');      // (re)start the scene; Phaser restarts it if already running
  const table = await whenTableReady();
  const controller = new UIController({
    client, table, screen,
    onRematch: () => { void startMatch(choice); },
  });
  await controller.run();
}

function delay(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
