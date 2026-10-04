import { describe, expect, it } from 'vitest';

import { idempotencyKey, jobEnvelopeSchema } from '../src';

describe('idempotencyKey', () => {
  const base = { auditId: 'audit_1', stage: 'INSPECTING_WEBSITE', inputHash: 'abc' } as const;

  it('is deterministic for the same input', () => {
    expect(idempotencyKey(base)).toBe(idempotencyKey({ ...base }));
    expect(idempotencyKey(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('distinguishes viewports, stages and inputs', () => {
    const keys = new Set([
      idempotencyKey(base),
      idempotencyKey({ ...base, viewportId: 'desktop' }),
      idempotencyKey({ ...base, viewportId: 'mobile' }),
      idempotencyKey({ ...base, stage: 'COMPARING' }),
      idempotencyKey({ ...base, inputHash: 'abd' }),
    ]);
    expect(keys.size).toBe(5);
  });

  it('keeps part boundaries unambiguous', () => {
    expect(idempotencyKey({ ...base, auditId: 'a', inputHash: 'bc' })).not.toBe(
      idempotencyKey({ ...base, auditId: 'ab', inputHash: 'c' }),
    );
  });
});

describe('jobEnvelopeSchema', () => {
  const valid = {
    auditId: 'audit_1',
    projectId: 'project_1',
    attempt: 1,
    correlationId: 'corr_1',
    inputHash: 'abc',
  };

  it('accepts a complete envelope', () => {
    expect(jobEnvelopeSchema.parse(valid)).toEqual(valid);
  });

  it.each(['auditId', 'projectId', 'correlationId', 'inputHash'])(
    'rejects a missing %s',
    (field) => {
      expect(jobEnvelopeSchema.safeParse({ ...valid, [field]: undefined }).success).toBe(false);
    },
  );

  it('rejects a non-positive attempt', () => {
    expect(jobEnvelopeSchema.safeParse({ ...valid, attempt: 0 }).success).toBe(false);
  });
});
