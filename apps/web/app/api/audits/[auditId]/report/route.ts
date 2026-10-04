import { artifactKeys, getJson } from '@design-validator/pipeline';

import { handle, json, notFound } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

/** Full deterministic report (issues, unresolved mappings, groups) plus visual evidence summary. */
export const GET = handle(
  async (_request: Request, { params }: { params: Promise<{ auditId: string }> }) => {
    const { auditId } = await params;
    const { storage } = getDeps();
    const report = await getJson(storage, artifactKeys.report(auditId));
    if (!report) throw notFound('Report');
    return json({ report, visual: await getJson(storage, artifactKeys.visual(auditId)) });
  },
);
