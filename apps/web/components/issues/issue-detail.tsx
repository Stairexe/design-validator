'use client';

import {
  formatDelta,
  formatValue,
  propertyLabel,
  type IssueGroup,
  type ValidationIssue,
} from '@design-validator/design-spec';
import { LightBulbIcon, PhotoIcon } from '@heroicons/react/16/solid';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/cn';
import { CATEGORY_LABELS, SEVERITY_TONE } from '@/lib/labels';

function ValueTile({
  label,
  children,
  tone = 'neutral',
}: {
  label: string;
  children: ReactNode;
  tone?: 'neutral' | 'strong' | 'change';
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl px-4 py-3 ring-1 ring-inset',
        tone === 'change' ? 'bg-brand-50 ring-brand-500/20' : 'bg-zinc-50 ring-zinc-950/[0.06]',
      )}
    >
      <dt
        className={cn(
          'text-xs font-medium',
          tone === 'change' ? 'text-brand-700' : 'text-zinc-500',
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          'mt-1 break-words font-mono text-lg font-medium leading-snug',
          tone === 'neutral' && 'text-zinc-500',
          tone === 'strong' && 'text-zinc-950',
          tone === 'change' && 'text-brand-700',
        )}
      >
        {children}
      </dd>
    </div>
  );
}

function CodeBlock({ code, label, actions }: { code: string; label: string; actions?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-zinc-950">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-zinc-500">{label}</span>
        {actions}
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-[13px] leading-relaxed text-zinc-100">
        {code}
      </pre>
    </div>
  );
}

const toleranceUnit = (issue: ValidationIssue) =>
  issue.current.kind === 'color' ? ' ΔE' : issue.current.kind === 'length' ? 'px' : '';

/**
 * The selected difference: where, which property, current, required and the
 * change. Measured values come only from the deterministic report.
 */
export function IssueDetail({
  issue,
  group,
  onShowVisual,
  slots,
}: {
  issue: ValidationIssue;
  group: IssueGroup | undefined;
  onShowVisual: (() => void) | undefined;
  slots?: ReactNode;
}) {
  const recommendation = issue.recommendation;
  return (
    <article aria-labelledby="issue-title" className="animate-fade-up space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-zinc-500">{issue.element.name}</p>
          <h2
            id="issue-title"
            className="mt-0.5 text-xl font-semibold tracking-tight text-zinc-950"
          >
            {propertyLabel(issue.property)}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={SEVERITY_TONE[issue.severity]} dot>
              <span className="capitalize">{issue.severity}</span>
            </Badge>
            <Badge>{CATEGORY_LABELS[issue.category]}</Badge>
            <Badge>
              <span className="font-mono">{issue.viewportId}</span>
            </Badge>
          </div>
        </div>
        {onShowVisual ? (
          <Button variant="secondary" size="sm" onClick={onShowVisual}>
            <PhotoIcon aria-hidden className="text-zinc-400" />
            Show on screenshots
          </Button>
        ) : null}
      </header>

      <div className="space-y-2">
        <dl className="grid gap-2 sm:grid-cols-3">
          <ValueTile label="Current">{formatValue(issue.current)}</ValueTile>
          <ValueTile label="Required" tone="strong">
            {formatValue(issue.required)}
          </ValueTile>
          {issue.delta ? (
            <ValueTile label="Change" tone="change">
              {formatDelta(issue.delta)}
            </ValueTile>
          ) : null}
        </dl>
        {issue.tolerance > 0 ? (
          <p className="text-xs text-zinc-400">
            Differences within ±{issue.tolerance}
            {toleranceUnit(issue)} are ignored as rendering noise.
          </p>
        ) : null}
      </div>

      {group?.kind === 'likely-root-cause' ? (
        <p className="flex gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/15">
          <LightBulbIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <span>
            {group.rootIssueId === issue.id
              ? `Fix this first: it likely explains ${group.issueIds.length - 1} other difference${group.issueIds.length === 2 ? '' : 's'}.`
              : group.label}
          </span>
        </p>
      ) : null}

      {recommendation ? (
        <section aria-labelledby="fix-title" className="space-y-2.5">
          <h3 id="fix-title" className="text-sm font-semibold text-zinc-950">
            Suggested change{' '}
            <span className="font-normal text-zinc-400">(from measured values)</span>
          </h3>
          {recommendation.text ? (
            <p className="text-sm leading-relaxed text-zinc-600">{recommendation.text}</p>
          ) : null}
          {recommendation.code ? (
            <CodeBlock
              code={recommendation.code}
              label="CSS"
              actions={<CopyButton text={recommendation.code} label="Copy CSS" />}
            />
          ) : null}
        </section>
      ) : null}

      {slots}

      <section aria-labelledby="evidence-title" className="space-y-2">
        <h3 id="evidence-title" className="text-sm font-semibold text-zinc-950">
          Evidence
        </h3>
        <dl className="divide-y divide-zinc-950/[0.05] rounded-xl text-[13px] ring-1 ring-inset ring-zinc-950/[0.07]">
          {issue.element.selector ? (
            <div className="grid gap-1 px-4 py-2.5 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <dt className="text-zinc-500">Selector</dt>
              <dd className="break-all font-mono text-xs text-zinc-800">
                {issue.element.selector}
              </dd>
            </div>
          ) : null}
          {issue.element.designPath ? (
            <div className="grid gap-1 px-4 py-2.5 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <dt className="text-zinc-500">Design layer</dt>
              <dd className="text-zinc-800">{issue.element.designPath}</dd>
            </div>
          ) : null}
          {issue.evidence.matchConfidence !== undefined ? (
            <div className="grid gap-1 px-4 py-2.5 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <dt className="text-zinc-500">Matched by</dt>
              <dd className="text-zinc-800">
                {issue.evidence.matchMethods?.join(', ') || 'hierarchy'}{' '}
                <span className="text-zinc-400">
                  (confidence {issue.evidence.matchConfidence.toFixed(2)})
                </span>
              </dd>
            </div>
          ) : null}
          {issue.evidence.notes?.map((note) => (
            <div key={note} className="px-4 py-2.5 text-zinc-600">
              {note}
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}
