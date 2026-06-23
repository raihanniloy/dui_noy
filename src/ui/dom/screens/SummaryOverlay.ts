// src/ui/dom/screens/SummaryOverlay.ts
import { el } from '../el';
import type { SummaryData } from '../types';

export function SummaryOverlay(opts: { data: SummaryData; onNext(): void }): HTMLElement {
  const d = opts.data;
  const teamCard = (name: string, points: number, tricks: number, primary: boolean): HTMLElement =>
    el('div', { style: `flex:1;background:var(--color-canvas-parchment);border:1px solid ${primary ? 'var(--color-primary)' : 'var(--color-hairline)'};border-radius:18px;padding:16px 14px;text-align:center` }, [
      el('div', { class: 'caption-strong', style: primary ? 'color:var(--color-primary)' : 'color:var(--color-ink-muted-48)', text: name }),
      el('div', { style: `font-family:var(--font-display);font-weight:700;font-size:40px;line-height:1.1;color:${primary ? 'var(--color-ink)' : 'var(--color-ink-muted-48)'}`, text: String(points) }),
      el('div', { class: 'fine-print', text: `${tricks} tricks · points` }),
    ]);

  return el('div', { class: 'overlay', style: 'position:relative;height:100%;width:100%' }, [
    el('div', { class: 'overlay-dim' }),
    el('div', { class: 'sheet' }, [
      el('div', { class: 'caption-strong', style: 'text-align:center;color:var(--color-primary)', text: 'Hand complete' }),
      el('div', { class: 'display-md', style: 'text-align:center;margin:8px 0 4px', text: `${d.success ? 'Bid made.' : 'Bid set.'} ${d.delta >= 0 ? '+' : ''}${d.delta}` }),
      el('div', { class: 'caption', style: 'text-align:center;color:var(--color-ink-muted-48);margin-bottom:20px', text: `US bid ${d.bidValue} · captured ${d.usPoints} points` }),
      el('div', { style: 'display:flex;gap:12px' }, [
        teamCard('US', d.usPoints, d.usTricks, true),
        teamCard('THEM', d.themPoints, d.themTricks, false),
      ]),
      el('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-top:18px;padding:14px 16px;background:var(--color-canvas-parchment);border-radius:11px' }, [
        el('span', { class: 'caption-strong', style: 'color:var(--color-ink-muted-48)', text: 'Game score' }),
        el('div', { style: 'display:flex;gap:12px;font-family:var(--font-display);font-weight:600;font-size:15px' }, [
          el('span', { style: 'color:var(--color-primary)', text: `US ${d.scoreUs}` }),
          el('span', { style: 'color:var(--color-ink-muted-48)', text: `THEM ${d.scoreThem}` }),
        ]),
      ]),
      el('div', { style: 'margin-top:20px' }, [
        el('button', { class: 'pill pill-primary', text: d.matchOver ? 'See result' : 'Next hand', onclick: opts.onNext }),
      ]),
    ]),
  ]);
}
