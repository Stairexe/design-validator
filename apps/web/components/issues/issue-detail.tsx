'use client';

import {
  formatDelta,
  formatValue,
  propertyLabel,
  type IssueGroup,
  type ValidationIssue,
} from '@design-validator/design-spec';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { CATEGORY_LABELS, SEVERITY_TONE } from '@/lib/labels';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2 py-1">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-mono">{children}</dd>
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
    <article aria-labelledby="issue-title" className="space-y-5">
      <header>
        <p className="text-sm text-zinc-500">{issue.element.name}</p>
        <h2 id="issue-title" className="text-lg font-semibold">
          {propertyLabel(issue.property)}
        </h2>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Badge tone={SEVERITY_TONE[issue.severity]}>{issue.severity}</Badge>
          <Badge>{CATEGORY_LABELS[issue.category]}</Badge>
          <Badge>{issue.viewportId}</Badge>
        </div>
      </header>

      <dl className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
        <Row label="Current">{formatValue(issue.current)}</Row>
        <Row label="Required">{formatValue(issue.required)}</Row>
        {issue.delta ? <Row label="Change">{formatDelta(issue.delta)}</Row> : null}
        {issue.tolerance > 0 ? (
          <Row label="Tolerance">
            ±{issue.tolerance}
            {toleranceUnit(issue)}
          </Row>
        ) : null}
      </dl>

      {group?.kind === 'likely-root-cause' ? (
        <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          {group.rootIssueId === issue.id
            ? `This change likely explains ${group.issueIds.length - 1} other difference${group.issueIds.length === 2 ? '' : 's'}.`
            : group.label}
        </p>
      ) : null}

      {recommendation ? (
        <section aria-labelledby="fix-title" className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 id="fix-title" className="text-sm font-semibold">
              Suggested change{' '}
              <span className="font-normal text-zinc-500">(from measured values)</span>
            </h3>
            {recommendation.code ? (
              <CopyButton text={recommendation.code} label="Copy CSS" />
            ) : null}
          </div>
          {recommendation.text ? (
            <p className="text-sm text-zinc-700">{recommendation.text}</p>
          ) : null}
          {recommendation.code ? (
            <pre className="overflow-x-auto rounded-md bg-zinc-900 p-3 text-xs text-zinc-100">
              {recommendation.code}
            </pre>
          ) : null}
        </section>
      ) : null}

      {slots}

      <section aria-labelledby="evidence-title" className="space-y-1 text-sm">
        <h3 id="evidence-title" className="font-semibold">
          Evidence
        </h3>
        {issue.element.selector ? (
          <p>
            Selector: <code className="break-all text-xs">{issue.element.selector}</code>
          </p>
        ) : null}
        {issue.element.designPath ? <p>Design layer: {issue.element.designPath}</p> : null}
        {issue.evidence.matchConfidence !== undefined ? (
          <p>
            Matched by {issue.evidence.matchMethods?.join(', ') || 'hierarchy'} (confidence{' '}
            {issue.evidence.matchConfidence.toFixed(2)})
          </p>
        ) : null}
        {issue.evidence.notes?.map((note) => (
          <p key={note}>{note}</p>
        ))}
        {onShowVisual ? (
          <Button variant="secondary" size="sm" onClick={onShowVisual}>
            Show on screenshots
          </Button>
        ) : null}
      </section>
    </article>
  );
}
