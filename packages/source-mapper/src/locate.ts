import { cssPropertyFor, cssValue, type ValidationIssue } from '@design-validator/design-spec';

import { ruleScore, type ElementIdentity } from './match';
import { parseStylesheet, type Declaration, type StyleRule } from './parse';
import { proposePatch } from './patch';

export interface SourceFile {
  path: string;
  content: string;
}

export interface SourceMatch {
  path: string;
  line: number;
  selector: string;
  atRules: string[];
  declaration: { property: string; value: string; line: number } | null;
  /** Ranking value; higher is better. Not a quality score. */
  rank: number;
  patch: string;
  note: string;
}

/** Declarations that can set `cssProperty` (the property itself or a shorthand). */
export function relatedProperties(cssProperty: string): string[] {
  const related = new Set([cssProperty]);
  const box = /^(padding|margin)(-(top|right|bottom|left|inline|block))?$/.exec(cssProperty);
  if (box?.[1]) related.add(box[1]);
  if (box?.[3] === 'left' || box?.[3] === 'right') related.add(`${box[1] ?? ''}-inline`);
  if (box?.[3] === 'top' || box?.[3] === 'bottom') related.add(`${box[1] ?? ''}-block`);
  if (/^border-.*-radius$/.test(cssProperty)) related.add('border-radius');
  if (cssProperty === 'row-gap' || cssProperty === 'column-gap') related.add('gap');
  if (/^font-(size|weight|family|style)$|^line-height$/.test(cssProperty)) related.add('font');
  if (cssProperty === 'background-color') related.add('background');
  if (/^border-(top|right|bottom|left)?-?(width|style|color)$/.test(cssProperty)) {
    related.add('border');
    related.add(cssProperty.replace(/-(top|right|bottom|left)/, ''));
  }
  return [...related];
}

/** Whether a media condition applies at this viewport width (min/max-width only). */
export function mediaApplies(atRules: string[], viewportWidth: number): boolean {
  return atRules.every((atRule) => {
    const max = /max-width:\s*(\d+(?:\.\d+)?)px/.exec(atRule);
    const min = /min-width:\s*(\d+(?:\.\d+)?)px/.exec(atRule);
    if (max?.[1] && viewportWidth > Number(max[1])) return false;
    if (min?.[1] && viewportWidth < Number(min[1])) return false;
    return true;
  });
}

/**
 * Ranks stylesheet rules that style the element and could fix the issue,
 * each with a proposed patch. Returns an empty list when nothing matches.
 */
export function locateDeclarations(
  files: readonly SourceFile[],
  element: ElementIdentity,
  issue: ValidationIssue,
  options: { viewportWidth: number; limit?: number },
): SourceMatch[] {
  const cssProperty = cssPropertyFor(issue.property);
  const required = cssValue(issue.required);
  if (!cssProperty || required === undefined) return [];
  const related = relatedProperties(cssProperty);
  const candidates: {
    file: SourceFile;
    lines: string[];
    rule: StyleRule;
    declaration: Declaration | undefined;
    rank: number;
    selector: string;
  }[] = [];

  for (const file of files) {
    const lines = file.content.split('\n');
    for (const rule of parseStylesheet(file.content)) {
      const score = ruleScore(rule, element);
      if (score === 0 || !mediaApplies(rule.atRules, options.viewportWidth)) continue;
      const declaration = [...rule.declarations]
        .reverse()
        .find((d) => related.includes(d.property));
      const exact = declaration?.property === cssProperty;
      const rank =
        score + (declaration ? 1000 : 0) + (exact ? 500 : 0) + (rule.atRules.length > 0 ? 50 : 0);
      const selector =
        rule.selectors.find((s) => ruleScore({ ...rule, selectors: [s] }, element) > 0) ??
        rule.selectors[0] ??
        '';
      candidates.push({ file, lines, rule, declaration, rank, selector });
    }
  }
  candidates.sort(
    (a, b) =>
      b.rank - a.rank || a.file.path.localeCompare(b.file.path) || a.rule.line - b.rule.line,
  );

  return candidates
    .slice(0, options.limit ?? 3)
    .map(({ file, lines, rule, declaration, rank, selector }) => {
      const { patch, note } = proposePatch(
        file.path,
        lines,
        rule,
        declaration,
        cssProperty,
        required,
      );
      return {
        path: file.path,
        line: declaration?.line ?? rule.line,
        selector,
        atRules: rule.atRules,
        declaration: declaration
          ? { property: declaration.property, value: declaration.value, line: declaration.line }
          : null,
        rank,
        patch,
        note,
      };
    });
}
