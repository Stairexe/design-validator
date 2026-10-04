import { randomUUID } from 'node:crypto';

import { createAudit } from '@design-validator/pipeline';

import { createAuditSchema } from '@/lib/api-schemas';
import { compact } from '@/lib/objects';
import { handle, json, notFound, parseBody } from '@/lib/server/http';
import { getDeps, startAudit } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';
// Inline execution continues after the response (see startAudit).
export const maxDuration = 300;

export const GET = handle(async (request: Request) => {
  const projectId = new URL(request.url).searchParams.get('projectId') ?? undefined;
  return json({
    audits: await getDeps().repository.listAudits({
      ...(projectId ? { projectId } : {}),
      limit: 100,
    }),
  });
});

export const POST = handle(async (request: Request) => {
  const body = await parseBody(request, createAuditSchema);
  const deps = getDeps();
  const audit = await createAudit(deps, {
    projectId: body.projectId,
    designSourceId: body.designSourceId,
    websiteUrl: body.websiteUrl,
    viewports: body.viewports.map((viewport) => compact(viewport)),
    settings: {
      visualDiff: body.options.visualDiff,
      aiRecommendations: body.options.aiRecommendations,
      tolerances: compact(body.options.tolerances),
      explicitMappings: body.options.explicitMappings.map((mapping) => ({
        designId: mapping.designId,
        ...(mapping.implementationSelector
          ? { implementationSelector: mapping.implementationSelector }
          : {}),
        ...(mapping.implementationId ? { implementationId: mapping.implementationId } : {}),
      })),
    },
  });
  const source = await deps.repository.getDesignSource(audit.designSourceId);
  if (!source) throw notFound('Design source');
  await startAudit(audit, source, randomUUID());
  return json({ auditId: audit.id, status: 'queued' }, { status: 202 });
});
