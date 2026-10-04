'use client';

import type { ValidationIssue } from '@design-validator/design-spec';
import type { IssueSourceResult } from '@design-validator/pipeline';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { apiRequest, errorMessage } from '@/lib/api-client';

/** Where the issue's CSS lives in the connected repository, with a proposed patch (Phase 10). */
export function SourceLocation({
  auditId,
  issue,
  available,
}: {
  auditId: string;
  issue: ValidationIssue;
  available: boolean;
}) {
  const [result, setResult] = useState<{ issueId: string; data: IssueSourceResult } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const current = result?.issueId === issue.id ? result.data : null;

  if (!available || !issue.element.implementationId) return null;

  const locate = async () => {
    setPending(true);
    setError('');
    try {
      const data = await apiRequest<IssueSourceResult>(
        `/api/audits/${auditId}/issues/${issue.id}/source`,
      );
      setResult({ issueId: issue.id, data });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-labelledby="source-title" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id="source-title" className="text-sm font-semibold">
          Source code
        </h3>
        {!current ? (
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => void locate()}>
            {pending ? 'Searching…' : 'Find in repository'}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
      {current && current.matches.length === 0 ? (
        <p className="text-sm text-zinc-600">
          No stylesheet rule in {current.filesSearched} file(s) matches this element and property.
        </p>
      ) : null}
      {current?.matches.map((match) => (
        <div
          key={`${match.path}:${match.line}`}
          className="space-y-1 rounded-md border border-zinc-200 p-3 text-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a
              href={match.url}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs underline underline-offset-2"
            >
              {match.path}:{match.line}
            </a>
            <CopyButton text={match.patch} label="Copy patch" />
          </div>
          <p className="text-xs text-zinc-600">
            <code>{match.selector}</code>
            {match.atRules.length ? ` inside ${match.atRules.join(' ')}` : ''} — {match.note}
          </p>
          <pre className="overflow-x-auto rounded bg-zinc-900 p-2 text-xs text-zinc-100">
            {match.patch.split('\n').map((line, index) => (
              <span
                key={index}
                className={
                  line.startsWith('+') && !line.startsWith('+++')
                    ? 'text-emerald-300'
                    : line.startsWith('-') && !line.startsWith('---')
                      ? 'text-red-300'
                      : undefined
                }
              >
                {line}
                {'\n'}
              </span>
            ))}
          </pre>
        </div>
      ))}
    </section>
  );
}
