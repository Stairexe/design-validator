import { readFileSync } from 'node:fs';
import path from 'node:path';

import { DocumentAuditRepository } from '@design-validator/database';
import { formatDelta, formatValue } from '@design-validator/design-spec';
import { createLogger } from '@design-validator/jobs';
import { MemoryObjectStorage } from '@design-validator/storage';
import { localBrowserProvider } from '@design-validator/web-inspector';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startFixtureServer } from '../../web-inspector/tests/fixture-server';
import {
  SAMPLE_VIEWPORTS,
  artifactKeys,
  cancelAudit,
  createAudit,
  createSampleDesignSource,
  createXdDesignSource,
  deleteProject,
  getJson,
  runAudit,
  type PipelineDependencies,
  type VisualSummary,
} from '../src';

function dependencies(): PipelineDependencies {
  const storage = new MemoryObjectStorage();
  return {
    repository: new DocumentAuditRepository(storage),
    storage,
    browserProvider: localBrowserProvider(),
    logger: createLogger({}, { sink: () => undefined }),
    allowPrivateHosts: true,
  };
}

describe('runAudit (inline, Chromium integration)', { timeout: 120_000 }, () => {
  let server: Awaited<ReturnType<typeof startFixtureServer>>;
  beforeAll(async () => {
    server = await startFixtureServer();
  });
  afterAll(async () => {
    await server.close();
  });

  it('runs a complete audit against the sample design and reports exact differences', async () => {
    const deps = dependencies();
    const project = await deps.repository.createProject({
      name: 'Pricing',
      websiteUrl: `${server.url}/pricing.html`,
    });
    const source = await createSampleDesignSource(deps, project.id);
    const audit = await createAudit(deps, {
      projectId: project.id,
      designSourceId: source.id,
      viewports: SAMPLE_VIEWPORTS,
    });

    const finished = await runAudit(deps, audit.id);
    expect(finished).toMatchObject({
      status: 'COMPLETED',
      failureCode: null,
      progress: { progress: 1 },
    });
    expect(finished?.issueCount).toBeGreaterThan(5);

    const issues = await deps.repository.listIssues(audit.id, { viewportId: 'desktop' });
    const padding = issues.find(
      (issue) => issue.element.name === 'Button / Primary' && issue.property === 'padding.inline',
    );
    expect(
      padding && [
        formatValue(padding.current),
        formatValue(padding.required),
        padding.delta && formatDelta(padding.delta),
      ],
    ).toEqual(['20px', '24px', '+4px']);

    const runs = await deps.repository.listStageRuns(audit.id);
    expect(runs.every((run) => run.status === 'SUCCEEDED')).toBe(true);
    expect(new Set(runs.map((run) => run.stage))).toEqual(
      new Set([
        'INSPECTING_WEBSITE',
        'IMPORTING_DESIGN',
        'NORMALIZING',
        'MATCHING',
        'COMPARING',
        'VISUAL_DIFF',
      ]),
    );

    const visual = (await getJson(deps.storage, artifactKeys.visual(audit.id))) as VisualSummary;
    expect(visual.viewports.map((v) => [v.viewportId, v.designImage])).toEqual([
      ['desktop', 'rendered'],
      ['mobile', 'rendered'],
    ]);
    for (const name of ['website.png', 'design.png', 'diff.png']) {
      expect(await deps.storage.get(`audits/${audit.id}/viewports/desktop/${name}`)).not.toBeNull();
    }
  });

  it('compares an Adobe XD manifest with the same comparator (Phase 9 acceptance)', async () => {
    const deps = dependencies();
    const manifest: unknown = JSON.parse(
      readFileSync(
        path.resolve(import.meta.dirname, '../../../fixtures/xd/pricing.manifest.json'),
        'utf8',
      ),
    );
    const project = await deps.repository.createProject({
      name: 'XD',
      websiteUrl: `${server.url}/pricing.html`,
    });
    const source = await createXdDesignSource(deps, { projectId: project.id, manifest });
    const audit = await createAudit(deps, {
      projectId: project.id,
      designSourceId: source.id,
      viewports: [{ id: 'desktop', width: 1440, height: 900, designNodeId: 'ab-desktop' }],
      settings: { visualDiff: false },
    });
    expect(await runAudit(deps, audit.id)).toMatchObject({ status: 'COMPLETED' });
    const issues = await deps.repository.listIssues(audit.id);
    const padding = issues.find(
      (issue) => issue.element.name === 'Button / Primary' && issue.property === 'padding.inline',
    );
    expect(padding && formatValue(padding.required)).toBe('24px');
    expect(
      issues.some(
        (issue) => issue.element.name === 'Hero title' && issue.property === 'typography.fontSize',
      ),
    ).toBe(true);
  });

  it('records typed failures and keeps the audit inspectable', async () => {
    const deps = dependencies();
    const project = await deps.repository.createProject({
      name: 'Broken',
      websiteUrl: `${server.url}/missing.html`,
    });
    const source = await createSampleDesignSource(deps, project.id);
    const audit = await createAudit(deps, {
      projectId: project.id,
      designSourceId: source.id,
      viewports: [
        SAMPLE_VIEWPORTS[0] ?? { id: 'd', width: 1440, height: 900, designNodeId: '1:2' },
      ],
    });
    expect(await runAudit(deps, audit.id)).toMatchObject({
      status: 'FAILED',
      failureCode: 'PAGE_RENDER_FAILED',
    });
    const [run] = await deps.repository.listStageRuns(audit.id);
    expect(run).toMatchObject({ status: 'FAILED', failureCode: 'PAGE_RENDER_FAILED' });
  });

  it('validates requests before queuing', async () => {
    const deps = { ...dependencies(), allowPrivateHosts: false };
    const project = await deps.repository.createProject({
      name: 'Internal',
      websiteUrl: 'http://127.0.0.1/admin',
    });
    const source = await createSampleDesignSource(deps, project.id);
    await expect(
      createAudit(deps, {
        projectId: project.id,
        designSourceId: source.id,
        viewports: SAMPLE_VIEWPORTS,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_URL' });
    await expect(
      createAudit(deps, {
        projectId: project.id,
        designSourceId: source.id,
        websiteUrl: 'https://example.com',
        viewports: [{ id: 'x', width: 10, height: 10, designNodeId: '404:1' }],
      }),
    ).rejects.toThrow(/unknown design frame/);
  });

  it('stops a cancelled audit and never re-runs a finished one', async () => {
    const deps = dependencies();
    const project = await deps.repository.createProject({
      name: 'Cancel',
      websiteUrl: `${server.url}/pricing.html`,
    });
    const source = await createSampleDesignSource(deps, project.id);
    const audit = await createAudit(deps, {
      projectId: project.id,
      designSourceId: source.id,
      viewports: SAMPLE_VIEWPORTS,
    });
    await cancelAudit(deps, audit.id);
    expect(await runAudit(deps, audit.id)).toMatchObject({ status: 'CANCELLED' });
    expect(await deps.repository.listStageRuns(audit.id)).toEqual([]);
    expect(await deleteProject(deps, project.id)).toBe(true);
    expect(await deps.storage.list('audits/')).toEqual([]);
  });
});
