import { DocumentAuditRepository } from '@design-validator/database';
import { createLogger } from '@design-validator/jobs';
import { MemoryObjectStorage } from '@design-validator/storage';
import { describe, expect, it } from 'vitest';

import { purgeExpiredAudits, type PipelineDependencies } from '../src';

describe('purgeExpiredAudits', () => {
  it('deletes audits and artifacts older than the retention period', async () => {
    const storage = new MemoryObjectStorage();
    const deps: PipelineDependencies = {
      repository: new DocumentAuditRepository(storage),
      storage,
      browserProvider: { launch: () => Promise.reject(new Error('unused')) },
      logger: createLogger({}, { sink: () => undefined }),
      allowPrivateHosts: false,
    };
    const project = await deps.repository.createProject({
      name: 'p',
      websiteUrl: 'https://example.com',
    });
    const source = await deps.repository.createDesignSource({
      projectId: project.id,
      kind: 'figma',
      name: 's',
      uri: null,
      fileKey: null,
      revision: null,
      frames: [],
      uploadObjectKey: null,
    });
    const audit = await deps.repository.createAudit({
      projectId: project.id,
      designSourceId: source.id,
      websiteUrl: project.websiteUrl,
      viewports: [],
      settings: {
        tolerances: {},
        visualDiff: false,
        aiRecommendations: false,
        explicitMappings: [],
      },
      inputHash: 'h',
    });
    await storage.put({
      key: `audits/${audit.id}/report.json`,
      body: new Uint8Array([1]),
      contentType: 'application/json',
    });

    expect((await purgeExpiredAudits(deps, 30)).deletedAudits).toBe(0);
    const future = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect((await purgeExpiredAudits(deps, 30, future)).deletedAudits).toBe(1);
    expect(await deps.repository.getAudit(audit.id)).toBeNull();
    expect(await storage.list(`audits/${audit.id}/`)).toEqual([]);
    expect(await deps.repository.getProject(project.id)).not.toBeNull();
  });
});
