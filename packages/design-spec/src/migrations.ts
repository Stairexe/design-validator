import { parseDesignSpec } from './schema';
import { normalizeFontWeight, normalizeLineHeight } from './typography';
import type { DesignSpec } from './types';
import { DESIGN_SPEC_SCHEMA_VERSION } from './version';

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * 0.1.0 → 1.0.0:
 * - `typography.fontWeight` (number | string) → number
 * - `typography.lineHeight` (number | string) → number | 'normal'
 * - `effects.boxShadow` (raw string) → `effects.shadows` (cannot be parsed
 *   losslessly, so it becomes `null`: unknown rather than "no shadow").
 */
function migrate010To100(spec: JsonObject): JsonObject {
  const pages = Array.isArray(spec['pages']) ? spec['pages'] : [];
  for (const page of pages) {
    if (!isObject(page) || !Array.isArray(page['elements'])) continue;
    for (const element of page['elements']) {
      if (!isObject(element)) continue;
      const typography = element['typography'];
      if (isObject(typography)) {
        const fontSize = typeof typography['fontSize'] === 'number' ? typography['fontSize'] : null;
        typography['fontWeight'] = normalizeFontWeight(
          typography['fontWeight'] as string | number | null | undefined,
        );
        typography['lineHeight'] = normalizeLineHeight(
          typography['lineHeight'] as string | number | null | undefined,
          fontSize,
        );
      }
      const effects = element['effects'];
      if (isObject(effects) && 'boxShadow' in effects) {
        delete effects['boxShadow'];
        effects['shadows'] = null;
      }
    }
  }
  return { ...spec, schemaVersion: '1.0.0' };
}

const MIGRATIONS: Readonly<Record<string, (spec: JsonObject) => JsonObject>> = {
  '0.1.0': migrate010To100,
};

/**
 * Upgrades a stored DesignSpec of any supported version to the current
 * version, then validates it.
 */
export function migrateDesignSpec(input: unknown): DesignSpec {
  if (!isObject(input)) {
    throw new Error('DesignSpec must be an object');
  }
  let spec: JsonObject = structuredClone(input);
  for (let guard = 0; spec['schemaVersion'] !== DESIGN_SPEC_SCHEMA_VERSION; guard++) {
    const version = String(spec['schemaVersion']);
    const step = MIGRATIONS[version];
    if (!step || guard > 10) {
      throw new Error(`Unsupported DesignSpec schemaVersion: ${version}`);
    }
    spec = step(spec);
  }
  return parseDesignSpec(spec);
}
