import { randomUUID } from 'node:crypto';

import {
  SAMPLE_PAGE_PATH,
  SAMPLE_VIEWPORTS,
  createAudit,
  createSampleDesignSource,
} from '@design-validator/pipeline';

import { handle, json } from '@/lib/server/http';
import { getDeps, startAudit } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * One-click demo: a project for the bundled sample page, the bundled sample
 * Figma design, and an audit across desktop and mobile.
 */
export const POST = handle(async (request: Request) => {
  const deps = getDeps();
  const origin = process.env['APP_URL'] ?? new URL(request.url).origin;
  const project = await deps.repository.createProject({
    name: 'Sample: Pricing page',
    websiteUrl: new URL(SAMPLE_PAGE_PATH, origin).toString(),
  });
  const source = await createSampleDesignSource(deps, project.id);
  const audit = await createAudit(deps, {
    projectId: project.id,
    designSourceId: source.id,
    viewports: SAMPLE_VIEWPORTS,
  });
  await startAudit(audit, source, randomUUID());
  return json({ projectId: project.id, auditId: audit.id }, { status: 202 });
});
