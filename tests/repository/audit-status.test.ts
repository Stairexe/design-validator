import { AuditStatus } from '@design-validator/database';
import { AUDIT_STATUSES } from '@design-validator/jobs';
import { describe, expect, it } from 'vitest';

describe('audit status vocabulary', () => {
  it('is identical in the job pipeline and the database schema', () => {
    expect(Object.values(AuditStatus)).toEqual([...AUDIT_STATUSES]);
  });
});
