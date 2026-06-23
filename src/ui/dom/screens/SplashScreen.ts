// src/ui/dom/screens/SplashScreen.ts
import { el } from '../el';

export function SplashScreen(): HTMLElement {
  const bar = el('div', { style: 'height:100%;width:0;border-radius:9999px;background:var(--color-primary);transition:width 1.2s ease' });
  const wrap = el('div', { class: 'screen-parchment', style: 'position:relative;height:100%;width:100%' }, [
    el('div', { class: 'col-center' }, [
      el('div', { style: 'font-family:var(--font-display);font-weight:700;font-size:150px;line-height:.9;color:var(--color-ink);letter-spacing:-6px', text: '29' }),
      el('div', { style: 'font-family:var(--font-display);font-weight:600;font-size:21px;color:var(--color-ink)', text: 'The trick game.' }),
    ]),
    el('div', { style: 'position:absolute;left:50%;transform:translateX(-50%);bottom:96px;width:160px' }, [
      el('div', { style: 'height:3px;border-radius:9999px;background:rgba(0,0,0,.1);overflow:hidden' }, [bar]),
      el('div', { class: 'caption', style: 'text-align:center;margin-top:16px;color:var(--color-ink-muted-48)', text: 'Shuffling deck…' }),
    ]),
    el('div', { class: 'fine-print footer-note', text: 'Version 1.0 · 4 players · 2 teams' }),
  ]);
  // animate the bar on next frame
  requestAnimationFrame(() => { bar.style.width = '100%'; });
  return wrap;
}
