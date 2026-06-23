// src/ui/dom/el.ts
type Props = Record<string, string | number | ((e: Event) => void)>;

export function el(tag: string, props: Props = {}, children: (Node | string)[] = []): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = String(v);
    else if (k === 'text') node.textContent = String(v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'style') node.setAttribute('style', String(v));
    else node.setAttribute(k, String(v));
  }
  for (const c of children) node.append(c);
  return node;
}
