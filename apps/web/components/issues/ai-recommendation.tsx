'use client';

import type { ValidationIssue } from '@design-validator/design-spec';
import { SparklesIcon } from '@heroicons/react/16/solid';
import type { IssueRecommendationResult } from '@design-validator/pipeline';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button, Spinner } from '@/components/ui/button';
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

  // Without a configured model the feature is simply absent; Settings explains how to enable it.
  if (!available) return null;

  return (
    <section
      aria-labelledby="ai-title"
      className="space-y-3 rounded-xl bg-gradient-to-b from-brand-50/80 to-white p-4 ring-1 ring-inset ring-brand-500/15"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="ai-title" className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
          <SparklesIcon aria-hidden className="size-4 text-brand-600" />
          AI explanation
          <Badge tone="info">Claude</Badge>
        </h3>
        {!entry ? (
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => void request()}>
            {pending ? <Spinner /> : null}
            {pending ? 'Asking Claude…' : 'Explain with Claude'}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-red-700">
          Recommendation unavailable: {error} The measured differences are unaffected.
        </p>
      ) : null}
      {entry && group ? (
        <div className="space-y-3 text-sm leading-relaxed text-zinc-700">
          <p className="text-xs text-zinc-500">
            A suggestion based on the measured values; check it before applying.
            {group.cached ? ' (cached)' : ''}
          </p>
          <p>{entry.explanation}</p>
          {entry.probableCause ? (
            <p>
              <span className="font-medium text-zinc-950">Likely cause:</span> {entry.probableCause}
            </p>
          ) : null}
          {entry.recommendedChange ? (
            <div className="overflow-hidden rounded-xl bg-zinc-950">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
                <span className="font-mono text-[11px] uppercase tracking-wide text-zinc-500">
                  {entry.recommendedChange.language}
                </span>
                <CopyButton text={entry.recommendedChange.code} label="Copy" />
              </div>
              <pre className="overflow-x-auto p-3.5 font-mono text-[13px] text-zinc-100">
                {entry.recommendedChange.code}
              </pre>
            </div>
          ) : null}
          {entry.caveats?.length ? (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-zinc-500">
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
