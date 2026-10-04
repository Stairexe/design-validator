import { randomUUID } from 'node:crypto';

import { revalidateAudit } from '@design-validator/pipeline';
import { z } from 'zod';

import { auditLog, enforceAuditCapacity } from '@/lib/server/limits';
import { handle, json, notFound, parseBody } from '@/lib/server/http';
import { getDeps, startAudit } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const schema = z.object({
  websiteUrl: z
    .url()
    .refine((value) => /^https?:\/\//.test(value))
    .optional(),
});

/** Re-runs a completed audit, optionally against a preview URL of a fix (Phase 11). */
export const POST = handle(
  async (request: Request, { params }: { params: Promise<{ auditId: string }> }) => {
    await enforceAuditCapacity(request);
    const { auditId } = await params;
    const { websiteUrl } = await parseBody(request, schema);
    const deps = getDeps();
    const audit = await revalidateAudit(deps, auditId, websiteUrl);
    const source = await deps.repository.getDesignSource(audit.designSourceId);
    if (!source) throw notFound('Design source');
    await startAudit(audit, source, randomUUID());
    auditLog(request, 'audit.revalidate', { auditId: audit.id, parentAuditId: auditId });
    return json({ auditId: audit.id, status: 'queued' }, { status: 202 });
  },
);
