import type { CapturedStyleProperty, RawElement, RawExtraction } from './raw-types';

export interface ExtractOptions {
  maxElements: number;
  properties: readonly CapturedStyleProperty[];
}

/**
 * Runs inside the page (serialized by Playwright): it must not reference
 * anything outside its own body. Walks the DOM in document order and captures
 * computed styles and page-relative geometry for every rendered element.
 */
export function extractDom(options: ExtractOptions): RawExtraction {
  const SKIP_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'TEMPLATE',
    'META',
    'LINK',
    'HEAD',
    'TITLE',
    'BASE',
  ]);
  const KEEP_ATTRIBUTES = [
    'id',
    'name',
    'type',
    'href',
    'alt',
    'aria-label',
    'role',
    'data-testid',
    'data-dv-id',
    'for',
    'placeholder',
  ];
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const elements: RawElement[] = [];
  let truncated = false;

  const cssEscape = (value: string) =>
    window.CSS && typeof window.CSS.escape === 'function' ? window.CSS.escape(value) : value;

  const uniqueSelector = (el: Element): string => {
    if (el.id && document.querySelectorAll(`#${cssEscape(el.id)}`).length === 1) {
      return `#${cssEscape(el.id)}`;
    }
    const parts: string[] = [];
    let node: Element | null = el;
    while (node && node !== document.documentElement) {
      if (node.id && document.querySelectorAll(`#${cssEscape(node.id)}`).length === 1) {
        parts.unshift(`#${cssEscape(node.id)}`);
        break;
      }
      const parent: Element | null = node.parentElement;
      let part = node.tagName.toLowerCase();
      if (parent) {
        const tag = node.tagName;
        const siblings = Array.from(parent.children).filter((child) => child.tagName === tag);
        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
      }
      parts.unshift(part);
      node = parent;
    }
    return parts.join(' > ');
  };

  const ownText = (el: Element): string => {
    let text = '';
    el.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) text += child.textContent ?? '';
    });
    if (el instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(el.type)) {
      text += el.value;
    }
    return text.replace(/\s+/g, ' ').trim().slice(0, 500);
  };

  const visit = (
    el: Element,
    parentIndex: number | null,
    path: string,
    hiddenByAncestor: boolean,
  ) => {
    if (SKIP_TAGS.has(el.tagName)) return;
    if (elements.length >= options.maxElements) {
      truncated = true;
      return;
    }
    const computed = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const style = {} as Record<CapturedStyleProperty, string>;
    for (const property of options.properties) {
      style[property] = computed[property];
    }
    const attributes: Record<string, string> = {};
    for (const name of KEEP_ATTRIBUTES) {
      const value = el.getAttribute(name);
      if (value !== null) attributes[name] = value.slice(0, 300);
    }
    const tag = el.tagName.toLowerCase();
    const index = elements.length;
    const ownPath = `${path}/${tag}[${index}]`;
    elements.push({
      index,
      parentIndex,
      tag,
      role: el.getAttribute('role'),
      text: ownText(el),
      classes: Array.from(el.classList).slice(0, 20),
      attributes,
      selector: uniqueSelector(el),
      path: ownPath,
      rect: {
        x: rect.left + scrollX,
        y: rect.top + scrollY,
        width: rect.width,
        height: rect.height,
      },
      style,
      hiddenByAncestor,
    });
    // display:none subtrees are recorded at their root only.
    if (computed.display === 'none' || tag === 'svg') return;
    for (const child of Array.from(el.children)) {
      visit(child, index, ownPath, hiddenByAncestor);
    }
  };

  if (document.body) visit(document.body, null, '', false);

  const root = document.documentElement;
  return {
    elements,
    truncated,
    document: {
      width: Math.max(root.scrollWidth, document.body?.scrollWidth ?? 0),
      height: Math.max(root.scrollHeight, document.body?.scrollHeight ?? 0),
      title: document.title,
      rootFontSize: Number.parseFloat(window.getComputedStyle(root).fontSize) || 16,
    },
    stylesheets: Array.from(document.styleSheets)
      .map((sheet) => sheet.href)
      .filter((href): href is string => Boolean(href))
      .slice(0, 100),
  };
}
