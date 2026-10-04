import { describe, expect, it } from 'vitest';

import { AuditStatus, DesignSourceType } from '../src';

describe('database enums', () => {
  it('only models the supported design sources', () => {
    expect(Object.values(DesignSourceType)).toEqual(['FIGMA', 'ADOBE_XD']);
  });

  it('ends the audit lifecycle in terminal states', () => {
    expect(Object.values(AuditStatus).slice(-3)).toEqual(['COMPLETED', 'FAILED', 'CANCELLED']);
  });
});
