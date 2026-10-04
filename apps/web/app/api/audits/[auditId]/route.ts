import { deleteAudit } from '@design-validator/pipeline';

import { auditLog } from '@/lib/server/limits';
import { handle, json, notFound } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ auditId: string }> };

/** Audit state and progress, polled by the processing screen. */
export const GET = handle(async (_request: Request, { params }: Context) => {
  const { auditId } = await params;
  const { repository } = getDeps();
  const audit = await repository.getAudit(auditId);
  if (!audit) throw notFound('Audit');
  return json({ audit, stageRuns: await repository.listStageRuns(auditId) });
});

export const DELETE = handle(async (request: Request, { params }: Context) => {
  const { auditId } = await params;
  auditLog(request, 'audit.delete', { id: auditId });
  if (!(await deleteAudit(getDeps(), auditId))) throw notFound('Audit');
  return new Response(null, { status: 204 });
});
