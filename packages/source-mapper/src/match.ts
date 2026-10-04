import type { StyleRule } from './parse';

export interface ElementIdentity {
  tag: string;
  id?: string | undefined;
  classes: string[];
}

const PSEUDO = /::?[a-z-]+(\([^)]*\))?/gi;

/**
 * Specificity-like score of how well the last compound selector matches the
 * element (0 = no match). Interaction pseudo-classes (`:hover`) still match
 * but rank lower; ancestor parts are not verified (DOM ancestry is unknown).
 */
export function selectorScore(selector: string, element: ElementIdentity): number {
  const compound =
    selector
      .trim()
      .split(/\s*[>+~]\s*|\s+/)
      .pop() ?? '';
  const hasPseudo = PSEUDO.test(compound);
  PSEUDO.lastIndex = 0;
  const bare = compound.replace(PSEUDO, '');
  if (!bare || bare === '*') return 0;
  const tag = /^[a-z][a-z0-9-]*/i.exec(bare)?.[0];
  const ids = [...bare.matchAll(/#([\w-]+)/g)].map((m) => m[1]);
  const classes = [...bare.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
  if (tag && tag.toLowerCase() !== element.tag.toLowerCase()) return 0;
  if (ids.some((id) => id !== element.id)) return 0;
  if (classes.some((cls) => !cls || !element.classes.includes(cls))) return 0;
  const score = ids.length * 100 + classes.length * 10 + (tag ? 1 : 0);
  return hasPseudo ? score / 4 : score;
}

export function ruleScore(rule: StyleRule, element: ElementIdentity): number {
  return Math.max(0, ...rule.selectors.map((selector) => selectorScore(selector, element)));
}
