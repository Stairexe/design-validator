import type { Declaration, StyleRule } from './parse';

const PLAIN_LENGTH = /^-?(\d+\.?\d*|\.\d+)(px|rem|em|%|vh|vw)?$/;

const BOX_SIDES: Record<string, number[]> = {
  top: [0],
  right: [1],
  bottom: [2],
  left: [3],
  inline: [1, 3],
  block: [0, 2],
};
const RADIUS_CORNERS: Record<string, number[]> = {
  'top-left': [0],
  'top-right': [1],
  'bottom-right': [2],
  'bottom-left': [3],
};

function expand(tokens: string[]): string[] {
  const [a, b = a, c = a, d = b] = tokens as [string, string?, string?, string?];
  return [a, b, c, d];
}

function collapse(values: string[]): string {
  const [t, r, b, l] = values;
  if (t === r && r === b && b === l) return t ?? '';
  if (t === b && r === l) return `${t ?? ''} ${r ?? ''}`;
  if (r === l) return `${t ?? ''} ${r ?? ''} ${b ?? ''}`;
  return values.join(' ');
}

/**
 * New value for a shorthand declaration when only some sides change, e.g.
 * `padding: 12px 20px` + padding-inline 24px → `12px 24px`. Returns null when
 * the value is not a plain list of lengths (var(), calc(), keywords).
 */
export function rewriteShorthand(
  shorthand: string,
  value: string,
  target: string,
  required: string,
): string | null {
  const important = /!important\s*$/.test(value);
  const tokens = value
    .replace(/!important\s*$/, '')
    .trim()
    .split(/\s+/);
  if (
    tokens.length === 0 ||
    tokens.length > 4 ||
    !tokens.every((token) => PLAIN_LENGTH.test(token))
  )
    return null;
  let indexes: number[] | undefined;
  if (shorthand === 'padding' || shorthand === 'margin')
    indexes = BOX_SIDES[target.replace(`${shorthand}-`, '')];
  if (shorthand === 'border-radius')
    indexes = RADIUS_CORNERS[target.replace(/^border-|-radius$/g, '')];
  if (shorthand === 'gap') {
    if (tokens.length > 2) return null;
    const [row, column = row] = tokens as [string, string?];
    const next =
      target === 'row-gap' ? [required, column] : target === 'column-gap' ? [row, required] : null;
    return next
      ? `${next[0] === next[1] ? next[0] : next.join(' ')}${important ? ' !important' : ''}`
      : null;
  }
  if (!indexes) return null;
  const sides = expand(tokens);
  for (const index of indexes) sides[index] = required;
  return `${collapse(sides)}${important ? ' !important' : ''}`;
}

function replaceValue(declaration: Declaration, nextValue: string): string {
  const index = declaration.text.indexOf(declaration.value);
  return index >= 0
    ? declaration.text.slice(0, index) +
        nextValue +
        declaration.text.slice(index + declaration.value.length)
    : declaration.text.replace(/:\s*[^;]*/, `: ${nextValue}`);
}

const indentOf = (line: string) => /^\s*/.exec(line)?.[0] ?? '';

export interface PatchResult {
  patch: string;
  note: string;
}

/**
 * Unified diff that makes the rule produce `required` for `cssProperty`.
 * Replaces a matching declaration when it can be rewritten safely; otherwise
 * adds an overriding declaration.
 */
export function proposePatch(
  path: string,
  sourceLines: string[],
  rule: StyleRule,
  declaration: Declaration | undefined,
  cssProperty: string,
  required: string,
): PatchResult {
  const header = `--- a/${path}\n+++ b/${path}\n`;
  if (declaration) {
    const isExact = declaration.property === cssProperty;
    const plain = !/var\(|calc\(|env\(/.test(declaration.value);
    const nextValue =
      isExact && plain
        ? required
        : plain
          ? rewriteShorthand(declaration.property, declaration.value, cssProperty, required)
          : null;
    if (nextValue !== null) {
      const next = replaceValue(declaration, nextValue);
      return {
        patch: `${header}@@ -${declaration.line},1 +${declaration.line},1 @@\n-${declaration.text}\n+${next}\n`,
        note: `Changes ${declaration.property} on line ${declaration.line}.`,
      };
    }
    const added = `${indentOf(declaration.text)}${cssProperty}: ${required};`;
    return {
      patch: `${header}@@ -${declaration.line},1 +${declaration.line},2 @@\n ${declaration.text}\n+${added}\n`,
      note: `${declaration.property} uses a value that cannot be rewritten safely (${declaration.value}); adds an overriding declaration.`,
    };
  }
  const closing = sourceLines[rule.endLine - 1] ?? '}';
  const anchor = rule.declarations.at(-1);
  const indent = anchor ? indentOf(anchor.text) : `${indentOf(sourceLines[rule.line - 1] ?? '')}  `;
  return {
    patch: `${header}@@ -${rule.endLine},1 +${rule.endLine},2 @@\n+${indent}${cssProperty}: ${required};\n ${closing}\n`,
    note: `The rule does not declare ${cssProperty}; adds it.`,
  };
}
