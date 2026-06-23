// src/ui/dom/screens/GameOverOverlay.ts
import { el } from '../el';

export function GameOverOverlay(opts: { weWin: boolean; scoreUs: number; scoreThem: number; onRematch(): void }): HTMLElement {
  return el('div', { class: 'overlay', style: 'position:relative;height:100%;width:100%' }, [
    el('div', { class: 'overlay-dim' }),
    el('div', { class: 'sheet', style: 'text-align:center' }, [
      el('div', { class: 'caption-strong', style: 'color:var(--color-primary)', text: opts.weWin ? 'Your team wins' : 'Your team loses' }),
      el('div', { class: 'display-md', style: 'margin:8px 0 18px', text: opts.weWin ? 'You win 🎉' : 'Game over' }),
      el('div', { style: 'display:flex;gap:12px;justify-content:center;margin-bottom:22px' }, [
        el('div', { style: 'font-family:var(--font-display);font-weight:700;font-size:40px;color:var(--color-primary)', text: `US ${opts.scoreUs}` }),
        el('div', { style: 'font-family:var(--font-display);font-weight:700;font-size:40px;color:var(--color-ink-muted-48)', text: `THEM ${opts.scoreThem}` }),
      ]),
      el('button', { class: 'pill pill-primary', text: 'Rematch', onclick: opts.onRematch }),
    ]),
  ]);
}
