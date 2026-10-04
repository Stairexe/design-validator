import type { ValidationIssue } from '@design-validator/design-spec';
import { describe, expect, it } from 'vitest';

import type { AuditRepository, AuditSettings } from '../src';

const settings: AuditSettings = {
  tolerances: {},
  visualDiff: true,
  aiRecommendations: false,
  explicitMappings: [],
};

const issue = (
  id: string,
  viewportId: string,
  category: ValidationIssue['category'],
): ValidationIssue => ({
  id,
  viewportId,
  category,
  severity: 'medium',
  element: { name: 'Primary CTA', designId: 'd1', implementationId: 'dom-3' },
  property: 'padding.inline',
  current: { kind: 'length', value: 20 },
  required: { kind: 'length', value: 24 },
  delta: { kind: 'length', value: 4 },
  tolerance: 2,
  status: 'difference',
  evidence: {},
});

/** Behaviour every AuditRepository implementation must share. */
export function repositoryContract(name: string, create: () => AuditRepository) {
  describe(`${name} repository contract`, () => {
    async function seed(repo: AuditRepository) {
      const project = await repo.createProject({
        name: 'Pricing',
        websiteUrl: 'https://example.com/pricing',
      });
      const source = await repo.createDesignSource({
        projectId: project.id,
        kind: 'figma',
        name: 'Pricing file',
        uri: 'https://www.figma.com/design/KEY/Pricing',
        fileKey: 'KEY',
        revision: null,
        frames: [{ nodeId: '1:2', name: 'Desktop', width: 1440, height: 900 }],
        uploadObjectKey: null,
      });
      const audit = await repo.createAudit({
        projectId: project.id,
        designSourceId: source.id,
        websiteUrl: project.websiteUrl,
        viewports: [{ id: 'desktop', width: 1440, height: 900, designNodeId: '1:2' }],
        settings,
        inputHash: 'hash',
      });
      return { project, source, audit };
    }

    it('creates, reads, updates and lists projects and design sources', async () => {
      const repo = create();
      const { project, source } = await seed(repo);
      expect(project.id).toMatch(/^prj_/);
      expect(await repo.getProject(project.id)).toEqual(project);
      expect((await repo.listProjects()).map((p) => p.id)).toContain(project.id);
      const updated = await repo.updateProject(project.id, {
        name: 'Pricing v2',
        sourceRepository: { provider: 'github', owner: 'acme', repo: 'site', ref: 'main' },
      });
      expect(updated).toMatchObject({ name: 'Pricing v2', sourceRepository: { repo: 'site' } });
      expect(await repo.updateProject('prj_missing', { name: 'x' })).toBeNull();
      expect(await repo.getDesignSource(source.id)).toEqual(source);
      expect((await repo.listDesignSources(project.id)).map((s) => s.id)).toEqual([source.id]);
    });

    it('tracks audit state, progress and counts', async () => {
      const repo = create();
      const { audit, project } = await seed(repo);
      expect(audit).toMatchObject({
        status: 'QUEUED',
        issueCount: 0,
        parentAuditId: null,
        progress: { stage: 'QUEUED' },
      });
      const updated = await repo.updateAudit(audit.id, {
        status: 'COMPARING',
        progress: { stage: 'COMPARING', message: 'Comparing typography', progress: 0.7 },
        startedAt: '2026-01-01T00:00:00.000Z',
        warnings: ['Network did not become idle'],
      });
      expect(updated).toMatchObject({
        status: 'COMPARING',
        progress: { progress: 0.7 },
        startedAt: '2026-01-01T00:00:00.000Z',
        warnings: ['Network did not become idle'],
      });
      expect((await repo.listAudits({ projectId: project.id })).map((a) => a.id)).toEqual([
        audit.id,
      ]);
      expect(await repo.listAuditsCreatedBefore(new Date('2000-01-01'))).toEqual([]);
    });

    it('upserts stage runs idempotently', async () => {
      const repo = create();
      const { audit } = await seed(repo);
      await repo.upsertStageRun({
        idempotencyKey: `${audit.id}-k1`,
        auditId: audit.id,
        stage: 'INSPECTING_WEBSITE',
        viewportId: 'desktop',
        status: 'RUNNING',
        startedAt: '2026-01-01T00:00:00.000Z',
      });
      await repo.upsertStageRun({
        idempotencyKey: `${audit.id}-k1`,
        auditId: audit.id,
        stage: 'INSPECTING_WEBSITE',
        status: 'SUCCEEDED',
        metrics: { elementCount: 12 },
      });
      const runs = await repo.listStageRuns(audit.id);
      expect(runs).toHaveLength(1);
      expect(runs[0]).toMatchObject({
        status: 'SUCCEEDED',
        viewportId: 'desktop',
        metrics: { elementCount: 12 },
      });
    });

    it('replaces and filters issues without duplicating them', async () => {
      const repo = create();
      const { audit } = await seed(repo);
      await repo.replaceIssues(audit.id, [issue('iss_1', 'desktop', 'spacing')]);
      await repo.replaceIssues(audit.id, [
        issue('iss_1', 'desktop', 'spacing'),
        issue('iss_2', 'mobile', 'typography'),
      ]);
      expect((await repo.listIssues(audit.id)).map((i) => i.id)).toEqual(['iss_1', 'iss_2']);
      expect((await repo.listIssues(audit.id, { viewportId: 'mobile' })).map((i) => i.id)).toEqual([
        'iss_2',
      ]);
      expect((await repo.listIssues(audit.id, { category: 'spacing' })).map((i) => i.id)).toEqual([
        'iss_1',
      ]);
      expect(await repo.getIssue(audit.id, 'iss_2')).toMatchObject({
        current: { kind: 'length', value: 20 },
        delta: { value: 4 },
      });
      expect(await repo.getIssue(audit.id, 'nope')).toBeNull();
    });

    it('caches recommendations by key', async () => {
      const repo = create();
      const { audit } = await seed(repo);
      const key = `${audit.id}-cache`;
      expect(await repo.getRecommendation(key)).toBeNull();
      await repo.saveRecommendation({
        cacheKey: key,
        auditId: audit.id,
        issueIds: ['iss_1'],
        payload: { explanation: 'x' },
        model: 'm',
        promptVersion: 'v1',
      });
      expect(await repo.getRecommendation(key)).toMatchObject({
        issueIds: ['iss_1'],
        payload: { explanation: 'x' },
      });
    });

    it('cascades project deletion', async () => {
      const repo = create();
      const { project, source, audit } = await seed(repo);
      await repo.replaceIssues(audit.id, [issue('iss_1', 'desktop', 'spacing')]);
      expect(await repo.deleteProject(project.id)).toBe(true);
      expect(await repo.getProject(project.id)).toBeNull();
      expect(await repo.getDesignSource(source.id)).toBeNull();
      expect(await repo.getAudit(audit.id)).toBeNull();
      expect(await repo.listIssues(audit.id)).toEqual([]);
      expect(await repo.deleteProject(project.id)).toBe(false);
    });
  });
}
