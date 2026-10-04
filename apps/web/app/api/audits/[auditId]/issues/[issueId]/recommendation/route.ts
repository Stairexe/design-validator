import { recommendForIssue } from '@design-validator/pipeline';

import { LIMITS, rateLimit } from '@/lib/server/limits';
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
    request: Request,
    { params }: { params: Promise<{ auditId: string; issueId: string }> },
  ) => {
    rateLimit(request, 'ai', LIMITS.aiPerHour, 60 * 60 * 1000);
    const { auditId, issueId } = await params;
    return json({ recommendation: await recommendForIssue(getDeps(), auditId, issueId) });
  },
);
