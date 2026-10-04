import { describe, expect, it } from 'vitest';

import { createLogger } from '../src';

describe('createLogger', () => {
  it('writes JSON lines with bindings and respects the level', () => {
    const lines: string[] = [];
    const logger = createLogger(
      { service: 'test' },
      { level: 'info', sink: (line) => lines.push(line) },
    );

    logger.debug('hidden');
    logger.child({ jobId: 'job_1' }).info('visible', { stage: 'COMPARING' });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '')).toMatchObject({
      level: 'info',
      message: 'visible',
      service: 'test',
      jobId: 'job_1',
      stage: 'COMPARING',
    });
  });
});
