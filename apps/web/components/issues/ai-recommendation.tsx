'use client';

import type { ValidationIssue } from '@design-validator/design-spec';
import type { IssueRecommendationResult } from '@design-validator/pipeline';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { apiRequest, errorMessage } from '@/lib/api-client';

/**
 * Claude's explanation for the selected issue. Labelled as a recommendation:
 * it never replaces the measured current/required/change values above.
 */
export function AiRecommendation({
  auditId,
  issue,
  available,
}: {
  auditId: string;
  issue: ValidationIssue;
  available: boolean;
}) {
  const [results, setResults] = useState<Record<string, IssueRecommendationResult>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const group = Object.values(results).find((result) => result.issueIds.includes(issue.id));
  const entry = group?.recommendations.find(
    (recommendation) => recommendation.issueId === issue.id,
  );

  const request = async () => {
    setPending(true);
    setError('');
    try {
      const { recommendation } = await apiRequest<{ recommendation: IssueRecommendationResult }>(
        `/api/audits/${auditId}/issues/${issue.id}/recommendation`,
        { body: {} },
      );
      setResults((current) => ({
        ...current,
        [recommendation.issueIds.join(',')]: recommendation,
      }));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      aria-labelledby="ai-title"
      className="space-y-2 rounded-md border border-violet-200 bg-violet-50/50 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id="ai-title" className="text-sm font-semibold">
          AI recommendation <Badge tone="info">Claude</Badge>
        </h3>
        {!entry && available ? (
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => void request()}>
            {pending ? 'Asking Claude…' : 'Explain with Claude'}
          </Button>
        ) : null}
      </div>
      {!available ? (
        <p className="text-xs text-zinc-600">
          Unavailable: AI recommendations are not configured on this server. The measured
          differences above are complete without them.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-red-700">
          Recommendation unavailable: {error} The measured differences are unaffected.
        </p>
      ) : null}
      {entry && group ? (
        <div className="space-y-2 text-sm">
          <p className="text-xs text-zinc-500">
            A suggestion based on the measured values; verify before applying.{' '}
            {group.cached ? '(cached)' : ''}
          </p>
          <p>{entry.explanation}</p>
          {entry.probableCause ? (
            <p>
              <span className="font-medium">Likely cause:</span> {entry.probableCause}
            </p>
          ) : null}
          {entry.recommendedChange ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase text-zinc-500">
                  {entry.recommendedChange.language}
                </span>
                <CopyButton text={entry.recommendedChange.code} label="Copy" />
              </div>
              <pre className="overflow-x-auto rounded-md bg-zinc-900 p-3 text-xs text-zinc-100">
                {entry.recommendedChange.code}
              </pre>
            </div>
          ) : null}
          {entry.caveats?.length ? (
            <ul className="list-disc pl-5 text-xs text-zinc-700">
              {entry.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
