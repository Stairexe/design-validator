/** One declaration with its 1-based line number. */
export interface Declaration {
  property: string;
  value: string;
  line: number;
  /** Full source line, for patching. */
  text: string;
}

export interface StyleRule {
  /** Resolved selectors (nesting expanded). */
  selectors: string[];
  /** Enclosing at-rules, e.g. `@media (max-width: 600px)`. */
  atRules: string[];
  line: number;
  /** Line of the closing brace (where new declarations are inserted). */
  endLine: number;
  declarations: Declaration[];
}

function stripComments(source: string): string {
  // Keep newlines so line numbers stay correct.
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
    .replace(
      /(^|[^:"'])\/\/[^\n]*/g,
      (match, prefix: string) => prefix + ' '.repeat(match.length - prefix.length),
    );
}

function resolveSelectors(parents: string[], raw: string): string[] {
  const own = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parents.length === 0) return own;
  return parents.flatMap((parent) =>
    own.map((child) =>
      child.includes('&') ? child.replaceAll('&', parent) : `${parent} ${child}`,
    ),
  );
}

/**
 * Extracts style rules with line numbers from CSS, SCSS or Less. Not a full
 * CSS parser: enough structure to locate where a property is declared.
 */
export function parseStylesheet(source: string): StyleRule[] {
  const text = stripComments(source);
  const lines = source.split('\n');
  const rules: StyleRule[] = [];
  type Frame = { kind: 'rule'; rule: StyleRule } | { kind: 'at'; name: string } | { kind: 'other' };
  const stack: Frame[] = [];
  let buffer = '';
  let bufferLine = 1;
  let line = 1;

  const currentSelectors = () => {
    for (let i = stack.length - 1; i >= 0; i--) {
      const frame = stack[i];
      if (frame?.kind === 'rule') return frame.rule.selectors;
    }
    return [];
  };
  const currentAtRules = () =>
    stack
      .filter((frame): frame is { kind: 'at'; name: string } => frame.kind === 'at')
      .map((frame) => frame.name);

  const flushDeclaration = () => {
    const trimmed = buffer.trim();
    const top = stack[stack.length - 1];
    if (trimmed && top?.kind === 'rule') {
      const colon = trimmed.indexOf(':');
      if (colon > 0 && !trimmed.startsWith('@') && !trimmed.startsWith('$')) {
        const declarationLine = bufferLine;
        top.rule.declarations.push({
          property: trimmed.slice(0, colon).trim().toLowerCase(),
          value: trimmed.slice(colon + 1).trim(),
          line: declarationLine,
          text: lines[declarationLine - 1] ?? '',
        });
      }
    }
    buffer = '';
    bufferLine = line;
  };

  for (const char of text) {
    if (char === '{') {
      const header = buffer.trim();
      const headerLine = bufferLine;
      if (
        header.startsWith('@media') ||
        header.startsWith('@supports') ||
        header.startsWith('@container') ||
        header.startsWith('@layer')
      ) {
        stack.push({ kind: 'at', name: header.replace(/\s+/g, ' ') });
      } else if (header.startsWith('@') || header === '') {
        stack.push({ kind: 'other' });
      } else {
        const rule: StyleRule = {
          selectors: resolveSelectors(currentSelectors(), header),
          atRules: currentAtRules(),
          line: headerLine,
          endLine: headerLine,
          declarations: [],
        };
        rules.push(rule);
        stack.push({ kind: 'rule', rule });
      }
      buffer = '';
      bufferLine = line;
    } else if (char === '}') {
      flushDeclaration();
      const frame = stack.pop();
      if (frame?.kind === 'rule') frame.rule.endLine = line;
      buffer = '';
      bufferLine = line;
    } else if (char === ';') {
      flushDeclaration();
    } else {
      if (buffer.trim() === '' && char !== '\n' && !/\s/.test(char)) bufferLine = line;
      buffer += char;
    }
    if (char === '\n') line++;
  }
  return rules;
}
