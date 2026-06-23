// src/ui/dom/Screen.ts
import type { ScreenId } from './types';

export class Screen {
  private readonly nodes = new Map<ScreenId, HTMLElement>();
  private cur: ScreenId | null = null;
  constructor(private readonly root: HTMLElement) {}

  mount(id: ScreenId, node: HTMLElement): void {
    // Drop any prior node for this id so re-mounted overlays don't accumulate
    // orphaned hidden divs (and their closures) in #ui-root.
    this.nodes.get(id)?.remove();
    node.classList.add('screen');
    this.nodes.set(id, node);
    this.root.append(node);
  }

  show(id: ScreenId): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Screen not mounted: ${id}`);
    for (const n of this.nodes.values()) n.classList.remove('on');
    node.classList.add('on');
    this.cur = id;
  }

  hideAll(): void {
    for (const n of this.nodes.values()) n.classList.remove('on');
    this.cur = null;
  }

  current(): ScreenId | null { return this.cur; }
}
