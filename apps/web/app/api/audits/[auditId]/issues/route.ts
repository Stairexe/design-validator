import { ISSUE_CATEGORIES, ISSUE_SEVERITIES } from '@design-validator/design-spec';
import { z } from 'zod';

import { HttpError, handle, json, notFound } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  viewport: z.string().optional(),
  category: z.enum(ISSUE_CATEGORIES).optional(),
  severity: z.enum(ISSUE_SEVERITIES).optional(),
});

export const GET = handle(
  async (request: Request, { params }: { params: Promise<{ auditId: string }> }) => {
    const { auditId } = await params;
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success)
      throw new HttpError(
        422,
        'VALIDATION_FAILED',
        parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      );
    const { repository } = getDeps();
    if (!(await repository.getAudit(auditId))) throw notFound('Audit');
    const issues = await repository.listIssues(auditId, {
      ...(parsed.data.viewport ? { viewportId: parsed.data.viewport } : {}),
      ...(parsed.data.category ? { category: parsed.data.category } : {}),
      ...(parsed.data.severity ? { severity: parsed.data.severity } : {}),
    });
    return json({ issues });
  },
);
