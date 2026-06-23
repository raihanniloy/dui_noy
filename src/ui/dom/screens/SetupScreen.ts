// src/ui/dom/screens/SetupScreen.ts
import { el } from '../el';
import type { SetupChoice, Difficulty } from '../types';

export function SetupScreen(opts: { onBack(): void; onDeal(choice: SetupChoice): void }): HTMLElement {
  const choice: SetupChoice = { difficulty: 'hard', points: 6 };

  function chipRow<T extends string | number>(
    heading: string, values: readonly { label: string; value: T }[], selected: T, onPick: (v: T) => void,
  ): HTMLElement {
    const chips = values.map(({ label, value }) => {
      const c = el('div', { class: value === selected ? 'chip chip-on' : 'chip', text: label });
      c.addEventListener('click', () => {
        for (const sib of row.querySelectorAll('.chip')) sib.classList.remove('chip-on');
        c.classList.add('chip-on');
        onPick(value);
      });
      return c;
    });
    const row = el('div', { class: 'chip-row' }, chips);
    return el('div', {}, [el('div', { class: 'caption-strong', style: 'margin-bottom:10px', text: heading }), row]);
  }

  const seat = (letter: string, label: string, you = false): HTMLElement =>
    el('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:6px' }, [
      el('div', { class: you ? 'avatar avatar-you' : 'avatar', text: letter }),
      el('span', { class: 'fine-print', style: you ? 'color:var(--color-primary);font-weight:600' : '', text: label }),
    ]);
  const empty = (): HTMLElement => el('div');

  const seating = el('div', { style: 'background:var(--color-canvas-parchment);border:1px solid var(--color-hairline);border-radius:18px;padding:22px 20px' }, [
    el('div', { class: 'caption-strong', style: 'color:var(--color-ink-muted-48);margin-bottom:18px', text: 'You + partner vs two AI' }),
    el('div', { style: 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;justify-items:center;align-items:center' }, [
      empty(), seat('P', 'Partner'), empty(),
      seat('W', 'West'), el('div', { style: 'font-family:var(--font-display);font-weight:700;font-size:20px;color:var(--color-hairline)', text: '29' }), seat('E', 'East'),
      empty(), seat('You', 'You', true), empty(),
    ]),
  ]);

  return el('div', { class: 'screen-light', style: 'position:relative;height:100%;width:100%' }, [
    el('div', { class: 'statusbar' }, [el('span', { text: '9:41' }), el('span', { text: '●●●' })]),
    el('div', { class: 'pad', style: 'display:flex;align-items:center;gap:12px' }, [
      el('div', { style: 'font-size:26px;color:var(--color-primary);cursor:pointer', text: '‹', onclick: opts.onBack }),
      el('div', { class: 'display-md', text: 'New game' }),
    ]),
    el('div', { class: 'pad', style: 'padding-top:28px;display:flex;flex-direction:column;gap:24px' }, [
      seating,
      chipRow<Difficulty>('Difficulty',
        [{ label: 'Easy', value: 'easy' }, { label: 'Hard', value: 'hard' }],
        'hard', (v) => { choice.difficulty = v; }),
      chipRow<number>('Game length · points to win',
        [{ label: '4', value: 4 }, { label: '6', value: 6 }, { label: '11', value: 11 }],
        6, (v) => { choice.points = v; }),
    ]),
    el('div', { class: 'bottom-cta' }, [
      el('button', { class: 'pill pill-primary', text: 'Deal cards', onclick: () => opts.onDeal({ ...choice }) }),
    ]),
  ]);
}
