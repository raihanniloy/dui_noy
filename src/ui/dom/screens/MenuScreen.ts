// src/ui/dom/screens/MenuScreen.ts
import { el } from '../el';

export function MenuScreen(opts: { onPlay(): void; onHowTo(): void; onSettings(): void }): HTMLElement {
  const suit = (glyph: string, color: string, rot: number, left: number, top: number, z = 1): HTMLElement =>
    el('div', { style: `position:absolute;left:${left}px;top:${top}px;width:46px;height:64px;border-radius:8px;background:#fff;border:1px solid var(--color-hairline);box-shadow:var(--shadow-product);transform:rotate(${rot}deg);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:600;color:${color};font-size:20px;z-index:${z}`, text: glyph });

  return el('div', { class: 'screen-light', style: 'position:relative;height:100%;width:100%' }, [
    el('div', { class: 'statusbar' }, [el('span', { text: '9:41' }), el('span', { text: '●●●' })]),
    el('div', { style: 'padding:60px 32px 0;display:flex;flex-direction:column;align-items:center' }, [
      el('div', { style: 'position:relative;height:88px;width:150px;margin-bottom:20px' }, [
        suit('♥', '#cc3b30', -15, 30, 12), suit('♠', 'var(--color-ink)', 0, 64, 4, 2), suit('♣', 'var(--color-ink)', 15, 98, 12),
      ]),
      el('div', { style: 'font-family:var(--font-display);font-weight:700;font-size:92px;line-height:.9;color:var(--color-ink);letter-spacing:-4px', text: '29' }),
      el('div', { style: 'font-family:var(--font-display);font-weight:600;font-size:19px;color:var(--color-ink-muted-48);margin-top:6px', text: 'The trick game.' }),
      el('div', { style: 'width:100%;display:flex;flex-direction:column;gap:13px;margin-top:56px' }, [
        el('button', { class: 'pill pill-primary', text: 'Play', onclick: opts.onPlay }),
        el('button', { class: 'pill pill-quiet', text: 'How to play', onclick: opts.onHowTo }),
        el('button', { class: 'pill pill-quiet', text: 'Settings', onclick: opts.onSettings }),
      ]),
    ]),
    el('div', { class: 'fine-print footer-note', text: 'Sound on · tap to mute' }),
  ]);
}
