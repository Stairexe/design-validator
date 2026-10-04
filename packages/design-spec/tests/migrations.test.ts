import { describe, expect, it } from 'vitest';

import { DESIGN_SPEC_SCHEMA_VERSION, migrateDesignSpec } from '../src';
import { makeElement, makeSpec } from '../src/testing';

describe('migrateDesignSpec', () => {
  it('returns current-version specs unchanged', () => {
    const spec = makeSpec('website', [makeElement('a')]);
    expect(migrateDesignSpec(spec)).toEqual(spec);
  });

  it('upgrades 0.1.0 typography and effects', () => {
    const legacy = makeSpec('figma', [makeElement('a')]) as unknown as Record<string, unknown>;
    legacy['schemaVersion'] = '0.1.0';
    const page = (legacy['pages'] as { elements: Record<string, unknown>[] }[])[0];
    const element = page?.elements[0];
    if (element) {
      element['typography'] = { fontSize: 16, fontWeight: 'SemiBold', lineHeight: '1.5' };
      element['effects'] = { boxShadow: '0 1px 2px #000' };
    }

    const migrated = migrateDesignSpec(legacy);
    const result = migrated.pages[0]?.elements[0];
    expect(migrated.schemaVersion).toBe(DESIGN_SPEC_SCHEMA_VERSION);
    expect(result?.typography).toMatchObject({ fontWeight: 600, lineHeight: 24 });
    expect(result?.effects).toEqual({ shadows: null });
  });

  it('rejects unknown versions', () => {
    expect(() => migrateDesignSpec({ schemaVersion: '0.0.1' })).toThrow(/Unsupported/);
  });
});
