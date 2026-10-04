import { describe, expect, it } from 'vitest';

import { AUDIT_STAGES, AUDIT_STATUSES, ALL_QUEUE_NAMES, isTerminalStatus } from '../src';

describe('audit status vocabulary', () => {
  it('follows the documented state machine order', () => {
    expect(AUDIT_STAGES).toEqual([
      'QUEUED',
      'INSPECTING_WEBSITE',
      'IMPORTING_DESIGN',
      'NORMALIZING',
      'MATCHING',
      'COMPARING',
      'VISUAL_DIFF',
      'AI_RECOMMENDATIONS',
    ]);
  });

  it('classifies terminal statuses', () => {
    expect(AUDIT_STATUSES.filter(isTerminalStatus)).toEqual(['COMPLETED', 'FAILED', 'CANCELLED']);
  });
});

describe('queue names', () => {
  it('are unique kebab-case identifiers', () => {
    expect(new Set(ALL_QUEUE_NAMES).size).toBe(ALL_QUEUE_NAMES.length);
    for (const name of ALL_QUEUE_NAMES) {
      expect(name).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });
});
