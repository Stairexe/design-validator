import { cancelAudit } from '@design-validator/pipeline';

import { handle, json, notFound } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

export const POST = handle(
  async (_request: Request, { params }: { params: Promise<{ auditId: string }> }) => {
    const { auditId } = await params;
    const audit = await cancelAudit(getDeps(), auditId);
    if (!audit) throw notFound('Audit');
    return json({ audit });
  },
);
