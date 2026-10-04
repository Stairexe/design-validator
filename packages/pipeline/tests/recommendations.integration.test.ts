import { AiProviderError, type RecommendationModel } from '@design-validator/ai';
import { DocumentAuditRepository } from '@design-validator/database';
import { createLogger } from '@design-validator/jobs';
import { MemoryObjectStorage } from '@design-validator/storage';
import { localBrowserProvider } from '@design-validator/web-inspector';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startFixtureServer } from '../../web-inspector/tests/fixture-server';
import {
  SAMPLE_VIEWPORTS,
  createAudit,
  createSampleDesignSource,
  recommendForIssue,
  runAudit,
  type PipelineDependencies,
} from '../src';

function deps(model: RecommendationModel | undefined): PipelineDependencies {
  const storage = new MemoryObjectStorage();
  return {
    repository: new DocumentAuditRepository(storage),
    storage,
    browserProvider: localBrowserProvider(),
    logger: createLogger({}, { sink: () => undefined }),
    allowPrivateHosts: true,
    recommendationModel: model,
  };
}

const echoModel = (): RecommendationModel & { calls: number } => {
  const model = {
    model: 'fake-model',
    calls: 0,
    recommend: (payload: { differences: { issueId: string }[] }) => {
      model.calls++;
      return Promise.resolve({
        groupSummary: 'Summary',
        recommendations: payload.differences.map((d) => ({
          issueId: d.issueId,
          explanation: 'Because.',
          probableCause: 'A rule.',
          recommendedChange: { language: 'css' as const, code: '.x{}' },
          caveats: [],
        })),
      });
    },
  };
  return model;
};

describe('AI recommendations in the pipeline', { timeout: 120_000 }, () => {
  let server: Awaited<ReturnType<typeof startFixtureServer>>;
  beforeAll(async () => {
    server = await startFixtureServer();
  });
  afterAll(async () => {
    await server.close();
  });

  async function completedAudit(d: PipelineDependencies, aiRecommendations: boolean) {
    const project = await d.repository.createProject({
      name: 'AI',
      websiteUrl: `${server.url}/pricing.html`,
    });
    const source = await createSampleDesignSource(d, project.id);
    const audit = await createAudit(d, {
      projectId: project.id,
      designSourceId: source.id,
      viewports: [
        SAMPLE_VIEWPORTS[0] ?? { id: 'd', width: 1440, height: 900, designNodeId: '1:2' },
      ],
      settings: { visualDiff: false, aiRecommendations },
    });
    return runAudit(d, audit.id);
  }

  it('explains an element once and serves repeats from the cache, leaving issues unchanged', async () => {
    const model = echoModel();
    const d = deps(model);
    const audit = await completedAudit(d, false);
    if (!audit) throw new Error('no audit');
    const before = await d.repository.listIssues(audit.id);
    const target = before.find((issue) => issue.property === 'padding.inline');
    if (!target) throw new Error('fixture issue missing');

    const first = await recommendForIssue(d, audit.id, target.id);
    const second = await recommendForIssue(d, audit.id, target.id);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(model.calls).toBe(1);
    expect(first.issueIds).toContain(target.id);
    expect(first.recommendations.some((r) => r.issueId === target.id)).toBe(true);
    expect(await d.repository.listIssues(audit.id)).toEqual(before);
  });

  it('keeps the deterministic audit complete when the AI provider fails', async () => {
    const failing: RecommendationModel = {
      model: 'down',
      recommend: () =>
        Promise.reject(new AiProviderError('provider-error', 'Claude could not be reached.')),
    };
    const d = deps(failing);
    const audit = await completedAudit(d, true);
    expect(audit?.status).toBe('COMPLETED');
    expect(audit?.issueCount).toBeGreaterThan(0);
    expect(audit?.warnings.some((w) => w.includes('AI recommendations unavailable'))).toBe(true);
    const issue = (await d.repository.listIssues(audit?.id ?? ''))[0];
    await expect(recommendForIssue(d, audit?.id ?? '', issue?.id ?? '')).rejects.toMatchObject({
      code: 'AI_PROVIDER_FAILED',
    });
  });

  it('reports a clear error when AI is not configured', async () => {
    const d = deps(undefined);
    const audit = await completedAudit(d, false);
    const issue = (await d.repository.listIssues(audit?.id ?? ''))[0];
    await expect(recommendForIssue(d, audit?.id ?? '', issue?.id ?? '')).rejects.toThrow(
      /not configured/,
    );
  });
});
