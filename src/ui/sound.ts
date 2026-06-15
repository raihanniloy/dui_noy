// src/ui/sound.ts
import type Phaser from 'phaser';

export type Sfx = 'play' | 'win' | 'button' | 'illegal' | 'matchWin' | 'deal';
export const SFX_KEYS: readonly Sfx[] = ['play', 'win', 'button', 'illegal', 'matchWin', 'deal'];

// Maps semantic effects to Kenney interface-sound asset keys.
const MAP: Record<Sfx, string> = {
  play: 'drop_001',
  win: 'confirmation_001',
  button: 'click_001',
  illegal: 'back_001',
  matchWin: 'bong_001',
  deal: 'drop_002',
};

export function soundKey(sfx: Sfx): string {
  return MAP[sfx];
}

let muted = false;
export function setMuted(v: boolean): void { muted = v; }
export function isMuted(): boolean { return muted; }

/** Play an effect through the scene's sound manager unless muted. */
export function playSfx(scene: Phaser.Scene, sfx: Sfx): void {
  if (muted) return;
  scene.sound.play(soundKey(sfx));
}
