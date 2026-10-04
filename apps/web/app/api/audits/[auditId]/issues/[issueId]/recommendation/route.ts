import { recommendForIssue } from '@design-validator/pipeline';

import { handle, json } from '@/lib/server/http';
import { getDeps } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * On-demand Claude explanation for an issue's element (claude-usage.md:
 * call Claude when the user asks, not for every issue during the audit).
 */
export const POST = handle(
  async (
    _request: Request,
    { params }: { params: Promise<{ auditId: string; issueId: string }> },
  ) => {
    const { auditId, issueId } = await params;
    return json({ recommendation: await recommendForIssue(getDeps(), auditId, issueId) });
  },
);
