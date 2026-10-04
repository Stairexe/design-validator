import { readFileSync } from 'node:fs';
import path from 'node:path';

import { DocumentAuditRepository } from '@design-validator/database';
import { formatValue } from '@design-validator/design-spec';
import { createLogger } from '@design-validator/jobs';
import { MemoryObjectStorage } from '@design-validator/storage';
import { localBrowserProvider } from '@design-validator/web-inspector';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startFixtureServer } from '../../web-inspector/tests/fixture-server';
import {
  SAMPLE_VIEWPORTS,
  createAudit,
  createSampleDesignSource,
  locateIssueSource,
  revalidateAudit,
  revalidationSummary,
  runAudit,
  type PipelineDependencies,
} from '../src';

const css = readFileSync(
  path.resolve(import.meta.dirname, '../../../fixtures/source-repo/styles/pricing.css'),
  'utf8',
);
const githubFetch = ((url: string) =>
  Promise.resolve(
    url.includes('/git/trees/')
      ? Response.json({ tree: [{ path: 'styles/pricing.css', type: 'blob', size: css.length }] })
      : new Response(css),
  )) as typeof fetch;

function dependencies(): PipelineDependencies {
  const storage = new MemoryObjectStorage();
  return {
    repository: new DocumentAuditRepository(storage),
    storage,
    browserProvider: localBrowserProvider(),
    logger: createLogger({}, { sink: () => undefined }),
    allowPrivateHosts: true,
    fetch: githubFetch,
  };
}

describe('source mapping and revalidation', { timeout: 150_000 }, () => {
  let server: Awaited<ReturnType<typeof startFixtureServer>>;
  const deps = dependencies();
  let auditId = '';

  beforeAll(async () => {
    server = await startFixtureServer();
    const project = await deps.repository.createProject({
      name: 'Fix loop',
      websiteUrl: `${server.url}/pricing.html`,
    });
    await deps.repository.updateProject(project.id, {
      sourceRepository: { provider: 'github', owner: 'acme', repo: 'site', ref: 'main' },
    });
    const source = await createSampleDesignSource(deps, project.id);
    const audit = await createAudit(deps, {
      projectId: project.id,
      designSourceId: source.id,
      viewports: [
        SAMPLE_VIEWPORTS[0] ?? { id: 'desktop', width: 1440, height: 900, designNodeId: '1:2' },
      ],
      settings: { visualDiff: false },
    });
    auditId = (await runAudit(deps, audit.id))?.id ?? '';
  });
  afterAll(async () => {
    await server.close();
  });

  const paddingIssue = async (id: string) =>
    (await deps.repository.listIssues(id)).find(
      (issue) => issue.element.name === 'Button / Primary' && issue.property === 'padding.inline',
    );

  it('maps an issue to the stylesheet line and proposes a patch (Phase 10)', async () => {
    const issue = await paddingIssue(auditId);
    if (!issue) throw new Error('fixture issue missing');
    const result = await locateIssueSource(deps, auditId, issue.id);
    expect(result.filesSearched).toBe(1);
    expect(result.matches[0]).toMatchObject({
      path: 'styles/pricing.css',
      selector: '.primary-cta',
      declaration: { property: 'padding', value: '12px 20px' },
    });
    expect(result.matches[0]?.url).toMatch(
      /^https:\/\/github\.com\/acme\/site\/blob\/main\/styles\/pricing\.css#L\d+$/,
    );
    expect(result.matches[0]?.patch).toContain('+  padding: 12px 24px;');
  });

  it('demonstrates the issue is removed after the code change (Phase 11 acceptance)', async () => {
    const child = await revalidateAudit(deps, auditId, `${server.url}/pricing-fixed.html`);
    expect(child.parentAuditId).toBe(auditId);
    expect(await runAudit(deps, child.id)).toMatchObject({ status: 'COMPLETED' });

    const summary = await revalidationSummary(deps, child.id);
    expect(summary?.resolved.map((issue) => `${issue.element.name} ${issue.property}`)).toContain(
      'Button / Primary padding.inline',
    );
    expect(await paddingIssue(child.id)).toBeUndefined();
    // The button grew by 8px; its width difference persists but changed.
    const width = summary?.persisting.find(
      (entry) =>
        entry.after.element.name === 'Button / Primary' && entry.after.property === 'bounds.width',
    );
    expect(width?.changed).toBe(true);
    expect(width && [formatValue(width.before.current), formatValue(width.after.current)]).toEqual([
      '124.47px',
      '132.47px',
    ]);
    expect(summary?.introduced).toEqual([]);
  });
});
